import { inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/** Type for the callback used to revert the scrollbar. */
export type ScrollbarReverter = () => void;

/**
 * Utility to handle the scrollbar.
 *
 * It allows to hide the scrollbar and compensate the lack of a vertical scrollbar
 * by adding an equivalent padding on the right of the body, and to revert this change.
 */
@Injectable({ providedIn: 'root' })
export class ScrollBar {
	private _document = inject(DOCUMENT);

	/**
	 * To be called to hide a potential vertical scrollbar:
	 * - if a scrollbar is there and has a width greater than 0, adds some compensation
	 * padding to the body to keep the same layout as when the scrollbar is there
	 * - adds overflow: hidden
	 *
	 * @return a callback used to revert the change
	 */
	hide(): ScrollbarReverter {
		// Resolved from the injected document rather than from the global: on the server there is
		// no `window` at all, and the document Angular hands over has no view either, so the whole
		// measurement is meaningless there and the caller gets a no-op undo instead of a crash.
		const view = this._document.defaultView;
		if (!view) {
			return () => undefined;
		}

		const scrollbarWidth = Math.abs(view.innerWidth - this._document.documentElement.clientWidth);
		const body = this._document.body;
		const bodyStyle = body.style;
		const { overflow, paddingRight } = bodyStyle;
		if (scrollbarWidth > 0) {
			const actualPadding = parseFloat(view.getComputedStyle(body).paddingRight);
			bodyStyle.paddingRight = `${actualPadding + scrollbarWidth}px`;
		}
		bodyStyle.overflow = 'hidden';
		return () => {
			if (scrollbarWidth > 0) {
				bodyStyle.paddingRight = paddingRight;
			}
			bodyStyle.overflow = overflow;
		};
	}
}
