# Breaking Changes

This file documents breaking changes and migration steps for `ng-hub-ui-utils`.

The major version tracks the Angular major this library targets, so it cannot also signal a
break: a breaking change ships in a **minor** release and is announced here. This file — not the
version number — is the warning.

## [22.15.0] - 2026-09-08

### `reflow()` returns `DOMRect | null`, and stops reflowing the body when handed nothing

- **What changes**: `reflow(element)` reads the box off the element it was given. It used to fall
  back to `document.body` when the argument was falsy, and now returns `null` instead. The return
  type narrows from `any` to `DOMRect | null`.

- **Why**: the fallback reached for a global `document`, which does not exist during a server
  render, so a helper whose only job is to force a layout pass took the whole prerender down with
  a `ReferenceError`. Nothing in the family reads the value back and nothing calls it without an
  element, so the fallback was paying a real cost for a case that never happens.

- **What happens if you do nothing**: nothing at runtime, unless you call `reflow()` with no
  element and rely on the body being measured. A `const box = reflow(el)` that then reads
  `box.width` stops compiling under `strictNullChecks`, which is the compiler pointing at a case
  that was always possible.

- **Migration**: guard the result, or pass the element you meant.

  ```ts
  const box = reflow(element);
  if (box) {
  	// …
  }
  ```

### `getActiveElement()` accepts `null` as its root

- **What changes**: the parameter widens from `Document | ShadowRoot` to
  `Document | ShadowRoot | null`, and its default is the global document only when there is one.

- **Why**: on a server render there is no `document` to default to. A caller that resolved
  `DOCUMENT` optionally now hands over what it got, `null` included, and gets `null` back —
  nothing has focus on a server anyway.

- **What happens if you do nothing**: nothing. The widening is source-compatible in both
  directions; no existing call changes behaviour.

## [22.14.0] - 2026-09-07

### `TooltipDirective` and its bare `[tooltip]` attribute are removed

- **What disappears**: the `TooltipDirective` class and the selector `[tooltip]`, along with the
  bare inputs it declared — `placement`, `delay` and `offset`. It was deprecated in
  [22.9.0](./CHANGELOG.md) in favour of `HubTooltipDirective` (`[hubTooltip]`), which has been
  shipping beside it ever since.

- **Why**: an unprefixed attribute is a name in the application's namespace, not the library's,
  and Angular hands one attribute to **every** directive on the element that declares an input of
  that name. So a consumer could not have a `tooltip` of their own, `[hubDropdown] placement`
  failed to compile beside a tooltip because the two type their placement differently, and
  `[tooltip]` on a `<hub-badge>` — which owns an input of that name — fed the input *and*
  attached the directive, drawing two tooltips.

- **What happens if you do nothing**: `import { TooltipDirective }` stops compiling, and so does
  any `imports: [TooltipDirective]`. A template still writing `tooltip="…"` compiles, because a
  bare attribute nobody claims is just an attribute — and shows no tooltip at all. That silence is
  the reason to read this entry: the compiler catches the import, not the markup.

- **Migration**: swap the class and rename the attributes. Nothing else changes — both directives
  were thin shells over the same `HubTooltipController`, so the tooltip you get is the one you
  already had.

    ```html
    <!-- Before -->
    <button [tooltip]="label" placement="right" [delay]="0" [offset]="4">…</button>

    <!-- After -->
    <button [hubTooltip]="label" hubTooltipPlacement="right" [hubTooltipDelay]="0" [hubTooltipOffset]="4">…</button>
    ```

    ```ts
    // Before
    import { TooltipDirective } from 'ng-hub-ui-utils';

    // After
    import { HubTooltipDirective } from 'ng-hub-ui-utils';
    ```

    `ng-hub-ui-paginable` re-exported the symbol for backward compatibility and no longer does;
    the same swap applies to an import taken from there.

## [22.2.0]

No breaking changes. Adds the `TooltipDirective` (`[tooltip]`) moved in from
`ng-hub-ui-paginable`. If you previously imported `TooltipDirective` from
`ng-hub-ui-paginable`, it still works (re-exported there), but prefer importing it
from `ng-hub-ui-utils`. The injected tooltip base class is `.hub-tooltip` (it was
`.ng-tooltip` while the directive lived in paginable); restyle any custom rules
targeting `.ng-tooltip` or use the new `--hub-tooltip-*` CSS variables.
