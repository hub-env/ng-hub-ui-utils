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
 * `.hub-glass-surface`, the top edge by default. This writes those two values, in pixels, on
 * the surface under the pointer and drops them when the pointer leaves it, so the light slides
 * back to the edge. How bright, how wide and what colour it is stay in CSS
 * (`--hub-sys-glass-light-strength`, `-size`, `-color`); with the strength at 0 nothing shows.
 *
 * One passive listener per document and at most one write per frame, on one element. Nothing
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

				let lit: HTMLElement | null = null;
				let pending: PointerEvent | null = null;
				let frame = 0;

				const clear = () => {
					lit?.style.removeProperty('--hub-glass-light-x');
					lit?.style.removeProperty('--hub-glass-light-y');
					lit = null;
				};

				const paint = () => {
					frame = 0;
					const event = pending;
					pending = null;
					const target = event?.target instanceof Element ? event.target.closest<HTMLElement>(GLASS_SURFACE) : null;

					if (target !== lit) {
						clear();
					}

					if (!event || !target) {
						return;
					}

					const box = target.getBoundingClientRect();
					target.style.setProperty('--hub-glass-light-x', `${event.clientX - box.left}px`);
					target.style.setProperty('--hub-glass-light-y', `${event.clientY - box.top}px`);
					lit = target;
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
