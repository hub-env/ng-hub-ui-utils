import { Directive, ElementRef, effect, inject, input, OnDestroy } from '@angular/core';
import { HubTooltipController } from './tooltip-controller';
import { HubTooltipPlacement } from './tooltip.types';

/**
 * Lightweight tooltip directive.
 *
 * @deprecated Use {@link HubTooltipDirective} (`[hubTooltip]`) instead. The bare
 * attribute and the bare input names `placement`, `delay` and `offset` are not this
 * directive's to hold: Angular feeds one attribute to every directive on the element
 * that declares an input of that name, so `[hubDropdown] placement` fails to compile
 * beside a tooltip, and `[tooltip]` on a `<hub-badge>` — which owns an input of that
 * name — renders two. Kept working, unchanged, until the next major.
 *
 * Apply `[tooltip]` to any element to show a positioned label on hover/focus.
 * The tooltip element is appended to `<body>` so it is never clipped by an
 * overflow container, and every visual aspect is themeable through
 * `--hub-tooltip-*` CSS variables.
 *
 * All DOM work is delegated to {@link HubTooltipController}, so the directive and
 * any imperative consumer (e.g. a badge overflow tooltip) share the exact same
 * behaviour and styling.
 *
 * Styles ship in `styles/tooltip.scss` (mirroring `styles/overlay.scss`). Import
 * it once in your app: `@use 'ng-hub-ui-utils/styles/tooltip';`.
 */
@Directive({
	selector: '[tooltip]'
})
export class TooltipDirective implements OnDestroy {
	/** Tooltip text content. */
	readonly tooltipTitle = input.required<string>({ alias: 'tooltip' });

	/** Placement of the tooltip relative to the host. */
	readonly placement = input<HubTooltipPlacement>('top');

	/** Fade duration in milliseconds, also used as the removal delay on hide. */
	readonly delay = input<number>(150);

	/** Gap in pixels between the host and the tooltip. */
	readonly offset = input<number>(8);

	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly controller = new HubTooltipController(this.host.nativeElement);

	constructor() {
		effect(() => {
			this.controller.setOptions({
				placement: this.placement(),
				delay: this.delay(),
				offset: this.offset()
			});
			this.controller.setText(this.tooltipTitle());
		});
	}

	ngOnDestroy(): void {
		this.controller.destroy();
	}
}
