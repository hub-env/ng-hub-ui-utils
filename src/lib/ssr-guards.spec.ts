import { DOCUMENT } from '@angular/common';
import { ApplicationRef, Component, NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { OverlayRef } from './overlay/overlay-ref';
import { ScrollBar } from './scrollbar';
import { hubRunTransition } from './transitions/transition';
import { getTransitionDurationMs } from './transitions/util';
import { getActiveElement, reflow } from './util';

/**
 * The library runs inside a server render as well as a browser, and there `window` does not exist
 * and the document Angular hands over has no view. Each of these used to reach for a global and die
 * with a `ReferenceError` on the way to a prerendered page.
 *
 * A document built with `createHTMLDocument()` is the honest stand-in: a real DOM with a real
 * `body` whose `defaultView` is `null`, exactly like the server's.
 */
function viewlessDocument(): Document {
	return document.implementation.createHTMLDocument('viewless');
}

/** An element that belongs to a document with no view. */
function viewlessElement(doc: Document): HTMLElement {
	const element = doc.createElement('div');
	doc.body.appendChild(element);
	return element;
}

@Component({ template: '<span>overlay content</span>' })
class OverlayContentStub {}

describe('SSR safety of the DOM helpers', () => {
	it('gives an element with no view a transition duration of zero', () => {
		const doc = viewlessDocument();

		expect(doc.defaultView).toBeNull();
		expect(getTransitionDurationMs(viewlessElement(doc))).toBe(0);
	});

	it('runs a transition straight to its end on an element with no view', () => {
		const element = viewlessElement(viewlessDocument());
		const zone = TestBed.inject(NgZone);

		let ended = false;
		let completed = false;

		hubRunTransition(
			zone,
			element,
			() => () => {
				ended = true;
			},
			{ animation: true, runningTransition: 'continue' }
		).subscribe({ complete: () => (completed = true) });

		expect(ended).toBe(true);
		expect(completed).toBe(true);
	});

	it('reflows without reaching for a global document', () => {
		const element = viewlessElement(viewlessDocument());

		expect(reflow(element)).not.toBeNull();
		expect(reflow(null as unknown as HTMLElement)).toBeNull();
	});

	it('accepts a null root and reports no active element', () => {
		// The signature has to admit `null` so a caller that resolved `DOCUMENT` optionally can hand
		// over what it got; before this it was `Document | ShadowRoot`, and passing null did not compile.
		expect(getActiveElement(null)).toBeNull();
	});

	it('hides the scrollbar as a no-op when the document has no view', () => {
		const doc = viewlessDocument();
		TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: doc }] });

		const revert = TestBed.inject(ScrollBar).hide();

		// A measurement it cannot make must leave the page exactly as it found it, rather than
		// locking a prerendered `<body>` at `overflow: hidden` with nothing left to undo it.
		expect(doc.body.style.overflow).toBe('');
		expect(doc.body.style.paddingRight).toBe('');
		expect(() => revert()).not.toThrow();
	});

	it('builds the overlay into the injected document, not the global one', () => {
		const doc = viewlessDocument();

		// Only the document is swapped; everything else is the real application, which is the shape
		// of a server render — a live Angular application over a DOM with no view behind it.
		TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: doc }] });

		const overlay = new OverlayRef({ hasBackdrop: true }, TestBed.inject(ApplicationRef));

		overlay.attach(OverlayContentStub);

		expect(doc.querySelector('.hub-overlay-container')).not.toBeNull();
		expect(doc.querySelector('.hub-overlay-backdrop')).not.toBeNull();
		expect(document.body.querySelector('.hub-overlay-container')).toBeNull();

		overlay.dispose();
	});
});
