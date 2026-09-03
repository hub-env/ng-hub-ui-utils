# ng-hub-ui-utils

[![NPM Version](https://img.shields.io/npm/v/ng-hub-ui-utils.svg)](https://www.npmjs.com/package/ng-hub-ui-utils)
[![License](https://img.shields.io/npm/l/ng-hub-ui-utils.svg)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/carlos-morcillo/ng-hub-ui/ci.yml)](https://github.com/carlos-morcillo/ng-hub-ui/actions)

> Common utilities library for Angular, fundamental support for the Hub UI ecosystem.

[Español](./README.es.md) | **English**

## 📝 Description

`ng-hub-ui-utils` is the foundational utilities library for the entire Hub UI ecosystem. It provides a curated set of framework-agnostic helper functions, type guards, standalone Angular pipes, a flexible overlay/popup system, focus-trap and accessibility helpers, scrollbar compensation, a smooth transition engine, and a lightweight internationalization (i18n) system. It ships no visual components — instead it powers the shared low-level behavior used across the rest of the `ng-hub-ui` libraries, while remaining tree-shakable so you only bundle what you import.

## 📑 Table of Contents

- [Description](#-description)
- [Documentation and Live Examples](#-documentation-and-live-examples)
- [Library Family `ng-hub-ui`](#-library-family-ng-hub-ui)
- [Inspiration](#-inspiration)
- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Internationalization (i18n)](#-internationalization-i18n)
- [Utilities API](#-utilities-api)
- [Support Components](#-support-components)
- [Compatibility](#-compatibility)
- [Development](#-development)
- [Testing](#-testing)
- [Changelog](#-changelog)
- [Issues and Support](#-issues-and-support)
- [Support the Project](#-support-the-project)
- [Contributions](#-contributions)
- [License](#-license)

## 📚 Documentation and Live Examples

This package is part of [Hub UI](https://hubui.dev/en/), a collection of Angular component libraries for standalone apps.

- Docs: https://hubui.dev/en/utils/overview/
- Live examples: https://hubui.dev/en/utils/examples/
- Hub UI: https://hubui.dev/en/

## 🧩 Library Family `ng-hub-ui`

This library is part of the **ng-hub-ui** ecosystem:

- [**ng-hub-ui-accordion**](https://www.npmjs.com/package/ng-hub-ui-accordion) (deprecated — use ng-hub-ui-panels)
- [**ng-hub-ui-action-sheet**](https://www.npmjs.com/package/ng-hub-ui-action-sheet)
- [**ng-hub-ui-avatar**](https://www.npmjs.com/package/ng-hub-ui-avatar)
- [**ng-hub-ui-board**](https://www.npmjs.com/package/ng-hub-ui-board)
- [**ng-hub-ui-breadcrumbs**](https://www.npmjs.com/package/ng-hub-ui-breadcrumbs)
- [**ng-hub-ui-calendar**](https://www.npmjs.com/package/ng-hub-ui-calendar)
- [**ng-hub-ui-dropdown**](https://www.npmjs.com/package/ng-hub-ui-dropdown)
- [**ng-hub-ui-ds**](https://www.npmjs.com/package/ng-hub-ui-ds)
- [**ng-hub-ui-forms**](https://www.npmjs.com/package/ng-hub-ui-forms)
- [**ng-hub-ui-history**](https://www.npmjs.com/package/ng-hub-ui-history)
- [**ng-hub-ui-milestones**](https://www.npmjs.com/package/ng-hub-ui-milestones)
- [**ng-hub-ui-modal**](https://www.npmjs.com/package/ng-hub-ui-modal)
- [**ng-hub-ui-nav**](https://www.npmjs.com/package/ng-hub-ui-nav)
- [**ng-hub-ui-paginable**](https://www.npmjs.com/package/ng-hub-ui-paginable)
- [**ng-hub-ui-panels**](https://www.npmjs.com/package/ng-hub-ui-panels)
- [**ng-hub-ui-portal**](https://www.npmjs.com/package/ng-hub-ui-portal)
- [**ng-hub-ui-skeleton**](https://www.npmjs.com/package/ng-hub-ui-skeleton)
- [**ng-hub-ui-sortable**](https://www.npmjs.com/package/ng-hub-ui-sortable)
- [**ng-hub-ui-stepper**](https://www.npmjs.com/package/ng-hub-ui-stepper)
- [**ng-hub-ui-utils**](https://www.npmjs.com/package/ng-hub-ui-utils) ← You are here

## 💡 Inspiration

This utilities library emerged from the need to provide common, reusable, and optimized support functions for the entire Hub UI ecosystem. Inspired by best practices in Angular development and internal utilities from libraries like Angular Bootstrap and Material Design, it provides essential tools for developing modern UI components.

## ✨ Features

### 🔧 Focus Management and Accessibility

Advanced utilities for focus handling, focus trapping, and keyboard navigation.

```typescript
import { getFocusableBoundaryElements, FOCUSABLE_ELEMENTS_SELECTOR } from 'ng-hub-ui-utils';

// Get focusable elements in a container
const [firstElement, lastElement] = getFocusableBoundaryElements(containerElement);

// Create a focus trap in a modal
const focusTrap = hubFocusTrap(ngZone, modalElement, stopFocusTrap$);
```

### 🪟 Overlay Service

Advanced system for creating overlays and floating components with flexible positioning.

```typescript
import { OverlayService, OverlayConfig } from 'ng-hub-ui-utils';

@Component({
  selector: 'app-example'
})
export class ExampleComponent {
  constructor(private overlayService: OverlayService) {}

  openOverlay(elementRef: ElementRef) {
    // Create overlay with configuration
    const overlayRef = this.overlayService.create({
      hasBackdrop: true,
      backdropClass: 'custom-backdrop'
    });

    // Configure position strategy
    const positionStrategy = this.overlayService.position()
      .flexibleConnectedTo(elementRef)
      .withPositions([{
        originX: 'start',
        originY: 'bottom',
        overlayX: 'start',
        overlayY: 'top'
      }]);

    // Attach component to overlay
    const componentRef = overlayRef.attach(MyComponent);
  }
}
```

**Stacking (z-index).** `OverlayRef` resolves its inline z-index through the design-system tokens — `var(--hub-overlay-zindex, 1000)` for the container and `var(--hub-overlay-backdrop-zindex, 999)` for the backdrop — so re-stacking an overlay (e.g. a dropdown above a modal) is a plain CSS override, no `!important` needed. For a single instance, pass an explicit layer instead:

```typescript
this.overlayService.create({ zIndex: 1100 }); // OverlayConfig.zIndex: number | string — takes precedence over the token
```

### 🎯 Popup Service (Base Class)

Base service for creating custom popup implementations.

```typescript
import { PopupService } from 'ng-hub-ui-utils';

@Injectable()
export class MyPopupService extends PopupService<MyPopupComponent> {
  constructor() {
    super(MyPopupComponent);
  }

  openPopup(content?: string | TemplateRef<any>) {
    const { windowRef, transition$ } = super.open(content, {}, true);
    return { windowRef, transition$ };
  }
}
```

### 📜 Scrollbar Management

Intelligent scrollbar control with layout compensation.

```typescript
import { ScrollBar } from 'ng-hub-ui-utils';

constructor(private scrollBar: ScrollBar) {}

openModal() {
  // Hide scrollbar and compensate for space
  const reverter = this.scrollBar.hide();

  // On modal close, restore scrollbar
  modalClose.subscribe(() => reverter());
}
```

### ⚡ Transition System

Utilities for smooth animations and transitions with automatic detection.

```typescript
import { hubRunTransition } from 'ng-hub-ui-utils';

// Execute transition with callback
hubRunTransition(
	this.ngZone,
	element,
	(element, animation, context) => {
		// Transition start logic
		element.classList.add('transitioning');

		return () => {
			// Cleanup at transition end
			element.classList.remove('transitioning');
		};
	},
	{
		animation: true,
		runningTransition: 'continue',
		context: { customData: 'value' }
	}
).subscribe(() => {
	console.log('Transition completed');
});
```

### 🌐 Internationalization (i18n)

Lightweight, dependency-injection based translation system with a reactive pipe. Register translation dictionaries at bootstrap with `provideHubTranslation`, then translate keys in templates with the `translate` pipe.

```typescript
import { provideHubTranslation, HubTranslationService, TranslatePipe } from 'ng-hub-ui-utils';

// In your application config / bootstrap providers
bootstrapApplication(AppComponent, {
	providers: [
		provideHubTranslation({
			language: 'en',
			fallbackLanguage: 'en',
			dictionaries: {
				en: { greeting: 'Hello {name}!' },
				es: { greeting: '¡Hola {name}!' }
			}
		})
	]
});
```

```typescript
@Component({
	standalone: true,
	imports: [TranslatePipe],
	template: `
		<!-- Simple key -->
		<p>{{ 'greeting' | translate }}</p>

		<!-- With interpolation params -->
		<p>{{ 'greeting' | translate: { name: 'Carlos' } }}</p>
	`
})
export class ExampleComponent {}
```

See [Internationalization (i18n)](#-internationalization-i18n) for the full API.

### 🧰 Standalone Angular Pipes

Complete set of utility pipes for validation, transformation, and data manipulation.

```typescript
import { GetPipe, IsStringPipe, IsObjectPipe, IsObservablePipe, UcfirstPipe, UnwrapAsyncPipe } from 'ng-hub-ui-utils';

@Component({
	standalone: true,
	imports: [GetPipe, IsStringPipe, UcfirstPipe, UnwrapAsyncPipe],
	template: `
		<!-- Safe nested property access -->
		<p>{{ user | get : 'address.city' : 'Unknown' }}</p>

		<!-- Capitalize first letter -->
		<h1>{{ title | ucfirst }}</h1>

		<!-- Type checking in templates -->
		@if (value | isString) {
		<span>It's a string: {{ value }}</span>
		}

		<!-- Unwrap Observable or direct value -->
		<div>{{ observableOrValue | unwrapAsync }}</div>
	`
})
export class ExampleComponent {
	user = { address: { city: 'New York' } };
	title = 'hello world';
	value: any = 'test';
	observableOrValue = of('Observable value');
}
```

**Available Pipes:**

-   **GetPipe** (`get`): Safe nested property access with default values
-   **IsStringPipe** (`isString`): Check if value is a string
-   **IsObjectPipe** (`isObject`): Check if value is an object
-   **IsObservablePipe** (`isObservable`): Check if value is an Observable
-   **UcfirstPipe** (`ucfirst`): Capitalize first letter of a string
-   **UnwrapAsyncPipe** (`unwrapAsync`): Unwrap Observable or return direct value

### 🛠️ General Utility Functions

Complete set of helpers for validation, transformation, and data manipulation.

```typescript
import {
	toInteger,
	toString,
	getValueInRange,
	isString,
	isNumber,
	isInteger,
	isDefined,
	isPromise,
	padNumber,
	regExpEscape,
	closest,
	reflow,
	removeAccents,
	getActiveElement
} from 'ng-hub-ui-utils';

// Safe conversions
const numValue = toInteger('42'); // 42
const strValue = toString(null); // ''

// Type validations
if (isString(value)) {
	/* ... */
}
if (isPromise(result)) {
	/* ... */
}

// DOM manipulation
const parent = closest(element, '.container');
reflow(element); // Force browser reflow

// String utilities
const clean = removeAccents('niño'); // "nino"
const escaped = regExpEscape('hello?'); // "hello\\?"

// Focus management
const activeEl = getActiveElement(); // Includes shadow DOM
```

### 🎯 Full TypeScript Support

Strict typing throughout the library with well-defined interfaces and types.

```typescript
// Transition types
type TransitionStartFn<T> = (element: HTMLElement, animation: boolean, context: T) => TransitionEndFn | void;

interface TransitionOptions<T> {
	animation: boolean;
	runningTransition: 'continue' | 'stop';
	context?: T;
}

// Scrollbar reverter type
type ScrollbarReverter = () => void;
```

### ⚡ Optimized Tree-shaking

Import only the utilities you need to optimize your bundle.

```typescript
// Specific imports
import { toInteger, isString } from 'ng-hub-ui-utils';
import { ScrollBar } from 'ng-hub-ui-utils';
import { hubRunTransition } from 'ng-hub-ui-utils';
import { GetPipe, UcfirstPipe } from 'ng-hub-ui-utils';
```

### 🏷️ Tooltip Directive

Add a lightweight, themeable tooltip to any element with the `[tooltip]` directive.
The tooltip is appended to `<body>` (never clipped) and shows on hover/focus.

```typescript
import { TooltipDirective } from 'ng-hub-ui-utils';

@Component({
	standalone: true,
	imports: [TooltipDirective],
	template: `<button tooltip="Save changes" placement="top">Save</button>`
})
export class ExampleComponent {}
```

> **Styles (required since 22.4.0).** The tooltip no longer injects its CSS at
> runtime — import its stylesheet once in your app (e.g. `styles.scss`), the same
> way as `overlay`:
>
> ```scss
> @use 'ng-hub-ui-utils/styles/tooltip';
> ```

Inputs: `tooltip` (text), `placement` (`top` | `bottom` | `left` | `right`, default `top`),
`delay` (fade ms, default `150`), `offset` (px, default `8`).

Theme it from any scope with `--hub-tooltip-*` variables:

```css
.my-scope {
	--hub-tooltip-bg: var(--hub-sys-color-primary);
	--hub-tooltip-color: #fff;
	--hub-tooltip-border-radius: 999px;
	--hub-tooltip-opacity: 1;
}
```

Available tokens: `--hub-tooltip-bg`, `--hub-tooltip-color`, `--hub-tooltip-opacity`,
`--hub-tooltip-padding-x`, `--hub-tooltip-padding-y`, `--hub-tooltip-border-radius`,
`--hub-tooltip-font-size`, `--hub-tooltip-max-width`, `--hub-tooltip-zindex`,
`--hub-tooltip-transition-duration`, `--hub-tooltip-shadow`, `--hub-tooltip-font-family`.

#### Tooltip adapter for other libraries (`hubTooltipAdapter`)

The same tooltip engine is exposed as a framework-agnostic adapter so sibling
libraries can offer the hub-ui tooltip **without hard-depending on this package**.
Wire it into their optional tooltip token — e.g. for badges or breadcrumbs:

```ts
import { hubTooltipAdapter } from 'ng-hub-ui-utils';
import { provideHubBadgeTooltip } from 'ng-hub-ui-badges';
import { provideHubBreadcrumbTooltip } from 'ng-hub-ui-breadcrumbs';

providers: [
  provideHubBadgeTooltip(hubTooltipAdapter),
  provideHubBreadcrumbTooltip(hubTooltipAdapter)
];
```

Also available: the imperative `HubTooltipController` (engine) and the
`HubTooltipAdapter` / `HubTooltipHandle` / `HubTooltipOptions` types. See the
ecosystem-wide [Synergies & agnosticism](../../README.md#synergies--agnosticism)
section.

## 🚀 Installation

```bash
npm install ng-hub-ui-utils
# or
yarn add ng-hub-ui-utils
```

## 📖 Quick Start

```typescript
// Import specific utilities
import { toInteger, isString, ScrollBar, getFocusableBoundaryElements, GetPipe, UcfirstPipe } from 'ng-hub-ui-utils';

@Component({
	selector: 'app-example',
	standalone: true,
	imports: [GetPipe, UcfirstPipe],
	template: `
		<div #container>
			<h1>{{ title | ucfirst }}</h1>
			<p>{{ user | get : 'name' : 'Anonymous' }}</p>
		</div>
	`
})
export class ExampleComponent {
	constructor(private scrollBar: ScrollBar) {}

	@ViewChild('container') containerElement!: ElementRef<HTMLElement>;

	title = 'welcome';
	user = { name: 'John Doe' };

	ngAfterViewInit() {
		// Get focusable elements
		const [first, last] = getFocusableBoundaryElements(this.containerElement.nativeElement);

		// Safe conversion
		const value = toInteger('42');

		if (isString(this.title)) {
			console.log("It's a string");
		}
	}

	openOverlay() {
		// Hide scrollbar during overlay
		const reverter = this.scrollBar.hide();

		// Restore on close
		this.overlayRef.onClose(() => reverter());
	}
}
```

## 🌐 Internationalization (i18n)

The i18n system (available since `v1.2.0`) lets you register translation dictionaries via dependency injection and resolve keys reactively in templates. Updating the active translations at runtime automatically refreshes any `translate` pipe in the view.

### `provideHubTranslation(config?)`

Environment provider helper that registers `HubTranslationService` and its configuration. Call it once in your application bootstrap providers.

### `provideHubTranslationAdapter(factory)`

Use this provider when the application owns translations through Transloco, ngx-translate or another reactive service. The factory runs once in Angular's injection context and returns an observable-like source of complete dictionaries. Every Hub UI library using `HubTranslationService` receives language changes without component-level subscriptions.

```typescript
function provideHubTranslation(config?: HubTranslationConfig): EnvironmentProviders;
```

### `HubTranslationConfig`

```typescript
interface HubTranslationConfig {
	/** Map of language code → translation dictionary. */
	dictionaries?: Record<string, Record<string, any>>;
	/** Active language code (defaults to fallbackLanguage, then 'en'). */
	language?: string;
	/** Fallback language merged under the active language (defaults to 'en'). */
	fallbackLanguage?: string;
}
```

The configuration is also exposed through the `HUB_TRANSLATION_CONFIG` injection token for advanced scenarios.

### `HubTranslationService`

Injectable service that holds the active translations and notifies subscribers when they change.

```typescript
@Injectable()
class HubTranslationService {
	/** Currently active flat translations map. */
	translations: Record<string, string>;
	/** Emits whenever the active translations are updated. */
	translationObserver: Observable<Record<string, string>>;

	/** Resolves a key (supports dot notation) against the active translations. */
	getTranslation(key: string): any;
	/** Replaces the active translations, merging them over the fallback dictionary. */
	setTranslations(translations?: Record<string, string>): void;
}
```

```typescript
import { HubTranslationService } from 'ng-hub-ui-utils';

@Component({ /* ... */ })
export class LanguageSwitcherComponent {
	private translationSvc = inject(HubTranslationService);

	switchToSpanish() {
		// Swap the active dictionary at runtime; the `translate` pipe updates automatically.
		this.translationSvc.setTranslations({ greeting: '¡Hola {name}!' });
	}
}
```

### `TranslatePipe` (`translate`)

Impure standalone pipe that resolves a translation key with optional interpolation params. It subscribes to the service so the view stays in sync when translations change.

```typescript
// Simple key
{{ 'greeting' | translate }}

// With an object of interpolation params
{{ 'greeting' | translate: { name: 'Carlos' } }}

// Params can also be written inline as a pseudo-object string
{{ 'greeting' | translate: "{name: 'Carlos'}" }}
```

If a key has no matching translation, the key itself is returned. Interpolation tokens use the `{paramName}` syntax (powered by the `interpolateString` utility).

### Supporting utilities

These functions back the i18n system and are exported for direct use:

- `getValue(target: any, key: string): any` - Reads a nested value by dot-notation key.
- `interpolateString(text: string, params?: object): string` - Replaces `{token}` placeholders in a string.
- `equals(o1: any, o2: any): boolean` - Deep equality check used to memoize the pipe value.

## 📊 Utilities API

### Conversion Functions

-   `toInteger(value: any): number` - Safely converts to integer
-   `toString(value: any): string` - Converts to string handling null/undefined
-   `getValueInRange(value: number, max: number, min?: number): number` - Limits value to range
-   `padNumber(value: number): string` - Adds leading zero to numbers

### Validation Functions

-   `isString(value: any): value is string` - Checks if value is a string
-   `isNumber(value: any): value is number` - Checks if value is a valid number
-   `isInteger(value: any): value is number` - Checks if value is an integer
-   `isDefined(value: any): boolean` - Checks if not null/undefined
-   `isPromise<T>(v: any): v is Promise<T>` - Checks if value is a Promise

### String Functions

-   `regExpEscape(text: string): string` - Escapes special characters for RegExp
-   `removeAccents(str: string): string` - Removes accents from text

### DOM Functions

-   `closest(element: HTMLElement, selector?: string): HTMLElement | null` - Finds parent element by selector
-   `reflow(element: HTMLElement): DOMRect` - Forces browser reflow
-   `getActiveElement(root?: Document | ShadowRoot): Element | null` - Gets active element including Shadow DOM

### Colour Functions

-   `parseColor(value): HubRgb | null` - Parses hex (3/4/6/8), `rgb()`, `hsl()`, `oklch()`, `oklab()`, the 148 CSS named colours and `transparent`, in modern and legacy syntax. No DOM, so it runs under SSR. Returns `null` — never throws — for anything it cannot resolve, `var()` and `currentColor` included
-   `toRgb(color): HubRgb | null` - Normalises a string or parsed colour to channels
-   `toHex(color): string | null` - Renders as `#rrggbb`, or `#rrggbbaa` when translucent
-   `isValidColor(value): boolean` - Whether the parser can resolve the string
-   `HUB_NAMED_COLORS: Readonly<Record<string, string>>` - The 148 CSS named colours

### Contrast Functions

-   `relativeLuminance(color): number | null` - WCAG 2 relative luminance, 0 to 1
-   `contrastRatio(a, b): number | null` - WCAG 2 contrast ratio, 1 to 21
-   `contrastAPCA(text, background): number | null` - APCA lightness contrast, polarity-aware
-   `compositeOver(foreground, background): HubColor` - Blends translucent over opaque
-   `readableOn(background, metric?): string` - Black or white, whichever reads better. Defaults to `'lightness'`, the same decision `--hub-sys-color-*-on` makes in CSS; `'apca'` and `'wcag'` are also available
-   `HUB_INK_LIGHTNESS_THRESHOLD: number` - The OKLCh lightness above which a surface takes dark ink

### OKLCh Functions

-   `rgbToOklch(color): HubOklch` / `oklchToRgb(color): HubRgb` - Conversions in the space the design system mixes in
-   `maxSrgbChroma(l, h): number` - Highest in-gamut chroma for a hue at a lightness. The sRGB gamut is not a cylinder — at L 0.578 blue reaches 0.232 and amber only 0.119 — so a palette cannot give every hue the same absolute chroma
-   `isInSrgbGamut(color): boolean` - Whether the colour survives the trip to sRGB
-   `clampToSrgbGamut(color): HubOklch` - Reduces chroma until it fits, preserving lightness and hue

### Focus Functions

-   `getFocusableBoundaryElements(element: HTMLElement): HTMLElement[]` - Gets first and last focusable elements
-   `hubFocusTrap(zone, element, stopFocusTrap$, refocusOnClick?)` - Creates focus trap for modals/overlays
-   `FOCUSABLE_ELEMENTS_SELECTOR: string` - CSS selector for focusable elements

### Pipes

#### GetPipe

```typescript
// Safe nested property access
{{ object | get:'path.to.property':'defaultValue' }}
```

#### IsStringPipe

```typescript
// Type checking
@if (value | isString) { <span>String value</span> }
```

#### IsObjectPipe

```typescript
// Object checking
@if (value | isObject) { <span>Object value</span> }
```

#### IsObservablePipe

```typescript
// Observable checking
@if (stream | isObservable) { <span>Observable stream</span> }
```

#### UcfirstPipe

```typescript
// Capitalize first letter
{{ 'hello world' | ucfirst }}  <!-- Hello world -->
```

#### UnwrapAsyncPipe

```typescript
// Unwrap Observable or return direct value
{
	{
		observableOrValue | unwrapAsync;
	}
}
```

### Services

#### OverlayService

```typescript
@Injectable({ providedIn: 'root' })
class OverlayService {
  create(config?: OverlayConfig): OverlayRef;
  position(): OverlayPosition;
}

class OverlayRef {
  attach<T>(component: ComponentType<T>): ComponentRef<T>;
  detach(): void;
  dispose(): void;
  updatePosition(): void;
}

class OverlayPosition {
  flexibleConnectedTo(element: ElementRef | HTMLElement): this;
  withPositions(positions: ConnectionPosition[]): this;
}
```

#### ScrollBar Service

```typescript
@Injectable({ providedIn: 'root' })
class ScrollBar {
  hide(): ScrollbarReverter; // Hides scrollbar with compensation
}
```

#### PopupService<T> (Base Class)

```typescript
abstract class PopupService<T> {
  // Base system for creating dynamic popups
  // Extend this class to create specific popup services
  open(content?, templateContext?, animation?): { windowRef: ComponentRef<T>; transition$: Observable<void> };
  close(animation?): Observable<void>;
}
```

### Transition Utilities

-   `hubRunTransition<T>(zone, element, startFn, options)` - Advanced transition system with Observable
-   `hubCompleteTransition(element)` - Completes a running transition on an element
-   `getTransitionDurationMs(element)` - Gets CSS transition duration in milliseconds
-   `runInZone<T>(zone)` - RxJS operator to execute observables inside NgZone

## 🎨 Support Components

This library doesn't include visual components, but support utilities used by other components in the Hub UI ecosystem:

| Utility         | Description                         | Used by                                |
| --------------- | ----------------------------------- | -------------------------------------- |
| Overlay Service | Flexible overlay positioning system | ng-hub-ui-modal, ng-hub-ui-portal      |
| Focus Trap      | Focus management in modals/overlays | ng-hub-ui-modal, ng-hub-ui-portal      |
| Scrollbar       | Scrollbar compensation              | ng-hub-ui-modal, ng-hub-ui-portal      |
| Popup Service   | Base class for popup components     | ng-hub-ui-modal, ng-hub-ui-portal      |
| Transitions     | Smooth animations                   | ng-hub-ui-accordion, ng-hub-ui-modal   |
| Type Guards     | Type validation functions           | ng-hub-ui-stepper                      |
| Pipes           | Template utilities                  | All Hub UI components                  |

## 🤝 Compatibility

-   Angular 16+
-   TypeScript 4.8+
-   Node.js 16+
-   Browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## 🛠️ Development

```bash
git clone https://github.com/carlos-morcillo/ng-hub-ui-utils
cd ng-hub-ui-utils
npm install
npm run build
npm run test
```

### Available Scripts

```bash
npm run build:lib        # Build library
npm run test:unit        # Unit tests
npm run test:e2e         # End-to-end tests
npm run lint             # Linting
npm run format           # Format code
```

## 🧪 Testing

```typescript
import { TestBed } from '@angular/core/testing';
import { ScrollBar, toInteger, isString, GetPipe } from 'ng-hub-ui-utils';

describe('ng-hub-ui-utils', () => {
	it('should convert values safely', () => {
		expect(toInteger('42')).toBe(42);
		expect(toInteger('invalid')).toBe(NaN);
		expect(isString('hello')).toBe(true);
		expect(isString(42)).toBe(false);
	});

	it('should manage scrollbar', () => {
		const scrollBar = TestBed.inject(ScrollBar);
		const reverter = scrollBar.hide();

		expect(typeof reverter).toBe('function');
		reverter(); // Cleanup
	});

	it('should get nested properties safely', () => {
		const pipe = new GetPipe();
		const obj = { user: { name: 'John' } };

		expect(pipe.transform(obj, 'user.name')).toBe('John');
		expect(pipe.transform(obj, 'user.age', 0)).toBe(0);
	});
});
```

## 📋 Changelog

All notable changes are documented in the [CHANGELOG.md](./CHANGELOG.md), following [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Recent highlights:

- **1.2.1** — Renamed internal i18n files and refreshed `TranslatePipe`; added a test suite for `HubTranslationService`.
- **1.2.0** — Added the i18n system (`HubTranslationService`, `provideHubTranslation`, `TranslatePipe`, translation tokens) plus the `equals`, `interpolateString` and `getValue` utilities.

### External translation services

`HubTranslationService` is intentionally framework-agnostic. Applications using Transloco or ngx-translate can extract a library namespace when the language changes and pass it to `setTranslations()`. Libraries such as Calendar, Stepper and Paginable consume that bridge; their README files document the namespace each expects.

```typescript
// Transloco: hubTranslation.setTranslations(transloco.translateObject('STEPPER'))
// ngx-translate: hubTranslation.setTranslations(translate.instant('STEPPER'))
```

## 🐛 Issues and Support

-   [Report a bug](https://github.com/carlos-morcillo/ng-hub-ui-utils/issues)
-   [Request a feature](https://github.com/carlos-morcillo/ng-hub-ui-utils/issues/new?template=feature_request.md)
-   [Repository](https://github.com/carlos-morcillo/ng-hub-ui-utils)
-   **Author**: [Carlos Morcillo](https://www.carlosmorcillo.com)

## ☕ Support the Project

If Hub UI has been useful to you, consider supporting its development:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat-square&logo=buy-me-a-coffee)](https://buymeacoffee.com/carlosmorcillo)
[![Sponsor](https://img.shields.io/badge/Sponsor-GitHub-red.svg?style=flat-square&logo=github)](https://github.com/sponsors/carlos-morcillo)

Your support helps to:

-   🚀 Keep the project active
-   🐛 Fix bugs faster
-   ✨ Develop new features
-   📚 Improve documentation

## 🤝 Contributions

Contributions are welcome! Please:

1. 🍴 Fork the repository
2. 🌿 Create a branch for your feature (`git checkout -b feature/new-utility`)
3. ✍️ Commit your changes (`git commit -am 'feat: add new utility'`)
4. 📤 Push to the branch (`git push origin feature/new-utility`)
5. 🔄 Open a Pull Request

Check our [contribution guidelines](CONTRIBUTING.md) for more details.

## 📄 License

MIT © Hub UI contributors

```
MIT License

Copyright (c) 2025 Hub UI Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

⭐ **If you like this project, don't forget to give it a star on GitHub!**

[![GitHub stars](https://img.shields.io/github/stars/carlos-morcillo/ng-hub-ui.svg?style=social&label=Star)](https://github.com/carlos-morcillo/ng-hub-ui)
