import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
	DestroyRef,
	ENVIRONMENT_INITIALIZER,
	EnvironmentProviders,
	inject,
	makeEnvironmentProviders,
	PLATFORM_ID
} from '@angular/core';

/** Class every glass surface carries (ng-hub-ui-ds glass layer). */
const GLASS_SURFACE = '.hub-glass-surface';

/**
 * Makes the sheen of glass surfaces follow the pointer.
 *
 * The glass layer of ng-hub-ui-ds draws the sheen at `--hub-glass-light-x/-y` of each
 * `.hub-glass-surface`, by default just above its top edge, out of sight. This writes those two
 * values, in pixels, on every surface under the pointer (a card and the button on it alike) and
 * drops them when the pointer leaves, so the light only shows where the pointer is. How bright,
 * how wide and what colour it is stay in CSS (`--hub-sys-glass-light-strength`, `-size`,
 * `-color`); with the strength at 0 nothing shows.
 *
 * One passive listener per document and at most one batch of writes per frame. Nothing
 * runs on the server or for a reader who asked for reduced motion.
 *
 * @returns Environment providers to add to the application config.
 *
 * @example
 * ```ts
 * bootstrapApplication(App, { providers: [provideHubGlassLight()] });
 * ```
 */
export function provideHubGlassLight(): EnvironmentProviders {
	// ENVIRONMENT_INITIALIZER rather than provideEnvironmentInitializer(): same effect, and it keeps
	// the library's Angular floor where it is.
	return makeEnvironmentProviders([
		{
			provide: ENVIRONMENT_INITIALIZER,
			multi: true,
			useValue: () => {
				const document = inject(DOCUMENT);
				const view = document.defaultView;

				if (
					!isPlatformBrowser(inject(PLATFORM_ID)) ||
					!view ||
					view.matchMedia?.('(prefers-reduced-motion: reduce)').matches
				) {
					return;
				}

				// Every glass surface under the pointer, innermost first: a button on a card lights both,
				// or the card's light would jump back to its edge whenever the pointer reached the button.
				let lit: HTMLElement[] = [];
				let pending: PointerEvent | null = null;
				let frame = 0;

				const unlight = (surface: HTMLElement) => {
					surface.style.removeProperty('--hub-glass-light-x');
					surface.style.removeProperty('--hub-glass-light-y');
				};

				const clear = () => {
					lit.forEach(unlight);
					lit = [];
				};

				const paint = () => {
					frame = 0;
					const event = pending;
					pending = null;

					const surfaces: HTMLElement[] = [];
					let surface = event?.target instanceof Element ? event.target.closest<HTMLElement>(GLASS_SURFACE) : null;
					while (surface) {
						surfaces.push(surface);
						surface = surface.parentElement?.closest<HTMLElement>(GLASS_SURFACE) ?? null;
					}

					lit.filter((previous) => !surfaces.includes(previous)).forEach(unlight);
					lit = surfaces;

					for (const target of surfaces) {
						const box = target.getBoundingClientRect();
						target.style.setProperty('--hub-glass-light-x', `${event!.clientX - box.left}px`);
						target.style.setProperty('--hub-glass-light-y', `${event!.clientY - box.top}px`);
					}
				};

				const onMove = (event: PointerEvent) => {
					pending = event;
					frame ||= view.requestAnimationFrame(paint);
				};

				document.addEventListener('pointermove', onMove, { passive: true });
				document.documentElement.addEventListener('pointerleave', clear, { passive: true });

				inject(DestroyRef).onDestroy(() => {
					document.removeEventListener('pointermove', onMove);
					document.documentElement.removeEventListener('pointerleave', clear);
					view.cancelAnimationFrame(frame);
					clear();
				});
			}
		}
	]);
}
