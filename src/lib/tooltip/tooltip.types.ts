/** Supported tooltip placements relative to the host element. */
export type HubTooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

/**
 * Imperative configuration shared by the tooltip directive and any consumer that
 * drives a tooltip through `HubTooltipController`.
 */
export interface HubTooltipOptions {
	/** Placement of the tooltip relative to the host. */
	placement?: HubTooltipPlacement;
	/** Fade duration in milliseconds, also used as the removal delay on hide. */
	delay?: number;
	/** Pointer hover wait in milliseconds; keyboard focus remains immediate. */
	showDelay?: number;
	/** Gap in pixels between the host and the tooltip. */
	offset?: number;
}

/**
 * Live handle returned by `HubTooltipAdapter.attach`, used to update or tear
 * down a tooltip.
 */
export interface HubTooltipHandle {
	/** Updates the tooltip label (empty string disables it). */
	update(text: string): void;
	/** Detaches listeners and removes the tooltip. */
	destroy(): void;
}

/**
 * Minimal, framework-agnostic tooltip contract.
 *
 * It is deliberately defined by structure (not by import) so any primitive in
 * the ecosystem — such as `ng-hub-ui-badges` — can accept this implementation
 * through its own token without taking a hard dependency on this package.
 */
export interface HubTooltipAdapter {
	/**
	 * Attaches a hub-ui tooltip to `host` with the given initial `text`.
	 * @returns A handle to update or tear down the tooltip.
	 */
	attach(host: HTMLElement, text: string, options?: HubTooltipOptions): HubTooltipHandle;
}
