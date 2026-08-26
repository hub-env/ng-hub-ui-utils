import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { OverlayService } from './overlay-service';
import type { OverlayPosition } from './overlay-position';

@Component({ template: '<span>overlay content</span>' })
class OverlayContentStub {}

/**
 * Contract for the container's clipping behavior. A content-sized overlay
 * (no configured width/height) computes to 0x0 when its content is absolutely
 * positioned, so the stylesheet's `overflow: auto` would clip it into
 * invisibility — the container must opt out of clipping. An explicitly sized
 * overlay keeps the scrollable box.
 */
describe('OverlayRef container sizing contract', () => {
	let service: OverlayService;

	beforeEach(() => {
		service = TestBed.inject(OverlayService);
	});

	function container(): HTMLElement {
		return document.body.querySelector('.hub-overlay-container') as HTMLElement;
	}

	it('leaves a content-sized overlay unclipped', () => {
		const ref = service.create({});
		ref.attach(OverlayContentStub);

		expect(container().style.overflow).toBe('visible');

		ref.dispose();
	});

	it('keeps the scrollable box when the overlay is explicitly sized', () => {
		const ref = service.create({ width: 200 });
		ref.attach(OverlayContentStub);

		expect(container().style.overflow).toBe('');

		ref.dispose();
	});
});

/**
 * An overlay that does not follow its origin is not connected to anything: open a dropdown, scroll
 * the page, and the panel stays where it was while the field it belongs to walks away. Measured on
 * the docs site before this existed, the gap reached 122px after a single scroll.
 *
 * The listener is registered on `window` in the CAPTURE phase on purpose, and that is what these
 * assertions pin: a `scroll` event on an element does not bubble, so a listener on `document`
 * never hears an application that scrolls an inner container rather than the page — which is the
 * shape this very docs site has, and the reason its CDK-backed panels drifted too.
 */
describe('OverlayRef repositioning', () => {
	let service: OverlayService;

	beforeEach(() => {
		service = TestBed.inject(OverlayService);
	});

	function makeStrategy() {
		let applied = 0;

		return {
			strategy: { apply: () => void applied++ } as unknown as OverlayPosition,
			applied: () => applied
		};
	}

	it('re-applies the position when an inner container scrolls, not only the page', async () => {
		const { strategy, applied } = makeStrategy();
		const ref = service.create({ positionStrategy: strategy });
		ref.attach(OverlayContentStub);

		const before = applied();
		const inner = document.createElement('div');
		document.body.appendChild(inner);
		inner.dispatchEvent(new Event('scroll'));
		await new Promise((resolve) => requestAnimationFrame(resolve));

		expect(applied()).toBeGreaterThan(before);
		ref.dispose();
		inner.remove();
	});

	it('re-applies the position on resize', async () => {
		const { strategy, applied } = makeStrategy();
		const ref = service.create({ positionStrategy: strategy });
		ref.attach(OverlayContentStub);

		const before = applied();
		window.dispatchEvent(new Event('resize'));
		await new Promise((resolve) => requestAnimationFrame(resolve));

		expect(applied()).toBeGreaterThan(before);
		ref.dispose();
	});

	it('coalesces a burst of scrolls into a single reposition', async () => {
		const { strategy, applied } = makeStrategy();
		const ref = service.create({ positionStrategy: strategy });
		ref.attach(OverlayContentStub);

		const before = applied();
		for (let i = 0; i < 20; i++) {
			window.dispatchEvent(new Event('scroll'));
		}
		await new Promise((resolve) => requestAnimationFrame(resolve));

		expect(applied() - before).toBe(1);
		ref.dispose();
	});

	it('stops listening once detached, so a closed overlay costs nothing', async () => {
		const { strategy, applied } = makeStrategy();
		const ref = service.create({ positionStrategy: strategy });
		ref.attach(OverlayContentStub);
		ref.detach();

		const after = applied();
		window.dispatchEvent(new Event('scroll'));
		await new Promise((resolve) => requestAnimationFrame(resolve));

		expect(applied()).toBe(after);
		ref.dispose();
	});
});

/**
 * An overlay rarely holds focus: opened from a click, focus stays where it was — over a datepicker
 * the active element is the body. A component listening on its own host therefore never hears
 * Escape, and the panel that swallowed the reader's attention cannot be dismissed with the key
 * everyone reaches for. Angular CDK solved this with a document-level dispatcher; so does this.
 *
 * The stack matters as much as the listener: a dropdown opened from inside a dialog must take
 * Escape for itself and leave the dialog open.
 */
describe('OverlayRef keyboard', () => {
	let service: OverlayService;

	beforeEach(() => {
		service = TestBed.inject(OverlayService);
	});

	function press(key: string): void {
		document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
	}

	it('hears a key pressed with focus nowhere near the overlay', () => {
		const seen: string[] = [];
		const ref = service.create({});
		ref.onKeydown((event) => seen.push(event.key));
		ref.attach(OverlayContentStub);

		document.body.focus();
		press('Escape');

		expect(seen).toEqual(['Escape']);
		ref.dispose();
	});

	it('tells only the topmost overlay, so a nested one does not close its parent', () => {
		const outer: string[] = [];
		const inner: string[] = [];

		const first = service.create({});
		first.onKeydown(() => outer.push('x'));
		first.attach(OverlayContentStub);

		const second = service.create({});
		second.onKeydown(() => inner.push('x'));
		second.attach(OverlayContentStub);

		press('Escape');
		expect(inner).toHaveLength(1);
		expect(outer).toHaveLength(0);

		// with the nested one gone, the key falls through to the one below it
		second.dispose();
		press('Escape');
		expect(outer).toHaveLength(1);

		first.dispose();
	});

	it('stops hearing keys once detached', () => {
		const seen: string[] = [];
		const ref = service.create({});
		ref.onKeydown((event) => seen.push(event.key));
		ref.attach(OverlayContentStub);
		ref.detach();

		press('Escape');

		expect(seen).toHaveLength(0);
		ref.dispose();
	});

	it('costs nothing when no overlay is open', () => {
		const ref = service.create({});
		ref.onKeydown(() => void 0);
		ref.attach(OverlayContentStub);
		ref.dispose();

		// The document listener is released with the last overlay; pressing a key must not throw.
		expect(() => press('Escape')).not.toThrow();
	});
});
