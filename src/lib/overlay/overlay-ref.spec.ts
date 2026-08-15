import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { OverlayService } from './overlay-service';

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
