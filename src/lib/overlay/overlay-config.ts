import type { OverlayPosition } from './overlay-position';

/**
 * Configuration options for creating an overlay instance.
 */
export interface OverlayConfig {
	/**
	 * Whether the overlay should render a backdrop behind the panel.
	 * @default false
	 */
	hasBackdrop?: boolean;
	/**
	 * CSS class to apply to the backdrop element.
	 */
	backdropClass?: string;
	/**
	 * Position strategy used to place the overlay container.
	 */
	positionStrategy?: OverlayPosition;
	/**
	 * Width of the overlay. Numbers are treated as pixels.
	 */
	width?: string | number;
	/**
	 * Height of the overlay. Numbers are treated as pixels.
	 */
	height?: string | number;
	/**
	 * Custom CSS classes for the overlay container.
	 */
	panelClass?: string | string[];
	/**
	 * Explicit z-index for the overlay container. When omitted, the layer is
	 * resolved through the `--hub-overlay-zindex` token (fallback `1000`).
	 */
	zIndex?: number | string;
}
