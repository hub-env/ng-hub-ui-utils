import { afterNextRender, Directive, effect, ElementRef, inject, input, OnDestroy, signal } from '@angular/core';
import { HUB_TOOLTIP_ADAPTER } from './tooltip.token';
import { HubTooltipHandle, HubTooltipPlacement } from './tooltip.types';

/**
 * Shows a tooltip with the given text **only while the host element is truncated**
 * (its content is wider than its box).
 *
 * Unlike `[hubTooltip]`, which always shows on hover, this directive is meant for
 * ellipsised labels: the tooltip appears solely when the text doesn't fit, so it
 * never duplicates already-visible content. Truncation is tracked live with a
 * `ResizeObserver` (host/container resizes) and a `MutationObserver` (text
 * changes).
 *
 * The tooltip implementation is **agnostic**: it resolves through the injectable
 * {@link HUB_TOOLTIP_ADAPTER} token, which defaults to the built-in hub-ui
 * tooltip. Swap it app-wide (or per subtree) with `provideHubTooltip(...)`.
 *
 * The element that is MEASURED and the element that is HOVERED need not be the same. By
 * default they are — the host does both — but a control whose text is clipped by a box
 * inside it wants them apart: the hover area is the whole control, while the only box that
 * can report truncation is the inner one. Point `hubOverflowTooltipMeasure` at that box and
 * the tooltip covers the control while answering to the text.
 *
 * Requires the tooltip styles once in your app:
 * `@use 'ng-hub-ui-utils/styles/tooltip';`.
 *
 * @example Host measures itself
 * ```html
 * <span class="label" [hubOverflowTooltip]="item.label">{{ item.label }}</span>
 * ```
 *
 * @example Hover the whole chip, measure the title inside it
 * ```html
 * <div class="chip" [hubOverflowTooltip]="item.label" hubOverflowTooltipMeasure=".chip__title">
 *   <span class="chip__icon"></span>
 *   <span class="chip__title">{{ item.label }}</span>
 * </div>
 * ```
 */
@Directive({
	selector: '[hubOverflowTooltip]'
})
export class HubOverflowTooltipDirective implements OnDestroy {
	/** Tooltip text; shown only while the host overflows. */
	readonly text = input<string>('', { alias: 'hubOverflowTooltip' });

	/** Placement of the tooltip relative to the host. */
	readonly placement = input<HubTooltipPlacement>('top');

	/**
	 * CSS selector, resolved inside the host, naming the element whose truncation decides
	 * whether the tooltip speaks. The tooltip still belongs to the host, so the hover area is
	 * unchanged; only the measurement moves.
	 *
	 * Left unset — or pointing at nothing — the host measures itself, which is what this
	 * directive has always done.
	 */
	readonly measureTarget = input<string | undefined>(undefined, { alias: 'hubOverflowTooltipMeasure' });

	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly adapter = inject(HUB_TOOLTIP_ADAPTER);

	private handle: HubTooltipHandle | null = null;
	private resizeObserver: ResizeObserver | null = null;
	private mutationObserver: MutationObserver | null = null;

	private readonly overflowing = signal(false);
	private readonly ready = signal(false);

	constructor() {
		afterNextRender(() => this.init());

		// A selector changed after the fact points at a different box, so the observers and
		// the truncation state both have to be taken again.
		effect(() => {
			this.measureTarget();
			if (this.ready()) {
				this.observe();
			}
		});

		effect(() => {
			if (!this.ready() || !this.handle) {
				return;
			}
			this.handle.update(this.overflowing() ? this.text() : '');
		});
	}

	ngOnDestroy(): void {
		this.resizeObserver?.disconnect();
		this.mutationObserver?.disconnect();
		this.handle?.destroy();
		this.handle = null;
	}

	/** Wires the tooltip handle and the browser-only truncation observers. */
	private init(): void {
		const el = this.host.nativeElement;
		// The tooltip belongs to the HOST whatever is measured: it is the control the pointer
		// is over, and the box that reports truncation may be a fraction of it.
		this.handle = this.adapter.attach(el, '', { placement: this.placement() });

		if (typeof ResizeObserver !== 'undefined') {
			// Re-resolving on every callback rather than closing over the element: content
			// rendered after this point can bring the measured box with it.
			this.resizeObserver = new ResizeObserver(() => this.measure());
		}

		if (typeof MutationObserver !== 'undefined') {
			// A mutation can replace the measured box, so the observers are re-pointed rather
			// than merely re-read.
			this.mutationObserver = new MutationObserver(() => this.observe());
			this.mutationObserver.observe(el, { childList: true, characterData: true, subtree: true });
		}

		this.observe();
		this.ready.set(true);
	}

	/**
	 * Points the resize observer at the boxes that can change the answer — the host, whose
	 * width bounds everything, and the measured box when it is a different element — and
	 * takes the measurement again.
	 */
	private observe(): void {
		const host = this.host.nativeElement;
		const target = this.resolveTarget();

		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver.observe(host);
			if (target !== host) {
				this.resizeObserver.observe(target);
			}
		}

		this.measure();
	}

	/**
	 * The element whose overflow is the question. Falls back to the host, so a selector that
	 * matches nothing behaves exactly as no selector at all rather than silently going quiet.
	 */
	private resolveTarget(): HTMLElement {
		const host = this.host.nativeElement;
		const selector = this.measureTarget();
		return (selector ? host.querySelector<HTMLElement>(selector) : null) ?? host;
	}

	/** Updates the truncation state from the measured box's layout. */
	private measure(): void {
		const el = this.resolveTarget();
		this.overflowing.set(el.scrollWidth > el.clientWidth + 1);
	}
}
