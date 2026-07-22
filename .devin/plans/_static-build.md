# Sub-plan: Self-contained static builds

## Goal

The standard `storybook build` command must produce the standard `storybook-static/` web application, deployable to any static file host. Rendering, controls, and Symfony UX Live Component actions must not require a deployed PHP server.

## Acceptance criteria

- The generated directory works when served as static files only.
- The build works at `/` and at a nested base path such as `/design-system/`.
- Changing controls rerenders the component with the real Symfony kernel and Twig runtime.
- Live Component actions use the same in-browser Symfony kernel.
- The browser never sends render or Live Component requests to an external PHP backend.
- A production build cannot silently package `.env.local`, production secrets, cache files, logs, tests, or repository metadata.
- Unsupported PHP extensions and unsafe filesystem entries fail the build with actionable errors.

## Chosen architecture

The static preview runs PHP 8.4 in a dedicated Web Worker using WebAssembly. The worker boots the application's real Symfony kernel from a sanitized application archive and exposes an HTTP-like request bridge to the renderer.

PHP 8.4 is the common runtime for the supported Symfony range: Symfony 6.4 and 7 run on it, while Symfony 8 requires it.

```text
storybook build
    ├─ starts Symfony locally for indexing and validation
    ├─ validates production frontend assets
    ├─ creates a sanitized application archive
    ├─ emits public frontend assets
    └─ bundles the PHP-WASM worker and runtime

static preview iframe
    ├─ starts one PHP worker lazily
    ├─ installs the application archive in its virtual filesystem
    ├─ POST /_storybook/render/{storyId}
    ├─ injects the returned HTML and public assets
    └─ routes /_components/* fetches to the same worker
```

The worker is lazy and shared for the lifetime of the preview iframe. PHP and Symfony boot once; later renders reuse the in-memory filesystem and warmed Symfony cache.

## Why this approach

### Build-time HTML alone is insufficient

Pre-rendering the default story state can improve perceived startup, but it cannot render arbitrary control values or execute Live Component actions. It may be added later as a cache layer, not as the rendering architecture.

### A JavaScript Twig implementation is not Symfony

Twig.js cannot reproduce Symfony's service container, PHP component classes, Twig extensions, security voters, form themes, or Live Components. It would create a second, incompatible renderer.

### A deployed render API is not a static Storybook

An external Symfony endpoint prevents parity with other static Storybook frameworks, introduces availability and authentication concerns, and makes a supposedly static artifact depend on production infrastructure.

### A Service Worker is unnecessary

The renderer and Symfony UX requests can use a scoped `fetch` bridge to the Web Worker. Avoiding a Service Worker makes nested-path hosting and local static previews more predictable.

## Build artifact

The build emits these additional assets:

```text
storybook-static/
├─ iframe.html
├─ assets/                         # Storybook preview and PHP-WASM chunks
├─ build/, assets/, bundles/       # configured Symfony public asset roots
└─ symfony-runtime/
   └─ application.zip             # sanitized Symfony filesystem
```

The application archive contains the code required to boot the `storybook` environment, including Composer dependencies, configuration, component classes, templates, and translations. Public frontend assets remain ordinary static files so the browser can cache and load them directly.

## Packaging policy

The default package set is deliberately conservative.

Included roots:

- `composer.json` and `composer.lock`
- `config/`
- `public/index.php`
- `src/`
- `templates/`
- `translations/`
- `vendor/`

Always excluded:

- `.env*` and `config/secrets/`
- `.git/`, `.github/`, `.devin/`, and editor metadata
- `.storybook/`, `node_modules/`, tests, fixtures, coverage, logs, and existing caches
- user uploads and public files outside configured public asset roots
- symlinks that resolve outside the Symfony project, except verified Composer path packages under `vendor/`

The packager writes a synthetic, non-secret runtime environment for `APP_ENV=storybook` and `APP_DEBUG=0`. Applications that need additional files must opt them in explicitly. Secret-bearing values are not a supported static-runtime dependency.

The generated application archive contains PHP application source. This is equivalent to distributing browser JavaScript: anything shipped to a browser is inspectable. Documentation must make this explicit before the build instructions.

## Asset pipelines

- **Pentatrion Vite:** require a production Vite build before `storybook build`; reject manifests that reference a development server.
- **Webpack Encore:** use the production entrypoint manifest and copy its public build directory.
- **AssetMapper:** run `asset-map:compile` when available and copy the compiled public assets.
- **None:** emit no additional public assets.

Asset URLs are rebased to the Storybook deployment directory so `/build/app.js` also works when Storybook is hosted under `/design-system/`.

## Runtime request bridge

The bridge accepts method, URL, headers, and body and returns status, headers, and bytes. It serializes requests through one worker to avoid concurrent mutation of a single PHP runtime.

The renderer uses it for `/_storybook/render/*`. A narrowly scoped `fetch` wrapper intercepts same-origin `/_components/*` requests for Symfony UX Live Components and delegates every other request to the browser unchanged.

Text-only Live Component forms also carry an internal base64-encoded URL-encoded field envelope.
The companion bundle restores those fields during `kernel.request`, before Symfony UX processes the
action, while preserving the original request body. This makes the official runtime's Asyncify
fallback deterministic in Firefox. Multipart file entries stay on the original transport and need a
separate virtual-filesystem upload contract before stable release.

## Compatibility checks

The worker runtime provides the PHP extensions required by the kitchen-sink Symfony application, including `ctype`, `dom`, `fileinfo`, `mbstring`, `openssl`, `pdo_sqlite`, `phar`, `simplexml`, `tokenizer`, `xml`, and `zip`.

At build time, compare Composer platform requirements with the supported extension list. Fail with the missing extension names rather than producing a preview that crashes in the browser.

Applications that require external databases, private network services, native binaries, `fork`, or unsupported extensions are not portable static applications. Components should replace those dependencies in the isolated `storybook` environment.

## Performance targets

- Load PHP and install the kitchen-sink archive in a worker without blocking the preview UI.
- Complete the first local cold render in under 3 seconds on the Playwright CI environment.
- Complete subsequent kitchen-sink renders in under 100 milliseconds.
- Load only one PHP version and one browser-compatible WASM variant at runtime.
- Cache immutable WASM, JavaScript, application archive, and public assets through normal static-host HTTP caching.

The proof of concept booted Symfony 7, installed 7,142 application files, and rendered a Twig component in approximately 1.1 seconds locally. Subsequent renders completed in approximately 40–50 milliseconds.

## Open release question

The proven WordPress PHP-WASM runtime is published under GPL-2.0-or-later. Before stable release, Storybook maintainers must confirm the dependency and generated-artifact licensing approach or select a runtime with acceptable equivalent behavior. This is a release review item, not a reason to weaken the static-build requirement.

## Checklist

- [x] Prove an unmodified Symfony 7 kernel boots and renders through PHP-WASM.
- [x] Prove subsequent requests reuse the runtime and warmed cache.
- [x] Measure the production PHP-WASM artifact and select a single PHP version.
- [x] Add the sanitized application packager.
- [x] Add public asset validation, copying, and nested-base-path rebasing.
- [x] Add the dedicated PHP Web Worker and request bridge.
- [x] Route Live Component fetches through the worker.
- [x] Make the WASM runtime the default for production builds.
- [x] Add static-build browser tests for controls and Live Components.
- [x] Run the static interaction suite in Chromium, Firefox, and WebKit, including the Asyncify
      fallback used by Firefox versions without JSPI.
- [x] Enforce a static-host CSP without `unsafe-eval` and assert that supported interactions produce
      no policy violations.
- [x] Run the built kitchen-sink under a nested URL using a static file server only.
- [x] Document source visibility, exclusions, extension limits, and deployment.
- [ ] Complete dependency-license review before stable release.
- [x] Add a cross-browser static Live Component file-upload contract and test.
