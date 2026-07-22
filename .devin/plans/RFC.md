# RFC: First-class Symfony/Twig support

## Status

Proposed. This document is structured to match Storybook's GitHub RFC discussion template.

## Summary

Add Symfony/Twig as an official Storybook renderer and Vite framework. Development uses the
project's real Symfony kernel through a locally managed PHP server. The standard `storybook build`
command produces the standard `storybook-static/` directory, containing a browser-hosted PHP 8.4
WebAssembly runtime and a sanitized copy of the application. The result is deployable to any static
file host without a PHP server while retaining controls, Stimulus, and Symfony UX Live Components.

## Problem statement

Symfony applications commonly implement their design systems with Twig, Symfony UX TwigComponent,
Stimulus, and Live Components. Existing integrations usually embed an application route in an iframe
or keep a render API online. Those approaches do not behave like first-class Storybook renderers:

- stories do not render directly in the preview canvas;
- controls, play functions, docs source, and addons are difficult to integrate consistently;
- startup and setup depend on manually coordinating JavaScript and PHP servers;
- a nominally static Storybook still depends on an online PHP service, creating availability,
  authentication, and attack-surface concerns; and
- build artifacts cannot be moved between ordinary static hosts in the same way as React, Vue,
  Svelte, or Web Components Storybooks.

The integration should use Symfony and Storybook conventions instead of reimplementing Twig or
requiring components to maintain a second JavaScript rendering path.

## Non-goals

- Running arbitrary production infrastructure in the browser. Applications must replace external
  databases, private network services, native processes, and unsupported extensions in their
  isolated `storybook` environment.
- Hiding PHP source shipped in a static artifact. Browser-delivered source is inspectable, just like
  browser-delivered JavaScript.
- Replacing Symfony's profiler, functional test client, or end-to-end application testing.
- Adding a Webpack Storybook builder in the initial proposal. Symfony projects may still use Encore
  or AssetMapper for application assets while Storybook itself uses Vite.
- Making automatic PHP component discovery stable in the first release. CSF stories are the primary
  authoring API; discovery remains behind a feature flag until its indexing contract is proven.

## Implementation

The integration consists of three packages with the same renderer/framework split used elsewhere in
the Storybook monorepo.

| Package | Responsibility |
| --- | --- |
| `@storybook/symfony` | Story rendering, canvas lifecycle, assets, Twig source, and browser runtime bridge |
| `@storybook/symfony-vite` | Vite builder integration, local PHP lifecycle, indexing, and static packaging |
| `storybook/symfony-bundle` | Symfony routes, component adapters, indexing metadata, and asset extraction |

### Development flow

`storybook dev` pre-warms the `storybook` Symfony environment, starts or connects to a local PHP
server, waits for the bundle health route, and exposes it to the preview through same-origin Vite
proxies. Story args and globals are posted to the bundle's render route. The renderer inserts the
returned HTML and normalized application assets into the canvas.

The framework supports the PHP built-in server, Symfony CLI, FrankenPHP, RoadRunner, and an explicit
existing-server override. The managed server is stopped with the Vite server.

### Static build flow

The command and output contract are intentionally identical to other Storybook frameworks:

```text
storybook build
└─ storybook-static/
   ├─ index.html
   ├─ iframe.html
   ├─ assets/                       Storybook and PHP-WASM chunks
   ├─ build/, assets/, bundles/     configured Symfony public assets
   └─ symfony-runtime/
      └─ application-<hash>.zip     sanitized Symfony filesystem
```

The framework starts Symfony only while building, for cache preparation and story indexing, and
stops it before the command exits. The emitted directory has no runtime backend dependency.

In the preview iframe, a lazy dedicated Web Worker loads PHP 8.4 WebAssembly, installs the application
archive into its virtual filesystem, and boots the ordinary `public/index.php` front controller.
Renderer requests and same-origin `/_components/*` Live Component requests use an HTTP-shaped message
bridge to that worker. Requests are serialized through one long-lived runtime so the Symfony kernel
and cache are reused. For text-only Live Component forms, the bridge also sends an internal encoded
field envelope that the companion bundle restores before Symfony UX reads the request. This keeps
form handling deterministic on the Asyncify fallback without replacing or exposing the original
body. Every other `fetch` call remains untouched.

The output works at an origin root or a nested path. Application asset URLs are rebased to the actual
Storybook deployment directory; they never assume `/` or a particular hosting provider.

### Static packaging and compatibility

The application archive includes Composer metadata and dependencies, Symfony configuration,
component classes, templates, translations, the front controller, and configured public asset
roots. It always excludes `.env*`, Symfony secrets, repository/editor metadata, tests, coverage,
logs, caches, `node_modules`, and unverified out-of-project symlinks. It writes a synthetic
non-secret `APP_ENV=storybook` environment.

`staticInclude` and `staticExclude` allow applications to opt additional non-secret files in or out.
The build validates production asset manifests and Composer extension requirements before emitting
the archive. Unsupported platform requirements fail with an actionable error.

### Component and asset contracts

The bundle supports Symfony UX TwigComponent names, plain Twig templates, controller fragments, and
Symfony UX Live Components. It normalizes assets from Pentatrion Vite, Webpack Encore, AssetMapper,
or no pipeline into styles, scripts, and an optional import map. The renderer remains independent of
the selected Symfony asset pipeline.

### Storybook integration surfaces

An accepted implementation must follow the normal monorepo paths rather than relying only on direct
package installation:

- renderer and framework package build entries, exports, types, Nx targets, ownership, and release
  metadata;
- core renderer/framework enums and renderer/builder mappings;
- `create-storybook` project detection, generator registration, framework package maps, templates,
  and tests for a Symfony project;
- framework documentation, renderer-aware documentation where Symfony behavior differs, migration
  guidance, and the supported-frameworks catalog;
- a real Symfony kitchen sink and CI for unit, integration, development E2E, and static E2E tests;
  and
- the companion Composer bundle's Packagist/release, Symfony Flex recipe decision, documentation,
  compatibility matrix, and CI.

Renderer-specific docs should add Symfony only where the documented feature is actually supported.
For example, CSF, controls, play functions, and static publishing apply; React-only APIs do not.

## Prior art

- [WordPress Playground](https://wordpress.github.io/wordpress-playground/) demonstrates that a
  large, ordinary PHP application can run reliably in browsers using PHP-WASM and a virtual
  filesystem. Its request handler provides the HTTP-shaped runtime model used by this proposal.
- Storybook's `@storybook/server` renderer demonstrates server-produced markup as a renderer model,
  but its static story output cannot preserve arbitrary control rerenders or Symfony Live Component
  actions.
- Existing Symfony/Twig Storybook integrations commonly use iframe routes or deployed render APIs.
  They validate demand but retain the runtime backend dependency this proposal removes.

An implementation spike has booted an ordinary Symfony 7 kernel from a 6,432-file application
archive in a Web Worker. From a nested path on a plain static file server, it has rendered Twig,
rerendered controls, connected and executed Stimulus, and completed a Live Component action with no
failed browser requests and no PHP server in Chromium, Firefox, and WebKit.

## Deliverables

1. **Renderer and bundle foundation:** CSF rendering, Twig source, component adapters, normalized
   assets, lifecycle behavior, types, and unit tests.
2. **Development framework:** Vite integration, managed PHP lifecycle, indexing, configuration,
   kitchen sinks for supported asset pipelines, and development E2E coverage.
3. **Portable static runtime:** sanitized packaging, compatibility validation, PHP worker bridge,
   nested-path asset handling, controls and Live Component static E2E coverage, and performance
   budgets.
4. **First-class repository integration:** initializer/detection, framework catalogs and applicable
   docs, release metadata, CI matrices, migration guide, and companion bundle release process.
5. **Release readiness:** security review, dependency and generated-artifact license review, browser
   compatibility matrix, documentation review, canary feedback, and removal of preview flags when
   the agreed stability criteria are met.

## Risks

- **Download and startup cost.** The current build emits approximately 39 MB of uncompressed PHP
  WASM variants plus a 9 MB application archive; browsers load one approximately 19 MB WASM variant
  (about 7.5 MB compressed). Mitigations are lazy worker startup, immutable caching, one PHP version,
  archive minimization, and future pre-rendering as an optional first-paint cache.
- **Runtime compatibility.** Native extensions and operating-system integrations are not universally
  portable. Composer requirements are checked at build time and unsupported services must be
  replaced in the `storybook` environment.
- **Source disclosure.** The archive contains PHP source and Composer packages. The build excludes
  known secret-bearing paths and documentation explicitly warns that opted-in content is public.
- **Dependency licensing.** The proven `@php-wasm/*` packages are GPL-2.0-or-later while Storybook is
  MIT. Stable inclusion requires an explicit legal/maintainer decision, a compatible distribution
  boundary, dual licensing, or an equivalent runtime under a compatible license.
- **Content Security Policy.** The upstream runtime contains generic JavaScript `eval` branches for
  dynamically linked modules with `EM_ASM`/`EM_JS` sections and string-based process handlers. The
  supported PHP 8.4 plus `intl` path does not execute them: the complete static E2E suite passes with
  `unsafe-eval` forbidden and records no CSP violations. WebAssembly compilation still requires the
  narrower `wasm-unsafe-eval` source. Security review must decide whether dormant branches may remain
  in distributed code or should be removed from a Storybook-specific runtime build.
- **Browser support.** Worker, WebAssembly, and runtime feature behavior must be tested against
  Storybook's supported browser matrix. The runtime selects JSPI when available and Asyncify
  otherwise. Firefox versions before 153 use Asyncify by default; Firefox 153 enables JSPI. The
  request bridge normalizes text form fields because the current Asyncify PHP SAPI does not populate
  them reliably, and the three-engine static suite covers the fallback. It stages file bytes in the
  worker's scoped virtual filesystem, restores Symfony `UploadedFile` objects for the Live Action,
  and removes temporary files after the request.
- **Maintenance across ecosystems.** Storybook, Symfony, Symfony UX, PHP, Composer, and asset
  pipelines all move independently. Explicit compatibility matrices and real-project CI reduce the
  risk of silent drift.

## Unresolved questions

- [ ] Can Storybook legally distribute or bundle the current GPL-2.0-or-later PHP-WASM dependencies,
  or must the runtime/distribution model change before merge?
- [x] Can a supported deployment omit `unsafe-eval`? The nested-path static browser suite now
  enforces that policy while covering Twig rendering, controls, Stimulus, and Live Components.
- [ ] Must stable distribution remove dormant generic `eval` branches even though the supported
  runtime path does not execute them under the enforced CSP?
- [x] What transport and virtual-filesystem contract should static Live Component file uploads use?
  The bridge transfers browser file bytes to a request-scoped PHP-WASM directory; the bundle
  restores validated descriptors as Symfony `UploadedFile` objects and removes them after the action.
- [ ] Should the first release support Symfony 6.4, 7.x, and 8.x with one PHP 8.4 runtime, or narrow
  the matrix until every combination is represented in CI?
- [x] `storybook init` detects Symfony and configures the JavaScript framework, then reports the
  explicit Composer command. The Node initializer does not mutate Composer dependencies.
- [ ] Does the companion bundle belong in the Storybook GitHub organization, and should it ship a
  Symfony Flex recipe?
- [ ] Which team or community maintainers own long-term PHP/Symfony compatibility and release
  response?

## Alternatives considered / abandoned ideas

### Build-time HTML snapshots

Pre-rendered default states cannot render arbitrary control values or process Live Component
actions. Snapshots may later improve first paint, but they cannot be the runtime architecture.

### Reimplement Twig in JavaScript

A JavaScript Twig implementation does not include Symfony's service container, PHP component
classes, custom Twig extensions, forms, security voters, or Live Components. It creates a second,
incompatible application rather than running the user's application.

### Keep a deployed Symfony render API

This is useful as an explicit custom mode, but it is not a static build. It adds availability,
authentication, CORS, version skew, and security concerns and prevents artifact portability.

### Generate one static story for every control combination

Control state is open-ended and often non-serializable into a finite build matrix. This also cannot
model stateful Live Component requests.

### Service Worker request interception

A narrowly scoped iframe `fetch` bridge handles the two Symfony endpoint families without Service
Worker registration, scope, update, or nested-deployment complexity.

### A less mature Apache-licensed PHP-WASM package

The evaluated alternative has a more compatible license but does not currently provide the same
maintained, typed request/filesystem APIs or production evidence as WordPress Playground. It remains
a candidate if it can meet the same Symfony, browser, performance, and maintenance requirements.
