import { Directive, ElementRef, effect, inject, input, OnDestroy } from '@angular/core';
import { HubTooltipController } from './tooltip-controller';
import { HubTooltipPlacement } from './tooltip.types';

/**
 * Tooltip directive, named the way the rest of the family names itself.
 *
 * Apply `[hubTooltip]` to any element to show a positioned label on hover/focus.
 * The tooltip element is appended to `<body>` so it is never clipped by an overflow
 * container, and every visual aspect is themeable through `--hub-tooltip-*` CSS
 * variables.
 *
 * ## Why this exists beside {@link TooltipDirective}
 *
 * The older directive claims the bare attribute `[tooltip]` and the bare input names
 * `placement`, `delay` and `offset`. Angular feeds one attribute to **every** directive
 * on the element that declares an input of that name, so those bare names are not this
 * directive's to hold:
 *
 * - `[hubDropdown]` declares its own `placement`, typed over eight values where a
 *   tooltip understands four. A menu trigger that also wanted a tooltip did not merely
 *   misbehave — it failed to compile, and there was no way to give each directive its
 *   own placement, because there is only one attribute.
 * - `<hub-badge>` declares a `tooltip` input of its own. Writing `[tooltip]` on one fed
 *   the input *and* attached the directive, so the badge showed two.
 *
 * Prefixing settles both: an attribute named for its owner cannot be claimed by anyone
 * else. `[hubOverflowTooltip]` next door was already named this way.
 *
 * Styles ship in `styles/tooltip.scss`. Import it once in your app:
 * `@use 'ng-hub-ui-utils/styles/tooltip';`.
 *
 * @example
 * ```html
 * <button hubDropdown placement="bottom-end" [hubTooltip]="'ACTIONS.MORE' | transloco">…</button>
 * <span [hubTooltip]="label" hubTooltipPlacement="right" [hubTooltipDelay]="0">…</span>
 * ```
 */
@Directive({
	selector: '[hubTooltip]'
})
export class HubTooltipDirective implements OnDestroy {
	/** Tooltip text content. An empty string leaves the host without a tooltip. */
	readonly text = input.required<string>({ alias: 'hubTooltip' });

	/** Placement of the tooltip relative to the host. */
	readonly placement = input<HubTooltipPlacement>('top', { alias: 'hubTooltipPlacement' });

	/** Fade duration in milliseconds, also used as the removal delay on hide. */
	readonly delay = input<number>(150, { alias: 'hubTooltipDelay' });

	/** Gap in pixels between the host and the tooltip. */
	readonly offset = input<number>(8, { alias: 'hubTooltipOffset' });

	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly controller = new HubTooltipController(this.host.nativeElement);

	constructor() {
		effect(() => {
			this.controller.setOptions({
				placement: this.placement(),
				delay: this.delay(),
				offset: this.offset()
			});
			this.controller.setText(this.text());
		});
	}

	/** @inheritDoc */
	ngOnDestroy(): void {
		this.controller.destroy();
	}
}
