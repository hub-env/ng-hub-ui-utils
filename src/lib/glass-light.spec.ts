import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { compile } from 'sass';

import { OverlayService } from './overlay/overlay-service';
import { provideHubGlassLight } from './glass-light';

@Component({ template: '<span>content</span>' })
class ContentStub {}

/**
 * The sheen of a glass surface follows the pointer through two custom properties written on the
 * surface under it. jsdom has no layout, so the frame and the rect are stubbed: what is fixed here
 * is who gets the values, when they are dropped, and that nothing is installed where it must not be.
 */
describe('provideHubGlassLight', () => {
	let frames: FrameRequestCallback[];

	/** Appends a surface whose rect starts at (left, top). */
	function surface(left: number, top: number): HTMLElement {
		const host = document.createElement('div');
		host.className = 'hub-glass-surface';
		host.appendChild(document.createElement('span'));
		host.getBoundingClientRect = () => ({ left, top }) as DOMRect;
		document.body.appendChild(host);
		return host;
	}

	function move(target: Element, clientX: number, clientY: number): void {
		target.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX, clientY }));
	}

	/** Runs the frame the listener asked for, as the browser would. */
	function flushFrame(): void {
		frames.splice(0).forEach((frame) => frame(0));
	}

	function start(): void {
		TestBed.configureTestingModule({ providers: [provideHubGlassLight()] });
		TestBed.inject(OverlayService);
	}

	beforeEach(() => {
		frames = [];
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
		vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
	});

	afterEach(() => {
		TestBed.resetTestingModule();
		document.body.innerHTML = '';
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('writes the pointer position relative to the surface after a frame', () => {
		start();
		const glass = surface(100, 50);

		move(glass.firstElementChild!, 130, 90);
		expect(glass.style.getPropertyValue('--hub-glass-light-x')).toBe('');
		flushFrame();

		expect(glass.style.getPropertyValue('--hub-glass-light-x')).toBe('30px');
		expect(glass.style.getPropertyValue('--hub-glass-light-y')).toBe('40px');
	});

	it('asks for one frame however many moves come before it', () => {
		start();
		const glass = surface(0, 0);

		move(glass, 1, 1);
		move(glass, 2, 2);

		expect(frames).toHaveLength(1);
		flushFrame();
		expect(glass.style.getPropertyValue('--hub-glass-light-x')).toBe('2px');
	});

	it('clears the first surface when the pointer moves to another', () => {
		start();
		const first = surface(0, 0);
		const second = surface(10, 10);

		move(first, 5, 5);
		flushFrame();
		move(second, 20, 20);
		flushFrame();

		expect(first.style.getPropertyValue('--hub-glass-light-x')).toBe('');
		expect(first.style.getPropertyValue('--hub-glass-light-y')).toBe('');
		expect(second.style.getPropertyValue('--hub-glass-light-x')).toBe('10px');
	});

	it('lights every glass surface under the pointer, each in its own coordinates', () => {
		start();
		const card = surface(100, 50);
		const button = card.appendChild(surface(120, 70));

		move(button.firstElementChild!, 130, 90);
		flushFrame();

		// The card used to lose its light here and snap back to its edge.
		expect(button.style.getPropertyValue('--hub-glass-light-x')).toBe('10px');
		expect(card.style.getPropertyValue('--hub-glass-light-x')).toBe('30px');
		expect(card.style.getPropertyValue('--hub-glass-light-y')).toBe('40px');
	});

	it('keeps the outer surface lit and clears the inner one when the pointer leaves the inner one', () => {
		start();
		const card = surface(0, 0);
		const button = card.appendChild(surface(10, 10));

		move(button, 15, 15);
		flushFrame();
		move(card, 40, 40);
		flushFrame();

		expect(button.style.getPropertyValue('--hub-glass-light-x')).toBe('');
		expect(card.style.getPropertyValue('--hub-glass-light-x')).toBe('40px');
	});

	it('clears the surface when the pointer moves onto something that is not glass', () => {
		start();
		const glass = surface(0, 0);
		const plain = document.body.appendChild(document.createElement('p'));

		move(glass, 5, 5);
		flushFrame();
		move(plain, 500, 500);
		flushFrame();

		expect(glass.style.getPropertyValue('--hub-glass-light-x')).toBe('');
	});

	it('clears the surface when the pointer leaves the document', () => {
		start();
		const glass = surface(0, 0);

		move(glass, 5, 5);
		flushFrame();
		document.documentElement.dispatchEvent(new Event('pointerleave'));

		expect(glass.style.getPropertyValue('--hub-glass-light-y')).toBe('');
	});

	it('installs nothing when the reader asked for reduced motion', () => {
		vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
		start();
		const glass = surface(0, 0);

		move(glass, 5, 5);

		expect(frames).toHaveLength(0);
		expect(glass.style.getPropertyValue('--hub-glass-light-x')).toBe('');
	});

	it('removes its listeners and the values when the injector is destroyed', () => {
		start();
		const glass = surface(0, 0);
		move(glass, 5, 5);
		flushFrame();

		TestBed.resetTestingModule();
		move(glass, 9, 9);

		expect(frames).toHaveLength(0);
		expect(glass.style.getPropertyValue('--hub-glass-light-x')).toBe('');
	});
});

describe('overlay container as a glass surface', () => {
	it('carries the class the glass layer keys on', () => {
		const ref = TestBed.inject(OverlayService).create({});
		ref.attach(ContentStub);

		const container = document.body.querySelector('.hub-overlay-container');
		expect(container?.classList).toContain('hub-glass-surface');

		ref.dispose();
	});

	const sheet = compile('projects/utils/src/lib/styles/overlay.scss').css;

	it('reads the glass values with opaque fallbacks', () => {
		expect(sheet).toContain('var(--hub-sys-glass-opacity, 100%)');
		expect(sheet).toContain('backdrop-filter: var(--hub-sys-glass-filter, none)');
		expect(sheet).toContain('var(--hub-sys-glass-rim, 0 0 rgba(0, 0, 0, 0))');
	});

	it('steps aside when a child already dresses itself as glass', () => {
		const start = sheet.indexOf('.hub-overlay-container:has(> .hub-glass-surface) {');
		expect(start).toBeGreaterThan(-1);
		const body = sheet.slice(start, sheet.indexOf('}', start));

		expect(body).toContain('background: none');
		expect(body).toContain('backdrop-filter: none');
		expect(body).toContain('box-shadow: none');
	});
});
