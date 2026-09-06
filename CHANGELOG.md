# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [22.12.1] - 2026-09-06

### Changed

- **`FUNCTIONALITIES.md` no longer sends the reader to the specs.** Fifteen rows were marked as having no example — the popup service, the transition helpers, `UnwrapAsyncPipe`, the DOM and RxJS helpers, and five of the colour functions — which left the unit tests as the only executable use of them. Each of those now has a demo on the documentation site, so the table reports coverage instead of a wishlist. No API changed.

### Fixed

- **The tooltip and overlay stylesheets resolve at the path the documentation gives.** The manifest declared no `exports`, so ng-packagr synthesised one for the published package — and a synthesised map lists `.` and `./package.json` and nothing else. A package that declares `exports` closes every subpath outside the map, so `@use 'ng-hub-ui-utils/styles/tooltip';` resolved to nothing even though the sheet shipped in `styles/`. The manifest now names both sheets, extensionless and with the `.scss` suffix, the way every sibling package in the family already does; ng-packagr merges those entries into the map it generates rather than replacing them.

- **The tooltip is announced to assistive technology, and can be got rid of without a mouse.** The bubble was a bare `<span>`: no `id`, no `role`, and the host was never pointed at it, so the label existed only for someone holding a pointer. On an icon-only button — the case the tooltip is written for — a screen reader had nothing to read, and the only workaround was an `aria-label` repeating the same text. The bubble is now `role="tooltip"` with an id the host is `aria-describedby` while it is on screen, and the attribute is put back exactly as it was found, so a description a consumer wrote is neither replaced nor left behind.

    The same change closes WCAG 1.4.13 for it. Escape dismisses the label without moving the pointer or the focus, and the label no longer evaporates the instant the pointer leaves the host: it waits out a short grace period and stays put once the pointer lands on it, which is the only way to read one longer than its box. `styles/tooltip.scss` therefore ships `pointer-events: auto` instead of `none` — a bubble the pointer cannot land on cannot be hoverable — and the controller disables them again the moment it starts fading, so an invisible bubble never catches a click meant for what is under it.

    Reached through `HubTooltipController`, so it arrives at all four entry points at once: `[hubTooltip]`, the deprecated `[tooltip]`, `[hubOverflowTooltip]`, and `hubTooltipAdapter` — the one every sibling library resolves through its own tooltip token.

- **The documentation names what the package exports, and only that.** Both READMEs, the
  coverage table and the documentation page announced an API that was never written: services
  called `HubOverlayService` and `HubPopupService` (they are `OverlayService` and
  `PopupService<T>`), an `attach<T>(component)` on `OverlayRef` that returns a `ComponentRef`
  (it takes a template or a component plus an optional `ViewContainerRef`, and returns the host
  element), and a `PopupService` declared `abstract` when it is a concrete class taking the
  component type in its constructor. A reader who typed any of those found out from the
  compiler.

- **The tooltip guidance teaches `[hubTooltip]` instead of the directive it replaced.** The
  only tooltip section in either README taught `[tooltip]`, deprecated since 22.9.0 —
  `HubTooltipDirective` appeared in neither file — so anyone following the README adopted the
  API whose bare input names collide with `[hubDropdown]` and `<hub-badge>`. The deprecation
  and the attribute-for-attribute migration are now written where the reader is, and the token
  list is complete: `--hub-tooltip-white-space`, `--hub-tooltip-text-align`,
  `--hub-tooltip-font-weight` and `--hub-tooltip-line-height` were forwarded by the controller
  and documented nowhere.

- **Fifteen exported names had no entry in either README.** `HubTooltipDirective`,
  `[hubOverflowTooltip]`, `provideHubTooltip()`, `HUB_TOOLTIP_ADAPTER`, the whole drag-and-drop
  module, `resolveHubAccent()`, `HUB_TRANSLATION_PREFIX`, `HUB_DROPDOWN_POSITIONS`,
  `OverlayRef.onKeydown()` / `onBackdropClick()` / `hasAttached()`,
  `OverlayPosition.withDirection()`, `mergeDeep()`, `generateUniqueId()` and
  `debouncedSignal()` were reachable only by reading `public-api.ts`. The Spanish README was
  further behind: it omitted the mandatory stylesheet import and the whole tooltip-adapter
  section, and ordered its API sections differently from the English one.

- **The coverage table stops claiming demos that do not exist.** Seven rows were marked ✅
  without a single example importing them — `IsObservablePipe`, `isInteger()`, `isPromise()`,
  `toInteger()` / `toString()`, `getValueInRange()` and `regExpEscape()` — and the table had no
  row at all for the tooltip directives, the drag-and-drop module, `resolveHubAccent()`,
  `HUB_TRANSLATION_PREFIX` or the object and signal helpers. A ❌ is information; a ✅ that is
  not true is worse than no table.

- **The documentation page stops advertising features this library has never had.** Five of
  its seven overview highlights described formatting pipes, a `*hubLet` directive, a `hubClass`
  helper, `@Debounce` / `@Throttle` decorators and a deep clone/merge/diff trio; of all of it
  only `mergeDeep()` exists. They now point at the feature guides on the same page, so a
  highlight cannot outlive the section it summarises. Its release list also skipped eight
  releases in a row — 22.11.1 down to 22.8.1, the run that added `[hubTooltip]`,
  `OverlayRef.onKeydown()`, `HUB_DROPDOWN_POSITIONS` and the two tooltip tokens — and is now
  gapless.

## [22.12.0] - 2026-09-03

### Added

- **Colour utilities**, exported from the package root. `parseColor()` resolves hex (3/4/6/8
  digits), `rgb()`, `hsl()`, `oklch()`, `oklab()`, the 148 CSS named colours and `transparent`,
  in both the modern (`rgb(255 0 0 / 50%)`) and legacy (`rgba(255, 0, 0, 0.5)`) syntaxes, plus the
  four CSS angle units and the `none` keyword. It returns `null` rather than throwing on anything
  it cannot resolve — `var()` and `currentColor` included, since neither has a value outside the
  cascade. Alongside it: `toHex()`, `toRgb()` and `isValidColor()`.

    No DOM is involved. The usual way to do this in a browser is to set the string on a detached
  element and read `getComputedStyle` back, which forces layout and returns nothing on the server;
  a table lookup and a regex work in both places.

- **Contrast helpers** — `relativeLuminance()` and `contrastRatio()` (WCAG 2), `contrastAPCA()`
  (APCA-1.0.98G, polarity-aware) and `compositeOver()` for blending translucent text over its
  background before measuring.

- **`readableOn()`** picks black or white for a given surface. It defaults to a threshold on OKLCh
  perceptual lightness — `HUB_INK_LIGHTNESS_THRESHOLD`, exported so it stays in step — which is the
  same decision `--hub-sys-color-*-on` computes in CSS. That default was measured, not assumed:
  maximising the WCAG 2 ratio instead puts **black** text on this design system's own blue, green
  and red accents, because that formula underweights blue at mid lightness. APCA agrees with the
  lightness rule on all nine semantic roles; WCAG disagrees on three. Both alternatives remain
  available through the `metric` argument.

- **OKLCh conversions** — `rgbToOklch()` and `oklchToRgb()` (Ottosson's matrices), plus
  `maxSrgbChroma()`, `isInSrgbGamut()` and `clampToSrgbGamut()`. The gamut helpers exist because
  the sRGB gamut is not a cylinder: at lightness 0.578 blue reaches a chroma of 0.232 while amber
  stops at 0.119, so a palette cannot give every hue the same absolute chroma. `clampToSrgbGamut()`
  reduces chroma until the colour fits, preserving lightness and hue — unlike clipping the RGB
  channels, which shifts both, and shifts them most on the saturated colours it is most often
  reached for.

### Fixed

- **The tooltip inverts with the theme instead of always being black.** `--hub-tooltip-bg` was
  pinned to `--hub-ref-color-black` and `--hub-tooltip-color` to white, so on the dark theme a
  black bubble at 90% opacity sat on a `#121212` page and was all but invisible. They now read
  `--hub-sys-color-ink` and `--hub-sys-surface-page`, which swap per theme: the bubble stays
  dark on a light page and turns light on a dark one. The light theme renders identically to
  before — `ink` is `#212529` there, which is what the black resolved to in practice.

    Anything already overriding `--hub-tooltip-bg` or `--hub-tooltip-color` keeps winning; this
  only changes the default.

## [22.11.1] - 2026-09-01

### Changed

- **The `homepage` in the manifest points at this library's own documentation page** rather than at
  the site root. It is the link a registry shows beside the package and the one a reader clicks from
  it, and landing on a front page they then have to search is a worse answer than landing on the
  reference for the package they were already looking at. Metadata only — no code, no types, no
  styles change, and nothing a consumer imports is affected.

## [22.11.0] - 2026-08-26

### Added

- **The overlay follows its origin.** While attached it listens for `scroll` and `resize` and recomputes its position, coalesced into an animation frame so a burst of scroll events costs one reposition. Before this it computed coordinates once and never again: measured on the docs site, a panel opened and then scrolled sat **122px** from the field it belonged to.

    The listener sits on `window` in the **capture** phase, and that is the whole point. A `scroll` event on an element does not bubble, so a listener on `document` — which is what Angular CDK's `ScrollDispatcher` uses — never hears an application that scrolls an inner container rather than the page. Measured against the CDK's own connected overlay in exactly that shape, its panel drifted too. Capture sees both.

- **`start` and `end` are logical.** They resolved to `left` and `right` whatever the direction, so an overlay opened from a field inside an RTL container hung off the wrong edge. The direction is read from the **origin element**, so an RTL island inside an LTR page is positioned by the direction it is actually laid out in; `OverlayPosition.withDirection()` overrides it for the rare case where the overlay must follow a direction its origin does not have.

- **`OverlayRef.onKeydown()`**, and with it a document-level dispatcher that tells the **topmost** open overlay. An overlay rarely holds focus — opened from a click, focus stays where it was — so a component listening on its own host never hears Escape, and the panel that took over the screen cannot be dismissed with the key everyone reaches for. Only the topmost overlay is told, so a dropdown opened inside a dialog takes Escape for itself and leaves the dialog open. The listener is registered with the first overlay and released with the last.

- **`HUB_DROPDOWN_POSITIONS`**, the four-position fallback chain a dropdown wants — below the origin, flipping above when there is no room. Same order Angular Material's connected overlay defaults to, expressed logically so one list serves both directions instead of two that must be kept in step.

### Fixed

- **Tearing an overlay down twice no longer throws.** `dispose()` and `detach()` called `removeChild` on nodes that something else may already have removed — a test teardown, a router navigation — and a `DOMException` during cleanup took the whole destroy path with it. They use `remove()` now, which is a no-op on a detached node.

- **The overlay README claimed repositioning it did not do.** Its CDK migration guide said "remove scroll strategies (automatic repositioning is built-in)" while no scroll listener existed anywhere in the module. The claim is true as of this release; it was not before.

## [22.10.0] - 2026-08-22

### Added

- **`--hub-tooltip-white-space` and `--hub-tooltip-text-align`**, so how a label breaks and sits can be asked for per tooltip. They were written into the stylesheet as `normal` and `center`, which is right for a short name and wrong for the tooltip that carries a sentence or two — a field's explanation rather than its label.

    Both default to exactly what was hard-coded, so nothing moves for anyone who says nothing. What they buy is that the request can be made from the **host**, which is the only element a consumer can reach: the tooltip is appended to `<body>`, outside every component's styles, and the controller's forwarding list is the only thing that reaches it. Until now the only way to widen or left-align one tooltip was a global rule that changed every tooltip in the product.

    Covered by a case that asserts the forwarding rather than the values — a token missing from that list is a token that silently does nothing, which is the failure worth pinning.

## [22.9.3] - 2026-08-19

### Fixed

- **A tooltip whose stylesheet was never imported no longer moves the page.** The controller appends its element to `<body>` and gives it page coordinates; a static element ignores those, so without `@use 'ng-hub-ui-utils/styles/tooltip'` the tooltip landed in normal flow at the end of the document, below the fold. The page then grew a scrollbar that appeared and vanished as the pointer crossed a label — measured in a real application at 24px of extra document height per hover, on exactly the items whose text was truncated and therefore had a tooltip at all.

    The element now takes `position: absolute` inline at creation. That is the same value the stylesheet ships, so nothing changes for anyone who imports it. `absolute` rather than `fixed` on purpose: positioning is computed as `top + scrollY`, so the coordinates are the page's, and viewport positioning would misplace the tooltip by the scroll offset on any scrolled page.

    Without the sheet the tooltip still looks bare, which is an honest failure and the consumer's to fix. It should not also move the layout underneath it.

## [22.9.2] - 2026-08-17

### Fixed

- **The stylesheets are published at the path the documentation gives.** `@use 'ng-hub-ui-utils/styles/tooltip'` — the import `provideHubTableTooltip` tells you to add — did not resolve. The package copied `src/lib/styles` with the shorthand asset form, which preserves the source path, so the sheets landed at `ng-hub-ui-utils/src/lib/styles/tooltip.scss` and the only import that worked reached through the package's internal folder layout. Every other library in the family already redirected its assets to `styles/`; this one now does the same.

    Worth stating because the workaround was invisible: importing through the internal path works until a patch release moves a folder, and that move would not be a declared break.

    **Correction.** The move landed the sheets in `styles/`, but the package's `exports` map still hid them, so the documented import kept failing. See the `22.12.1` entry above.

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
