# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [22.7.1] - 2026-07-27

### Fixed

- **`--hub-overlay-zindex` / `--hub-overlay-backdrop-zindex` actually work now.** `OverlayRef` wrote literal inline `z-index: 1000` / `999` on the container and backdrop — the very elements `styles/overlay.scss` themes through those tokens — so an inline declaration always beat the stylesheet and re-stacking the overlay (e.g. a dropdown above a modal) required `!important`. The inline styles now resolve the tokens themselves (`var(--hub-overlay-zindex, 1000)`), keeping the same defaults for apps that never import the overlay stylesheet.

### Added

- **`OverlayConfig.zIndex`** — optional explicit layer for a single overlay instance; when set it takes precedence over the token.

## [22.7.0] - 2026-07-07

### Added

- **`resolveHubAccent(value)`** — the canonical "any colour" accent resolver shared across the ng-hub-ui family. Maps a component `color` / `variant` input to a paintable value for a `--hub-*-accent` slot: a bareword (semantic accent name / registered accent / CSS named colour) → `var(--hub-sys-color-<name>, <name>)`; a literal `#hex` / `rgb()` / `oklch()` / `var()` → unchanged; empty / nullish → `null`. Libraries that depend on `ng-hub-ui-utils` import it instead of re-implementing the resolver.

## [22.6.1] - 2026-07-02

### Fixed

- CSS variable fallbacks realigned to the ds light defaults (`--hub-ref-font-family-base`: `inherit` → `system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`); fallbacks only apply when ng-hub-ui-ds is not loaded.

### Docs

- Added `docs/css-variables-reference.md` — the complete CSS custom-property reference for the tooltip and overlay styles (19 tokens, now covered by the repo `tokens-parity` check F).

## [22.6.0] - 2026-06-30

### Added

- **`HubOverflowTooltipDirective`** (`[hubOverflowTooltip]`) — shows a tooltip with the given text **only while the host element is truncated** (content wider than its box). Live truncation tracking via `ResizeObserver` + `MutationObserver`. Ideal for ellipsised labels (nav items, stepper/calendar labels, table headers…) so the tooltip never duplicates already-visible text.
- **Agnostic tooltip token** — `HUB_TOOLTIP_ADAPTER` (defaults, via a root factory, to the built-in `hubTooltipAdapter`) and the `provideHubTooltip(adapter)` helper. `[hubOverflowTooltip]` resolves its tooltip through this token, so the tooltip can be swapped for any implementation app-wide or per subtree — keeping the tooltip agnostic even for libraries that already depend on utils. Works out of the box with no wiring.

## [22.5.0] - 2026-06-29

### Added

- **`HubTooltipController`** — framework-agnostic tooltip engine that binds hover/focus listeners to a host element and renders the body-portaled, `--hub-tooltip-*`-themeable label. It owns no Angular dependency so it can be reused outside the directive.
- **`hubTooltipAdapter`** + **`HubTooltipAdapter` / `HubTooltipHandle` / `HubTooltipOptions`** — a minimal, structurally-typed tooltip contract and a ready-made implementation. Lets other ng-hub-ui primitives (e.g. `ng-hub-ui-badges`) opt into the hub-ui tooltip without taking a hard dependency on this package, e.g. `provideHubBadgeTooltip(hubTooltipAdapter)`.

### Changed

- `TooltipDirective` now delegates all DOM work to `HubTooltipController` (same selector, inputs, behaviour and styling); no public API change.

## [22.4.0] - 2026-06-26

### Changed

- **Tooltip styles extracted to a stylesheet (BREAKING).** The `[tooltip]` directive no longer injects a `<style>` block at runtime; its rules and `--hub-tooltip-*` token defaults now ship in `styles/tooltip.scss` (mirroring `styles/overlay.scss`), each token backed by a canonical `--hub-sys-*` / `--hub-ref-*` value. Import it once in your app: `@use 'ng-hub-ui-utils/styles/tooltip';`.
- **Canonical token names (BREAKING):** `--hub-tooltip-z-index` → `--hub-tooltip-zindex`, `--hub-overlay-z-index` → `--hub-overlay-zindex`, `--hub-overlay-backdrop-z-index` → `--hub-overlay-backdrop-zindex` (no hyphen, matching the `--hub-sys-zindex-*` convention). `--hub-tooltip-zindex` now defaults to `var(--hub-sys-zindex-tooltip, 1080)` and `--hub-tooltip-font-family` to the canonical `--hub-ref-font-family-base`.

### Removed

- Runtime `<style>` injection from the tooltip directive (`TOOLTIP_STYLES` / `ensureStyles`), replaced by the importable `styles/tooltip.scss`.

## [22.3.2] - 2026-06-26

### Fixed

- Corrected the Angular peer dependency range to `>=18.0.0`. The library uses APIs introduced in Angular 17 (signal `input()`/`output()`, the `@if` control flow and/or signal queries), whose real minimum is Angular 17.3, so the previous `>=16.0.0` range was too low and let it install on incompatible versions.

## [22.3.1] - 2026-06-25

### Added

- `--hub-overlay-*` component tokens for the overlay surface (`-bg`, `-border-radius`, `-shadow`, `-z-index`, `-backdrop-z-index`), each resolving through the system surface / shadow / z-index tokens so the overlay is themeable.

### Fixed

- Design-token consistency pass: aligned inline fallback defaults with the canonical `ng-hub-ui-ds` values and routed hardcoded literals (z-index, font-weight, line-height, radii and theme-aware colours) through their `--hub-sys-*` / `--hub-ref-*` tokens, so they follow the active theme. No visual change when the ds tokens are loaded.

## [22.3.0] - 2026-06-24

### Added

- **Native drag-and-drop core** (`drag-drop/`), the engine-agnostic, reusable pieces of a native HTML5 drag-and-drop implementation, shared across ng-hub-ui libraries:
    - Pure array helpers `moveItemInArray`, `transferArrayItem`, `copyArrayItem`, plus `computeTargetIndex`, `toAbsoluteIndex`, `containsNode` and `clamp`.
    - `resolveDropPosition` drop-side geometry (`vertical` / `horizontal` / `grid` axes, RTL-aware).
    - `createNativeDragImage` to render a template off-screen as a native drag image.
    - `createPointerDragSession` — the Pointer Events touch/pen fallback (floating ghost + edge autoscroll).
    - `HubDragDropService` — a singleton coordinator for the active drag, drop target, owner registry, `canDrop` (group-based cross-instance transfers) and DOM hit-testing.
    - Shared types `DragContainerRef`, `ActiveDrag`, `DragTarget`, `DragRegistration`, `DropPosition`, `DragPointerMode`, `DragAxis`, `DropRect`.

## [22.2.0] - 2026-06-24

### Added

- `TooltipDirective` (`[tooltip]`) — lightweight, dependency-free tooltip moved here from `ng-hub-ui-paginable` so any library can reuse it. Now SSR-safe (injected `DOCUMENT`), with a default `top` placement and `focus`/`blur` support.
- Tooltip theming through `--hub-tooltip-*` CSS variables (`-bg`, `-color`, `-opacity`, `-padding-x`, `-padding-y`, `-border-radius`, `-font-size`, `-max-width`, `-z-index`, `-transition-duration`, `-shadow`, `-font-family`). The injected base class is now `.hub-tooltip` (was `.ng-tooltip`).

## [22.1.0] - 2026-06-23

### Added

- `isObject(item)` — checks whether a value is a plain object (not an array or primitive).
- `mergeDeep(target, source)` — recursive deep-merge producing a new object; arrays are replaced, not merged.
- `generateUniqueId(length)` — random alphanumeric string for transient DOM ids and keys.
- `debouncedSignal(sourceSignal, delay)` — Angular Signal wrapper that delays propagation by a configurable millisecond window; uses `effect` cleanup to avoid timer leaks.

## [22.0.0] - 2026-06-17

### Changed

- Aligned with Angular 22.
- README documentation standardized.

## [1.2.1] - 2026-03-19

### Changed

- Renamed internal i18n files: `hub-translation.service.ts` → `translation.service.ts`, `hub-translation.provider.ts` → `translation.provider.ts`
- Updated `TranslatePipe` imports to use renamed i18n files
- Code formatting improvements in `translate.pipe.ts`

### Fixed

- Added comprehensive test suite for `HubTranslationService`

## [1.2.0] - 2026-01-02

### Added

- New `equals()` utility function for deep object comparison
- New `interpolateString()` function for template string interpolation
- New `getValue()` function for nested property access with dot notation
- Internationalization (i18n) system with `HubTranslationService`
- `TranslatePipe` for template-based translations
- Translation tokens for dependency injection configuration

## [1.1.0] - Previous release

Initial tracked version.
