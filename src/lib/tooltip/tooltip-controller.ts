import { HubTooltipOptions, HubTooltipPlacement } from './tooltip.types';

/**
 * Themeable custom properties forwarded from the host to the tooltip element.
 *
 * The tooltip is appended to `<body>`, so it cannot inherit scoped variables set
 * on an ancestor of the host. We resolve them on the host (which *does* inherit
 * from its scope) and copy any defined value onto the tooltip inline style, so
 * both `:root`-level and scoped theming work.
 */
const TOOLTIP_THEME_VARS = [
	'--hub-tooltip-bg',
	'--hub-tooltip-color',
	'--hub-tooltip-opacity',
	'--hub-tooltip-padding-x',
	'--hub-tooltip-padding-y',
	'--hub-tooltip-border-radius',
	'--hub-tooltip-font-size',
	'--hub-tooltip-font-weight',
	'--hub-tooltip-line-height',
	'--hub-tooltip-max-width',
	'--hub-tooltip-zindex',
	'--hub-tooltip-transition-duration',
	'--hub-tooltip-shadow',
	'--hub-tooltip-font-family',
	// How the label breaks and sits. Forwarded like the rest so a tooltip that carries a
	// sentence or two — a field's explanation rather than its name — can be asked for from
	// the host, which is the only element a consumer can reach: the tooltip itself is on
	// `<body>`, outside any component's styles. Without them the only way to widen one
	// tooltip was a global rule that widened every tooltip in the product.
	'--hub-tooltip-white-space',
	'--hub-tooltip-text-align'
];

/**
 * Grace period, in milliseconds, between the pointer leaving the host and the label
 * starting to fade.
 *
 * WCAG 1.4.13 asks hover-revealed content to stay put while the pointer travels onto it,
 * and `offset` opens exactly the gap that trip has to cross. Without the grace period the
 * bubble is already fading before the pointer can reach it, so a label longer than its box
 * could be read only for as long as it takes to cross 8px.
 */
const HOVER_GRACE_MS = 100;

/** Feeds the unique `id` each bubble needs so `aria-describedby` can point at it. */
let nextTooltipId = 0;

/**
 * Framework-agnostic tooltip engine.
 *
 * Binds hover/focus listeners to a host element and renders a body-portaled,
 * `--hub-tooltip-*`-themeable label on demand. It owns no Angular dependency, so
 * it can be reused both by the `[hubTooltip]` directive and by other primitives
 * (e.g. a badge overflow tooltip) that want the exact same visual contract
 * without re-implementing the DOM logic.
 *
 * The bubble is a `role="tooltip"` element the host is `aria-describedby` while it is on
 * screen, so the label exists for a screen reader and not only for a pointer, and it obeys
 * WCAG 1.4.13: Escape dismisses it, and it survives the trip of the pointer onto it.
 *
 * Styles ship in `styles/tooltip.scss`. Import once in your app:
 * `@use 'ng-hub-ui-utils/styles/tooltip';`.
 */
export class HubTooltipController {
	private tooltipEl: HTMLElement | null = null;
	private hideTimeout: ReturnType<typeof setTimeout> | null = null;
	private leaveTimeout: ReturnType<typeof setTimeout> | null = null;

	private text = '';
	private placement: HubTooltipPlacement = 'top';
	private delay = 150;
	private offset = 8;

	private readonly doc: Document;
	private readonly view: (Window & typeof globalThis) | null;

	/** Id of this controller's bubble, minted once so the host can be described by it. */
	private readonly tooltipId = `hub-tooltip-${++nextTooltipId}`;

	private readonly onShow = (): void => this.show();
	private readonly onHide = (): void => this.hide();
	private readonly onPointerLeave = (): void => this.scheduleHide();
	private readonly onTooltipEnter = (): void => this.retain();

	/**
	 * Escape dismisses the label without moving the pointer or the focus, which is the
	 * half of WCAG 1.4.13 a hover-only bubble cannot satisfy on its own. Listened for on
	 * the document, and in the capture phase, so it still reaches us on a page whose own
	 * handlers stop the event before it bubbles.
	 */
	private readonly onKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Escape') {
			this.hide();
		}
	};

	/**
	 * @param host    Element the tooltip is anchored to and whose pointer/focus
	 *                events trigger the tooltip.
	 * @param options Initial placement, delay and offset.
	 */
	constructor(
		private readonly host: HTMLElement,
		options?: HubTooltipOptions
	) {
		this.doc = host.ownerDocument;
		this.view = this.doc.defaultView as (Window & typeof globalThis) | null;
		this.setOptions(options);

		this.host.addEventListener('mouseenter', this.onShow);
		this.host.addEventListener('focus', this.onShow);
		this.host.addEventListener('mouseleave', this.onPointerLeave);
		this.host.addEventListener('blur', this.onHide);
		this.host.addEventListener('click', this.onHide);
	}

	/**
	 * Updates the tooltip label. An empty value disables the tooltip and hides any
	 * currently visible instance.
	 * @param text New tooltip content.
	 */
	setText(text: string): void {
		this.text = text ?? '';
		if (!this.text) {
			this.hide();
			return;
		}
		if (this.tooltipEl) {
			this.tooltipEl.textContent = this.text;
			this.position();
		}
	}

	/**
	 * Updates placement/delay/offset. Only provided keys are overwritten.
	 * @param options Partial tooltip options.
	 */
	setOptions(options?: HubTooltipOptions): void {
		if (!options) {
			return;
		}
		if (options.placement) {
			this.placement = options.placement;
		}
		if (options.delay != null) {
			this.delay = options.delay;
		}
		if (options.offset != null) {
			this.offset = options.offset;
		}
	}

	/** Detaches listeners and removes any live tooltip element. */
	destroy(): void {
		this.host.removeEventListener('mouseenter', this.onShow);
		this.host.removeEventListener('focus', this.onShow);
		this.host.removeEventListener('mouseleave', this.onPointerLeave);
		this.host.removeEventListener('blur', this.onHide);
		this.host.removeEventListener('click', this.onHide);
		this.removeElement();
	}

	/** Creates, positions and reveals the tooltip element. */
	private show(): void {
		if (!this.text) {
			return;
		}
		// A bubble that is still fading out is brought back rather than left to expire:
		// the pointer returning to the host is the user asking for the label again.
		if (this.tooltipEl) {
			this.retain();
			return;
		}
		this.clearHideTimeout();

		const el = this.doc.createElement('span');
		el.textContent = this.text;
		el.classList.add('hub-tooltip', `hub-tooltip--${this.placement}`);
		// The bubble is the host's description, and it has to be findable by id to say so.
		el.id = this.tooltipId;
		el.setAttribute('role', 'tooltip');

		// Taken out of flow here rather than left to the stylesheet alone.
		//
		// The sheet ships `position: absolute` and this is the same value, so nothing changes
		// for anyone who imports it. What it rescues is the app that forgot to: the element is
		// appended to `<body>` and given page coordinates, and a static element ignores them —
		// so it lands in normal flow at the end of the document, past the fold, and the page
		// grows a scrollbar that appears and disappears as the pointer crosses a label. Seen in
		// the wild: a nav whose truncated items each pushed the document 24px taller on hover.
		//
		// `absolute`, not `fixed`, because `position()` writes page coordinates (`top + scrollY`);
		// viewport positioning would misplace the tooltip by the scroll offset on any scrolled
		// page. Without the sheet the tooltip still looks bare — that is an honest failure. It
		// should not also move the layout underneath it.
		el.style.position = 'absolute';
		el.style.transitionDuration = `${this.delay}ms`;
		this.forwardThemeVars(el);
		el.addEventListener('mouseenter', this.onTooltipEnter);
		el.addEventListener('mouseleave', this.onHide);
		this.doc.body.appendChild(el);
		this.tooltipEl = el;

		this.describeHost();
		this.doc.addEventListener('keydown', this.onKeydown, true);

		this.position();
		el.classList.add('hub-tooltip--show');
	}

	/**
	 * Fades the tooltip out after the grace period, so the pointer can cross the gap the
	 * offset opens between host and bubble without the label vanishing on the way.
	 */
	private scheduleHide(): void {
		if (!this.tooltipEl) {
			return;
		}
		this.clearLeaveTimeout();
		this.leaveTimeout = setTimeout(() => this.hide(), HOVER_GRACE_MS);
	}

	/** Cancels a pending hide and brings a fading bubble back to full opacity. */
	private retain(): void {
		this.clearLeaveTimeout();
		this.clearHideTimeout();
		if (this.tooltipEl) {
			this.tooltipEl.style.pointerEvents = '';
			this.tooltipEl.classList.add('hub-tooltip--show');
		}
	}

	/** Fades the tooltip out and removes it after the fade completes. */
	private hide(): void {
		this.clearLeaveTimeout();
		if (!this.tooltipEl) {
			return;
		}
		this.tooltipEl.classList.remove('hub-tooltip--show');
		// Fading, so the pointer is not coming: stop the bubble from catching clicks meant
		// for whatever it floats over while it is invisible but still in the document.
		this.tooltipEl.style.pointerEvents = 'none';
		this.clearHideTimeout();
		this.hideTimeout = setTimeout(() => this.removeElement(), this.delay);
	}

	/** Removes the tooltip element immediately. */
	private removeElement(): void {
		this.clearHideTimeout();
		this.clearLeaveTimeout();
		if (this.tooltipEl) {
			this.doc.removeEventListener('keydown', this.onKeydown, true);
			this.tooltipEl.removeEventListener('mouseenter', this.onTooltipEnter);
			this.tooltipEl.removeEventListener('mouseleave', this.onHide);
			this.undescribeHost();
			this.tooltipEl.remove();
			this.tooltipEl = null;
		}
	}

	/**
	 * Points the host at the live bubble so assistive technology reads the label as the
	 * host's description. Any `aria-describedby` the consumer already wrote is kept: the
	 * tooltip joins that list instead of replacing it, and leaves it as it found it.
	 */
	private describeHost(): void {
		const tokens = this.describedBy();
		if (!tokens.includes(this.tooltipId)) {
			tokens.push(this.tooltipId);
		}
		this.host.setAttribute('aria-describedby', tokens.join(' '));
	}

	/** Removes this tooltip from the host's description, dropping an emptied attribute. */
	private undescribeHost(): void {
		const tokens = this.describedBy().filter((id) => id !== this.tooltipId);
		if (tokens.length) {
			this.host.setAttribute('aria-describedby', tokens.join(' '));
		} else {
			this.host.removeAttribute('aria-describedby');
		}
	}

	/** Current `aria-describedby` of the host, as a token list. */
	private describedBy(): string[] {
		return (this.host.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
	}

	/**
	 * Copies any `--hub-tooltip-*` value defined on the host (or its scope) onto
	 * the body-portaled tooltip, so scoped theming applies despite the portal.
	 */
	private forwardThemeVars(el: HTMLElement): void {
		if (!this.view) {
			return;
		}
		const hostStyles = this.view.getComputedStyle(this.host);
		for (const name of TOOLTIP_THEME_VARS) {
			const value = hostStyles.getPropertyValue(name).trim();
			if (value) {
				el.style.setProperty(name, value);
			}
		}
	}

	private clearHideTimeout(): void {
		if (this.hideTimeout !== null) {
			clearTimeout(this.hideTimeout);
			this.hideTimeout = null;
		}
	}

	private clearLeaveTimeout(): void {
		if (this.leaveTimeout !== null) {
			clearTimeout(this.leaveTimeout);
			this.leaveTimeout = null;
		}
	}

	/** Positions the tooltip around the host according to the current placement. */
	private position(): void {
		if (!this.tooltipEl) {
			return;
		}
		const hostRect = this.host.getBoundingClientRect();
		const tipRect = this.tooltipEl.getBoundingClientRect();
		const scrollY = this.view?.scrollY ?? 0;
		const scrollX = this.view?.scrollX ?? 0;
		const offset = this.offset;

		let top = 0;
		let left = 0;

		switch (this.placement) {
			case 'bottom':
				top = hostRect.bottom + offset;
				left = hostRect.left + (hostRect.width - tipRect.width) / 2;
				break;
			case 'left':
				top = hostRect.top + (hostRect.height - tipRect.height) / 2;
				left = hostRect.left - tipRect.width - offset;
				break;
			case 'right':
				top = hostRect.top + (hostRect.height - tipRect.height) / 2;
				left = hostRect.right + offset;
				break;
			case 'top':
			default:
				top = hostRect.top - tipRect.height - offset;
				left = hostRect.left + (hostRect.width - tipRect.width) / 2;
				break;
		}

		this.tooltipEl.style.top = `${top + scrollY}px`;
		this.tooltipEl.style.left = `${left + scrollX}px`;
	}
}
