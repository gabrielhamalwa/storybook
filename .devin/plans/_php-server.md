# Sub-plan: PHP Server Strategy

## Goal

Provide a fast, zero-config PHP backend for the Storybook dev server while supporting faster opt-in servers for large repos.

## Working rules

Every implementation decision and code change in this sub-plan must be grounded in the actual documentation and source available in the Storybook monorepo, the Symfony documentation, and Symfony UX documentation. Do not rely on memory or assumptions.

- **Storybook side:** Before writing or editing any Storybook-related code, read the relevant local docs in `docs/` and the existing framework/renderer packages in `code/`. Cross-check `AGENTS.md` for monorepo conventions, build commands, and testing rules.
- **Symfony side:** Before writing or editing any PHP bundle code, fetch the current Symfony documentation and Symfony UX documentation. Symfony APIs, bundle conventions, and Twig component behavior change over time; verify them every time.
- **No guessing:** If a contract, API, or behavior is not verified by the docs or source, treat it as unknown and look it up before building on it.
- **Checklists drive work:** Use the checklist in this sub-plan to track progress. Do not mark an item complete until it is actually implemented and verified.

## Default: `php -S`

The framework starts a PHP built-in server as a child process managed by the Vite plugin.

```bash
php -S 127.0.0.1:<port> -t public/ public/index.php
```

### Pros

- Zero dependencies beyond PHP.
- Works on every Symfony project.
- Easy to start and stop from Node.

### Cons

- Single-threaded.
- Symfony kernel boots per request.
- First request can be slow on large repos.

### Mitigations

- Use a dedicated `storybook` Symfony environment to minimize kernel size.
- Pre-warm the container cache after install.
- Keep the PHP server alive for the whole Storybook session.
- Use OPcache if available.

## Opt-in fast servers

### FrankenPHP

```bash
frankenphp php-server --worker public/index.php
```

In worker mode, the Symfony kernel boots once and stays in memory across requests. This is the fastest practical option.

### RoadRunner

```bash
./rr serve .rr.storybook.yaml
```

RoadRunner keeps PHP workers alive. Symfony has a `Runtime` for RoadRunner.

### Symfony CLI

```bash
symfony server:start --port=<port>
```

Useful if the user already uses Symfony CLI. It is usually a wrapper around `php -S` or Caddy, so it does not solve the kernel-per-request problem unless configured with FrankenPHP.

### Existing server

Users can point Storybook at an already-running server:

```ts
framework: {
  options: {
    symfony: { server: 'existing', serverUrl: 'http://localhost:8000' },
  },
}
```

## Server lifecycle

The Vite plugin manages the server:

1. `configureServer` — start the PHP server.
2. `waitForPhpServer` — poll `GET /_storybook/health` until ready.
3. Inject the server URL into the renderer config.
4. `close` — stop the PHP server.

## Health endpoint

The Composer bundle exposes:

```php
#[Route('/_storybook/health', methods: ['GET'])]
public function health(): JsonResponse;
```

Response:

```json
{ "status": "ok", "environment": "storybook" }
```

## Configuration

```ts
export type SymfonyServerOptions = {
  server?: 'php' | 'frankenphp' | 'roadrunner' | 'symfony-cli' | 'existing';
  serverUrl?: string;
  port?: number;
  phpBinary?: string;
  environment?: string;
  projectDir?: string;
  publicDir?: string;
  console?: string;
};
```

## Auto-detection

If `server` is not set, the framework auto-detects:

1. If `frankenphp` is in `PATH` → use FrankenPHP.
2. If `rr` is in `PATH` → use RoadRunner.
3. If `symfony` is in `PATH` → use Symfony CLI.
4. Otherwise → use `php -S`.

## Checklist

### Workflow

- [ ] Add or update a Vitest test for every server backend implemented.
- [ ] Update framework README with server options and tradeoffs after adding a backend.
- [ ] Run `yarn nx compile symfony-vite` and `yarn nx run-many -t check` after server changes.

### Implementation

- [ ] Create `src/server/php.ts` with `startPhpServer(options)` and `stopPhpServer()`.
- [ ] Build `php -S` command with correct host, port, document root, and router script.
- [ ] Implement free port detection using Node `net.createServer`.
- [ ] Spawn PHP process with `child_process.spawn` and capture stdout/stderr for debugging.
- [ ] Implement `stopPhpServer` that kills the child process and waits for exit.
- [ ] Create `src/server/frankenphp.ts` with `startFrankenPhpServer()` and `stopFrankenPhpServer()`.
- [ ] Build FrankenPHP worker-mode command for the `storybook` environment.
- [ ] Create `src/server/roadrunner.ts` with `startRoadRunnerServer()` and `stopRoadRunnerServer()`.
- [ ] Generate `.rr.storybook.yaml` config for RoadRunner on the fly.
- [ ] Create `src/server/symfony-cli.ts` with `startSymfonyCliServer()` and `stopSymfonyCliServer()`.
- [ ] Create `src/server/existing.ts` that validates `serverUrl` and skips start/stop.
- [ ] Create `src/server/detect.ts` that checks `PATH` for `frankenphp`, `rr`, `symfony`, and falls back to `php`.
- [ ] Create `src/server/health.ts` that polls `GET /_storybook/health` with timeout and retries.
- [ ] Implement server URL injection via Vite `define` (`import.meta.env.STORYBOOK_SYMFONY_URL`).
- [ ] Implement fallback to runtime environment variable if `define` is not available.
- [ ] Add Vitest test: `php -S` server starts and responds to health.
- [ ] Add Vitest test: `php -S` server stops cleanly.
- [ ] Add Vitest test: auto-detection picks FrankenPHP when binary is present.
- [ ] Add Vitest test: health-check throws on timeout.
- [ ] Document server options and tradeoffs in framework README.
