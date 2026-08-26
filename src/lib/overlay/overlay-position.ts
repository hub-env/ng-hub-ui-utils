import { ElementRef } from '@angular/core';
import type { ConnectionPosition } from './connection-position';
import type { HorizontalConnectionPos } from './horizontal-connection-pos';
import type { VerticalConnectionPos } from './vertical-connection-pos';

/**
 * Positions an overlay container relative to an origin element.
 * The first configured position that fits within the viewport is applied.
 */
export class OverlayPosition {
	private _origin: ElementRef | HTMLElement | null = null;
	private _positions: ConnectionPosition[] = [];
	private _direction: 'ltr' | 'rtl' | null = null;

	/**
	 * Forces the writing direction used to resolve `start` and `end`.
	 *
	 * Rarely needed: left unset, the direction is read from the origin element itself, which is
	 * what a field inside an RTL container reports. Set it only when the overlay must follow a
	 * direction its origin does not have.
	 *
	 * @param direction Writing direction, or `null` to go back to reading the origin's.
	 * @returns This position instance for chaining.
	 */
	withDirection(direction: 'ltr' | 'rtl' | null): this {
		this._direction = direction;
		return this;
	}

	/**
	 * Sets the origin element used to position the overlay.
	 *
	 * @param origin Element reference or HTMLElement.
	 * @returns This position instance for chaining.
	 */
	flexibleConnectedTo(origin: ElementRef | HTMLElement): this {
		this._origin = origin;
		return this;
	}

	/**
	 * Sets the preferred positions for the overlay.
	 * The order of the array determines the fallback priority.
	 *
	 * @param positions Array of position configurations.
	 * @returns This position instance for chaining.
	 */
	withPositions(positions: ConnectionPosition[]): this {
		this._positions = positions;
		return this;
	}

	/**
	 * Applies the calculated position to the overlay element.
	 *
	 * @param overlayElement The overlay container element.
	 */
	apply(overlayElement: HTMLElement): void {
		if (!this._origin) {
			return;
		}

		const originElement = this._origin instanceof ElementRef ? this._origin.nativeElement : this._origin;
		const originRect = originElement.getBoundingClientRect();
		// `start` and `end` are logical: under RTL they name the right and the left edge. Read from
		// the origin rather than from the document, so a field inside an RTL island is positioned by
		// the direction it is actually laid out in.
		const isRtl =
			this._direction === 'rtl' ||
			(this._direction === null && getComputedStyle(originElement).direction === 'rtl');

		// Try each position until we find one that fits in the viewport
		for (const position of this._positions) {
			const coords = this._calculatePosition(originRect, overlayElement, position, isRtl);

			if (this._fitsInViewport(coords, overlayElement)) {
				this._applyPosition(overlayElement, coords);
				return;
			}
		}

		// If no position fits perfectly, use the first one
		if (this._positions.length > 0) {
			const coords = this._calculatePosition(originRect, overlayElement, this._positions[0], isRtl);
			this._applyPosition(overlayElement, coords);
		}
	}

	/**
	 * Calculates the position coordinates based on the configuration.
	 *
	 * @param originRect Bounding rectangle of the origin element.
	 * @param overlayElement The overlay element.
	 * @param position Position configuration.
	 * @returns Calculated x and y coordinates.
	 */
	private _calculatePosition(
		originRect: DOMRect,
		overlayElement: HTMLElement,
		position: ConnectionPosition,
		isRtl: boolean
	): { x: number; y: number } {
		const overlayRect = overlayElement.getBoundingClientRect();

		// Calculate origin point
		let x = this._getOriginX(originRect, position.originX, isRtl);
		let y = this._getOriginY(originRect, position.originY);

		// Adjust for overlay alignment
		x -= this._getOverlayX(overlayRect, position.overlayX, isRtl);
		y -= this._getOverlayY(overlayRect, position.overlayY);

		// Apply offsets
		if (position.offsetX) {
			x += position.offsetX;
		}
		if (position.offsetY) {
			y += position.offsetY;
		}

		return { x, y };
	}

	/**
	 * Gets the X coordinate for the origin point.
	 */
	private _getOriginX(rect: DOMRect, position: HorizontalConnectionPos, isRtl: boolean): number {
		switch (position) {
			case 'start':
				return isRtl ? rect.right : rect.left;
			case 'center':
				return rect.left + rect.width / 2;
			case 'end':
				return isRtl ? rect.left : rect.right;
		}
	}

	/**
	 * Gets the Y coordinate for the origin point.
	 */
	private _getOriginY(rect: DOMRect, position: VerticalConnectionPos): number {
		switch (position) {
			case 'top':
				return rect.top;
			case 'center':
				return rect.top + rect.height / 2;
			case 'bottom':
				return rect.bottom;
		}
	}

	/**
	 * Gets the X offset for the overlay alignment.
	 */
	private _getOverlayX(rect: DOMRect, position: HorizontalConnectionPos, isRtl: boolean): number {
		switch (position) {
			case 'start':
				return isRtl ? rect.width : 0;
			case 'center':
				return rect.width / 2;
			case 'end':
				return isRtl ? 0 : rect.width;
		}
	}

	/**
	 * Gets the Y offset for the overlay alignment.
	 */
	private _getOverlayY(rect: DOMRect, position: VerticalConnectionPos): number {
		switch (position) {
			case 'top':
				return 0;
			case 'center':
				return rect.height / 2;
			case 'bottom':
				return rect.height;
		}
	}

	/**
	 * Checks if the overlay fits within the viewport at the given coordinates.
	 */
	private _fitsInViewport(
		coords: { x: number; y: number },
		overlayElement: HTMLElement
	): boolean {
		const overlayRect = overlayElement.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		return (
			coords.x >= 0 &&
			coords.y >= 0 &&
			coords.x + overlayRect.width <= viewportWidth &&
			coords.y + overlayRect.height <= viewportHeight
		);
	}

	/**
	 * Applies the calculated position to the overlay element.
	 */
	private _applyPosition(
		overlayElement: HTMLElement,
		coords: { x: number; y: number }
	): void {
		overlayElement.style.left = `${coords.x}px`;
		overlayElement.style.top = `${coords.y}px`;
	}
}
