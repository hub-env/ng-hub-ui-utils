# Custom Overlay System

A lightweight, zero-dependency overlay system built for Angular applications, designed to replace Angular CDK Overlay.

## Overview

This custom overlay system provides a flexible solution for creating floating overlays, dropdowns, modals, and tooltips without requiring external dependencies. It handles positioning, backdrop management, and lifecycle management automatically.

## Features

- **Zero Dependencies**: No external libraries required (no Angular CDK)
- **Flexible Positioning**: Multiple positioning strategies with automatic fallback
- **Backdrop Support**: Optional backdrop with click-to-close functionality
- **Memory Safe**: Automatic cleanup and disposal mechanisms
- **TypeScript**: Full type safety with comprehensive interfaces
- **Lightweight**: Minimal code footprint

## Architecture

### Core Components

1. **OverlayService**: Main service for creating overlay instances
2. **OverlayRef**: Reference to an individual overlay instance
3. **OverlayPosition**: Positioning strategy manager
4. **ConnectionPosition**: Interface for position configuration

## Usage

### Basic Example

```typescript
import { Component, inject, TemplateRef, viewChild } from '@angular/core';
import { OverlayRef, OverlayService } from 'ng-hub-ui-utils';

@Component({
	selector: 'app-example',
	template: `
		<button (click)="openOverlay()">Open Overlay</button>

		<ng-template #content>
			<div class="overlay-content">
				<p>This is the overlay content</p>
			</div>
		</ng-template>
	`
})
export class ExampleComponent {
	private overlayService = inject(OverlayService);
	private overlayRef?: OverlayRef;

	content = viewChild.required<TemplateRef<unknown>>('content');

	openOverlay(): void {
		// Create position strategy
		const positionStrategy = this.overlayService
			.position()
			.flexibleConnectedTo(buttonElement)
			.withPositions([
				{
					originX: 'start',
					originY: 'bottom',
					overlayX: 'start',
					overlayY: 'top',
					offsetY: 4
				}
			]);

		// Create overlay
		this.overlayRef = this.overlayService.create({
			positionStrategy,
			hasBackdrop: true,
			backdropClass: 'custom-backdrop'
		});

		// Attach content
		this.overlayRef.attach(this.content(), viewContainerRef);

		// Handle backdrop clicks
		this.overlayRef.onBackdropClick(() => {
			this.closeOverlay();
		});
	}

	closeOverlay(): void {
		this.overlayRef?.dispose();
	}
}
```

### Position Configuration

The overlay supports multiple positioning strategies with automatic fallback:

```typescript
const positions: ConnectionPosition[] = [
	// Primary position: below the element, aligned to start
	{
		originX: 'start',
		originY: 'bottom',
		overlayX: 'start',
		overlayY: 'top',
		offsetY: 4
	},
	// Fallback: above the element
	{
		originX: 'start',
		originY: 'top',
		overlayX: 'start',
		overlayY: 'bottom',
		offsetY: -4
	},
	// Fallback: right side
	{
		originX: 'end',
		originY: 'bottom',
		overlayX: 'end',
		overlayY: 'top',
		offsetY: 4
	}
];

const positionStrategy = overlayService
	.position()
	.flexibleConnectedTo(elementRef)
	.withPositions(positions);
```

### Configuration Options

```typescript
interface OverlayConfig {
	/** Whether the overlay has a backdrop */
	hasBackdrop?: boolean;

	/** CSS class to apply to the backdrop */
	backdropClass?: string;

	/** Position configuration for the overlay */
	positionStrategy?: OverlayPosition;

	/** Width of the overlay */
	width?: string | number;

	/** Height of the overlay */
	height?: string | number;

	/** Custom CSS classes for the overlay container */
	panelClass?: string | string[];
}
```

## API Reference

### OverlayService

**Methods:**

- `create(config?: OverlayConfig): OverlayRef`
  - Creates a new overlay instance

- `position(): OverlayPosition`
  - Creates a new position strategy

### OverlayRef

**Methods:**

- `attach(content: TemplateRef | Component, viewContainerRef?: ViewContainerRef): HTMLElement`
  - Attaches content to the overlay

- `detach(): void`
  - Detaches content from the overlay

- `dispose(): void`
  - Disposes of the overlay and cleans up resources

- `hasAttached(): boolean`
  - Checks if content is currently attached

- `onBackdropClick(callback: () => void): void`
  - Registers a callback for backdrop clicks

- `updatePosition(): void`
  - Updates the overlay position

### OverlayPosition

**Methods:**

- `flexibleConnectedTo(origin: ElementRef | HTMLElement): this`
  - Sets the origin element for positioning

- `withPositions(positions: ConnectionPosition[]): this`
  - Sets the position configurations with fallbacks

- `apply(overlayElement: HTMLElement): void`
  - Applies the positioning to the overlay element

### ConnectionPosition

```typescript
interface ConnectionPosition {
	/** Horizontal position of the origin element */
	originX: 'start' | 'center' | 'end';

	/** Vertical position of the origin element */
	originY: 'top' | 'center' | 'bottom';

	/** Horizontal position of the overlay element */
	overlayX: 'start' | 'center' | 'end';

	/** Vertical position of the overlay element */
	overlayY: 'top' | 'center' | 'bottom';

	/** Offset in pixels along the X axis */
	offsetX?: number;

	/** Offset in pixels along the Y axis */
	offsetY?: number;
}
```

## Styling

Include the overlay styles in your global styles:

```scss
@import 'ng-hub-ui-utils/styles/overlay';
```

Or manually add:

```scss
.hub-overlay-container {
	position: absolute;
	z-index: 1000;
	background: white;
	border-radius: 4px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.hub-overlay-backdrop {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 999;
}

.hub-overlay-transparent-backdrop {
	background: transparent;
}
```

## Best Practices

1. **Always dispose overlays**: Call `dispose()` in `ngOnDestroy` to prevent memory leaks
2. **Use position fallbacks**: Provide multiple positions to ensure visibility
3. **Handle backdrop clicks**: Implement proper close behavior
4. **Update on scroll**: Call `updatePosition()` when the page scrolls
5. **Manage z-index**: Use consistent z-index values across your application

## Performance Considerations

- The overlay system uses native DOM manipulation for optimal performance
- Automatic cleanup prevents memory leaks
- While an overlay is attached, `scroll` and `resize` are listened to and the position recomputed,
  coalesced into an animation frame so a burst of scroll events costs one reposition
- The scroll listener is registered on `window` in the **capture** phase. A `scroll` event on an
  element does not bubble, so a listener on `document` — which is what Angular CDK's
  `ScrollDispatcher` uses — never hears an application that scrolls an inner container rather than
  the page, and its panels drift away from their origin. Capture sees both.

## Migration from Angular CDK

If migrating from Angular CDK Overlay:

1. Replace `Overlay` service with `OverlayService`
2. Replace `ConnectedPosition` with `ConnectionPosition`
3. Remove `TemplatePortal` usage - pass `TemplateRef` directly to `attach()`
4. Replace `backdropClick()` observable with `onBackdropClick()` callback
5. Remove scroll strategies — repositioning on scroll and resize is built in, and covers inner
   scroll containers that the CDK's `document`-level listener misses
6. `start` and `end` are logical: they resolve to the right and left edge under RTL. The direction
   is read from the origin element, so an RTL island inside an LTR page positions correctly with no
   configuration; `withDirection()` overrides it when the overlay must follow a direction its origin
   does not have
7. `overlayRef.keydownEvents()` becomes `overlayRef.onKeydown(cb)`. Like the CDK's, it is fed by a
   document-level dispatcher and only the topmost open overlay is told — needed because an overlay
   opened from a click does not hold focus, so nothing local ever hears Escape
8. For a plain dropdown, `HUB_DROPDOWN_POSITIONS` is the same four-position fallback chain the CDK
   defaults to, expressed logically so one list serves both directions

## License

Part of the ng-hub-ui library ecosystem.
