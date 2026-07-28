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
	attach(
		content: TemplateRef<unknown> | Type<unknown>,
		viewContainerRef?: ViewContainerRef
	): HTMLElement {
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
				throw new Error(
					'ViewContainerRef is required when attaching a TemplateRef'
				);
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
			contentElement = (this._componentRef.hostView as EmbeddedViewRef<unknown>)
				.rootNodes[0] as HTMLElement;
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
		}

		return contentElement;
	}

	/**
	 * Detaches the content from the overlay container without disposing the overlay.
	 */
	detach(): void {
		if (!this._isAttached) {
			return;
		}

		if (this._contentElement && this._containerElement) {
			this._containerElement.removeChild(this._contentElement);
		}

		this._isAttached = false;
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
			document.body.removeChild(this._containerElement);
			this._containerElement = null;
		}

		if (this._backdropElement) {
			// Remove event listener before removing element from DOM
			if (this._backdropClickHandler) {
				this._backdropElement.removeEventListener(
					'click',
					this._backdropClickHandler
				);
				this._backdropClickHandler = undefined;
			}
			document.body.removeChild(this._backdropElement);
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
			const classes = Array.isArray(this._config.panelClass)
				? this._config.panelClass
				: [this._config.panelClass];
			classes.forEach((cls) => this._containerElement!.classList.add(cls));
		}

		if (this._config.width) {
			this._containerElement.style.width =
				typeof this._config.width === 'number'
					? `${this._config.width}px`
					: this._config.width;
		}

		if (this._config.height) {
			this._containerElement.style.height =
				typeof this._config.height === 'number'
					? `${this._config.height}px`
					: this._config.height;
		}

		this._containerElement.style.position = 'fixed';
		// Resolve the layer through the theme token so a consumer can re-stack the
		// overlay (e.g. above a modal) without `!important`; the literal fallback
		// keeps today's behavior when the overlay stylesheet is not imported.
		this._containerElement.style.zIndex =
			this._config.zIndex != null
				? String(this._config.zIndex)
				: 'var(--hub-overlay-zindex, 1000)';

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
