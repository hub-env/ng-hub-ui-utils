# ng-hub-ui-utils — CSS Variables Reference

Complete reference of the CSS custom properties exposed by the styles shipped with
`ng-hub-ui-utils` — the tooltip (`@use 'ng-hub-ui-utils/styles/tooltip';`) and the
overlay (`@use 'ng-hub-ui-utils/styles/overlay';`).

---

## Table of Contents

- [How it Works](#how-it-works)
- [Tooltip](#tooltip)
- [Overlay](#overlay)
- [Theming Examples](#theming-examples)

---

## How it Works

Each token is declared on its element (`.hub-tooltip`, `.hub-overlay-container`) with a
fallback chain:

```text
component token -> sys token -> ref token -> literal fallback
```

Both the tooltip and the overlay are **portaled to `<body>`**, so they do not inherit a
scoped component's custom properties. Theme them globally on `:root`, or per-instance on
the portaled element itself (the tooltip engine applies the caller's scope class when one
is provided).

---

## Tooltip

`@use 'ng-hub-ui-utils/styles/tooltip';`

| Variable | Default |
| --- | --- |
| `--hub-tooltip-bg` | `var(--hub-sys-color-ink, #212529)` |
| `--hub-tooltip-color` | `var(--hub-sys-surface-page, #fff)` |
| `--hub-tooltip-opacity` | `0.9` |
| `--hub-tooltip-padding-x` | `var(--hub-ref-space-2, 0.5rem)` |
| `--hub-tooltip-padding-y` | `var(--hub-ref-space-1, 0.25rem)` |
| `--hub-tooltip-border-radius` | `var(--hub-sys-radius-md, 0.375rem)` |
| `--hub-tooltip-font-size` | `var(--hub-ref-font-size-sm, 0.875rem)` |
| `--hub-tooltip-font-weight` | `var(--hub-ref-font-weight-base, 400)` |
| `--hub-tooltip-line-height` | `var(--hub-ref-line-height-base, 1.5)` |
| `--hub-tooltip-max-width` | `200px` |
| `--hub-tooltip-zindex` | `var(--hub-sys-zindex-tooltip, 1080)` |
| `--hub-tooltip-transition-duration` | `0.15s` |
| `--hub-tooltip-shadow` | `none` |
| `--hub-tooltip-font-family` | `var(--hub-ref-font-family-base, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif)` |

## Overlay

`@use 'ng-hub-ui-utils/styles/overlay';`

| Variable | Default |
| --- | --- |
| `--hub-overlay-bg` | `var(--hub-sys-surface-elevated, #f8f9fa)` |
| `--hub-overlay-border-radius` | `var(--hub-sys-radius-sm, 0.25rem)` |
| `--hub-overlay-shadow` | `var(--hub-sys-shadow, 0 0.5rem 1rem rgba(0, 0, 0, 0.15))` |
| `--hub-overlay-zindex` | `var(--hub-sys-zindex-dropdown, 1000)` |
| `--hub-overlay-backdrop-zindex` | `calc(var(--hub-sys-zindex-dropdown, 1000) - 1)` |

---

## Theming Examples

```css
/* Global tweaks — both surfaces are portaled to <body>, so :root reaches them. */
:root {
  --hub-tooltip-bg: var(--hub-sys-color-primary);
  --hub-tooltip-border-radius: 999px;
  --hub-overlay-shadow: 0 0.75rem 2rem rgba(0, 0, 0, 0.2);
}
```
