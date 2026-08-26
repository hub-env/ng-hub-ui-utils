import {
	ApplicationRef,
	ComponentRef,
	createComponent,
	EmbeddedViewRef,
	TemplateRef,
	Type,
	ViewContainerRef
} from '@angular/core';
import type { OverlayConfig } from './overlay-config';
import { registerOverlayKeydown } from './overlay-keyboard-dispatcher';

/**
 * Manages a single overlay instance created by {@link OverlayService}.
 * Creates a container and optional backdrop in `document.body` and attaches
 * either a template or component as the overlay content.
 */
export class OverlayRef {
	private _backdropElement: HTMLElement | null = null;
	private _containerElement: HTMLElement | null = null;
	private _contentElement: HTMLElement | null = null;
	private _viewRef: EmbeddedViewRef<unknown> | null = null;
	private _componentRef: ComponentRef<unknown> | null = null;
	private _isAttached = false;
	private _repositionHandler?: () => void;
	private _repositionFrame = 0;
	private _keydownCallback?: (event: KeyboardEvent) => void;
	private _unregisterKeydown?: () => void;
	private _backdropClickCallback?: () => void;
	private _backdropClickHandler?: () => void;

	constructor(
		private _config: OverlayConfig,
		private _appRef: ApplicationRef
	) {}

	/**
	 * Attaches content to the overlay.
	 *
	 * If the overlay is already attached, it only updates the position strategy
	 * and returns the existing content element.
	 *
	 * @param content Template or component type to attach.
	 * @param viewContainerRef View container used to create embedded views for templates.
	 * @returns The attached content element (first root node).
	 * @throws When a {@link TemplateRef} is provided without a {@link ViewContainerRef}.
	 */
	attach(content: TemplateRef<unknown> | Type<unknown>, viewContainerRef?: ViewContainerRef): HTMLElement {
		// If already attached, just update position and return existing element
		if (this._isAttached && this._contentElement) {
			if (this._config.positionStrategy) {
				this._config.positionStrategy.apply(this._containerElement!);
			}
			return this._contentElement;
		}

		this._createContainer();
		this._createBackdrop();

		let contentElement: HTMLElement;

		if (content instanceof TemplateRef) {
			if (!viewContainerRef) {
				throw new Error('ViewContainerRef is required when attaching a TemplateRef');
			}
			// Only create and attach view if not already created
			if (!this._viewRef) {
				this._viewRef = viewContainerRef.createEmbeddedView(content);
				this._viewRef.detectChanges();
			}
			contentElement = this._viewRef.rootNodes[0] as HTMLElement;
		} else {
			if (this._componentRef) {
				this._appRef.detachView(this._componentRef.hostView);
				this._componentRef.destroy();
			}
			this._componentRef = createComponent(content, {
				environmentInjector: this._appRef.injector
			});
			this._appRef.attachView(this._componentRef.hostView);
			contentElement = (this._componentRef.hostView as EmbeddedViewRef<unknown>).rootNodes[0] as HTMLElement;
		}

		this._contentElement = contentElement;

		// Only append if not already in container
		if (!this._containerElement!.contains(contentElement)) {
			this._containerElement!.appendChild(contentElement);
		}

		this._isAttached = true;

		// Apply position strategy
		if (this._config.positionStrategy) {
			this._config.positionStrategy.apply(this._containerElement!);
			this._listenForReposition();
		}

		this._listenForKeys();

		return contentElement;
	}

	/**
	 * Detaches the content from the overlay container without disposing the overlay.
	 */
	detach(): void {
		if (!this._isAttached) {
			return;
		}

		this._stopListeningForReposition();
		this._unregisterKeydown?.();
		this._unregisterKeydown = undefined;

		if (this._contentElement && this._containerElement) {
			this._contentElement?.remove();
		}

		this._isAttached = false;
	}

	/**
	 * Registers a handler for keys pressed while this overlay is the topmost open one.
	 *
	 * Needed because an overlay rarely holds focus: opened from a click it leaves focus where it
	 * was, so a component listening on its own host never hears Escape. Set it before `attach()`,
	 * or right after — the listener is registered on attach and released on detach.
	 *
	 * @param callback Invoked with each keydown; decide there what to act on.
	 */
	onKeydown(callback: (event: KeyboardEvent) => void): void {
		this._keydownCallback = callback;

		if (this._isAttached && !this._unregisterKeydown) {
			this._listenForKeys();
		}
	}

	/** Puts this overlay on top of the keyboard stack for as long as it is attached. */
	private _listenForKeys(): void {
		if (!this._keydownCallback || this._unregisterKeydown) {
			return;
		}

		const callback = this._keydownCallback;
		this._unregisterKeydown = registerOverlayKeydown((event) => callback(event));
	}

	/**
	 * Keeps the overlay glued to its origin while the page moves under it.
	 *
	 * Registered on `window` in the CAPTURE phase, which is the whole point: a `scroll` event on an
	 * element does not bubble, so a listener on `document` never hears an application that scrolls
	 * an inner container rather than the page. Capture sees both.
	 *
	 * Coalesced into an animation frame, because a scroll fires far more often than a paint.
	 */
	private _listenForReposition(): void {
		if (this._repositionHandler || typeof window === 'undefined') {
			return;
		}

		this._repositionHandler = () => {
			if (this._repositionFrame) {
				return;
			}

			this._repositionFrame = requestAnimationFrame(() => {
				this._repositionFrame = 0;
				this.updatePosition();
			});
		};

		window.addEventListener('scroll', this._repositionHandler, { capture: true, passive: true });
		window.addEventListener('resize', this._repositionHandler, { passive: true });
	}

	/** Removes the listeners registered by {@link _listenForReposition}. */
	private _stopListeningForReposition(): void {
		if (!this._repositionHandler || typeof window === 'undefined') {
			return;
		}

		window.removeEventListener('scroll', this._repositionHandler, { capture: true });
		window.removeEventListener('resize', this._repositionHandler);
		this._repositionHandler = undefined;

		if (this._repositionFrame) {
			cancelAnimationFrame(this._repositionFrame);
			this._repositionFrame = 0;
		}
	}

	/**
	 * Disposes the overlay and cleans up all allocated resources.
	 */
	dispose(): void {
		this.detach();

		// Destroy view ref if exists
		if (this._viewRef) {
			this._viewRef.destroy();
			this._viewRef = null;
		}

		if (this._componentRef) {
			this._appRef.detachView(this._componentRef.hostView);
			this._componentRef.destroy();
			this._componentRef = null;
		}

		if (this._containerElement) {
			this._containerElement?.remove();
			this._containerElement = null;
		}

		if (this._backdropElement) {
			// Remove event listener before removing element from DOM
			if (this._backdropClickHandler) {
				this._backdropElement.removeEventListener('click', this._backdropClickHandler);
				this._backdropClickHandler = undefined;
			}
			this._backdropElement?.remove();
			this._backdropElement = null;
		}

		this._contentElement = null;
		this._backdropClickCallback = undefined;
	}

	/**
	 * Checks whether content is currently attached to the overlay.
	 */
	hasAttached(): boolean {
		return this._isAttached;
	}

	/**
	 * Registers a callback for backdrop clicks.
	 * The last registered callback replaces any previous one.
	 *
	 * @param callback Function to call when the backdrop is clicked.
	 */
	onBackdropClick(callback: () => void): void {
		this._backdropClickCallback = callback;
	}

	/**
	 * Re-applies the configured position strategy to the overlay container.
	 */
	updatePosition(): void {
		if (this._config.positionStrategy && this._containerElement) {
			this._config.positionStrategy.apply(this._containerElement);
		}
	}

	/**
	 * Creates the overlay container element and appends it to the document.
	 */
	private _createContainer(): void {
		if (this._containerElement) {
			return;
		}

		this._containerElement = document.createElement('div');
		this._containerElement.classList.add('hub-overlay-container');

		if (this._config.panelClass) {
			const classes = Array.isArray(this._config.panelClass) ? this._config.panelClass : [this._config.panelClass];
			classes.forEach((cls) => this._containerElement!.classList.add(cls));
		}

		if (this._config.width) {
			this._containerElement.style.width =
				typeof this._config.width === 'number' ? `${this._config.width}px` : this._config.width;
		}

		if (this._config.height) {
			this._containerElement.style.height =
				typeof this._config.height === 'number' ? `${this._config.height}px` : this._config.height;
		}

		// A content-sized overlay must never clip: with no configured size the
		// container computes to 0x0 whenever its content is absolutely positioned
		// (connected-position dropdowns), and the stylesheet's `overflow: auto`
		// would clip that content into invisibility. Explicitly sized overlays
		// keep the scrollable box.
		if (!this._config.width && !this._config.height) {
			this._containerElement.style.overflow = 'visible';
		}

		this._containerElement.style.position = 'fixed';
		// Resolve the layer through the theme token so a consumer can re-stack the
		// overlay (e.g. above a modal) without `!important`; the literal fallback
		// keeps today's behavior when the overlay stylesheet is not imported.
		this._containerElement.style.zIndex =
			this._config.zIndex != null ? String(this._config.zIndex) : 'var(--hub-overlay-zindex, 1000)';

		document.body.appendChild(this._containerElement);
	}

	/**
	 * Creates the backdrop element if enabled and appends it to the document.
	 */
	private _createBackdrop(): void {
		if (!this._config.hasBackdrop || this._backdropElement) {
			return;
		}

		this._backdropElement = document.createElement('div');
		this._backdropElement.classList.add('hub-overlay-backdrop');

		if (this._config.backdropClass) {
			this._backdropElement.classList.add(this._config.backdropClass);
		}

		this._backdropElement.style.position = 'fixed';
		this._backdropElement.style.top = '0';
		this._backdropElement.style.left = '0';
		this._backdropElement.style.width = '100%';
		this._backdropElement.style.height = '100%';
		this._backdropElement.style.zIndex = 'var(--hub-overlay-backdrop-zindex, 999)';

		// Store reference to the handler for cleanup
		this._backdropClickHandler = () => {
			if (this._backdropClickCallback) {
				this._backdropClickCallback();
			}
		};

		this._backdropElement.addEventListener('click', this._backdropClickHandler);

		document.body.appendChild(this._backdropElement);
	}
}
