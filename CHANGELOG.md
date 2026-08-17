# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [22.9.2] - 2026-08-17

### Fixed

- **The stylesheets are published at the path the documentation gives.** `@use 'ng-hub-ui-utils/styles/tooltip'` — the import `provideHubTableTooltip` tells you to add — did not resolve. The package copied `src/lib/styles` with the shorthand asset form, which preserves the source path, so the sheets landed at `ng-hub-ui-utils/src/lib/styles/tooltip.scss` and the only import that worked reached through the package's internal folder layout. Every other library in the family already redirected its assets to `styles/`; this one now does the same.

    Worth stating because the workaround was invisible: importing through the internal path works until a patch release moves a folder, and that move would not be a declared break.

## [22.9.1] - 2026-08-17

### Fixed

- **The published package declared no licence.** An absent `license` field is not neutral — a registry reports it as unlicensed, which legally reads as all rights reserved, the most restrictive state possible rather than the most open. The intent was always MIT; it is now stated in `package.json` and carried in a `LICENSE` file that ships with the package.

## [22.9.0] - 2026-08-17

### Added

- **`[hubTooltip]`, a tooltip directive that can share an element.** The existing `[tooltip]` claims the bare attribute and the bare input names `placement`, `delay` and `offset`. Angular hands one attribute to _every_ directive on the element that declares an input of that name, so those bare names were never this directive's to hold, and two collisions followed from it:

    - `[hubDropdown]` declares its own `placement`, typed over eight values where a tooltip understands four. A menu trigger that also wanted a tooltip did not merely misbehave, it failed to compile with `TS2322: Type '"bottom-end"' is not assignable to type 'HubTooltipPlacement'` — and no workaround existed, because one attribute cannot carry two placements.
    - `<hub-badge>` declares a `tooltip` input of its own. Writing `[tooltip]` on one fed the component input _and_ matched the directive, so the badge drew two.

    The new directive reads `hubTooltip`, `hubTooltipPlacement`, `hubTooltipDelay` and `hubTooltipOffset`. An attribute named for its owner cannot be claimed by anyone else; `[hubOverflowTooltip]` next door was already named this way.

    ```html
    <button hubDropdown placement="bottom-end" [hubTooltip]="'ACTIONS.MORE' | transloco">…</button>
    ```

### Deprecated

- **`TooltipDirective` / `[tooltip]`.** Kept working, unchanged, for every application already using it — both directives are thin shells over the same `HubTooltipController`, so nothing was rewritten and nothing behaves differently. Migration is attribute-for-attribute: `tooltip` → `hubTooltip`, `placement` → `hubTooltipPlacement`, `delay` → `hubTooltipDelay`, `offset` → `hubTooltipOffset`. Only the elements affected by a collision _need_ to move; the rest can move whenever convenient.

## [22.8.1] - 2026-08-15

### Fixed

- **A content-sized overlay no longer clips its own content into invisibility.** The
  container is created with no intrinsic size, so whenever its content is absolutely
  positioned — which is exactly what a connected-position dropdown is — it computed to
  a 0×0 box, and the stylesheet's `overflow: auto` then clipped the content it existed
  to display: painted at body level, visible to nobody, clickable by nobody. An overlay
  created without an explicit `width`/`height` now opts out of clipping
  (`overflow: visible` inline); an explicitly sized overlay keeps its scrollable box,
  which is the only case where clipping ever made sense. Found by a Chrome audit of
  `ng-hub-ui-nav`'s flyout mode, whose dropdowns were the invisible content.

## [22.8.0] - 2026-08-14

### Added

- **`provideHubTranslationAdapter()`** — the application-wide reactive bridge from an external translation service (transloco, ngx-translate, i18next…) into `HubTranslationService`. Register it once at bootstrap and every `ng-hub-ui` library picks up the host application's dictionary, re-emitting on every language change. Supports optional namespacing and deliberate per-label reactive overrides.
- **`HUB_TRANSLATION_PREFIX`** — injection token that lets a library scope its lookups to a collision-safe namespace (`HUBUI.<LIBRARY>.*`). `TranslatePipe` resolves the prefixed key first and falls back to the bare key, so existing flat dictionaries keep working untouched.

## [22.7.2] - 2026-08-08

### Fixed

- Documentation links now point at the canonical localized URLs. The README linked to `https://hubui.dev/<path>` with no locale prefix and no trailing slash, and both forms are 301-redirected, so every reader arriving from npm or GitHub landed on a redirect instead of the canonical page.

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
