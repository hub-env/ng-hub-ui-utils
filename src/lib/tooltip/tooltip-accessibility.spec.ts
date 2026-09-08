import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { HubTooltipDirective } from './hub-tooltip.directive';
import { HubOverflowTooltipDirective } from './overflow-tooltip.directive';
import { hubTooltipAdapter } from './tooltip-adapter';

/** Lets a test wait for the controller's own timers without faking the clock. */
const tick = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Reveals the tooltip the way a pointer does. */
const hover = (el: HTMLElement): void => {
	el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
};

/** Leaves the host the way a pointer does. */
const unhover = (el: HTMLElement): void => {
	el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
};

const bubble = (): HTMLElement | null => document.querySelector('.hub-tooltip');

/**
 * The tooltip existed for pointers only: the bubble carried no `role` and no `id`, and the
 * host was never pointed at it, so on an icon-only button the label was invisible to a
 * screen reader — the consumer had to write an `aria-label` of their own to say the same
 * thing twice. There was no keyboard dismissal either, and the label evaporated the moment
 * the pointer left the host, so a long one could not be read at all.
 *
 * All four entry points build the same `HubTooltipController`, so all four are checked
 * here: a fix that only reached the directive would leave every sibling library's tooltip
 * — which arrives through the adapter — exactly as it was.
 */
describe('Tooltip accessibility', () => {
	afterEach(() => {
		document.querySelectorAll('.hub-tooltip').forEach((el) => el.remove());
	});

	describe('[hubTooltip]', () => {
		@Component({
			standalone: true,
			imports: [HubTooltipDirective],
			template: `<button hubTooltip="Delete invoice" [hubTooltipDelay]="0">✕</button>`
		})
		class IconButtonHostComponent {}

		const render = (): HTMLElement => {
			const fixture = TestBed.configureTestingModule({ imports: [IconButtonHostComponent] }).createComponent(
				IconButtonHostComponent
			);
			fixture.detectChanges();
			return fixture.nativeElement.querySelector('button') as HTMLElement;
		};

		it('describes the host with a role=tooltip bubble while it is on screen', async () => {
			const button = render();

			hover(button);

			const tip = bubble();
			expect(tip).toBeTruthy();
			expect(tip!.getAttribute('role')).toBe('tooltip');
			expect(tip!.id).toBeTruthy();
			expect(button.getAttribute('aria-describedby')).toBe(tip!.id);
		});

		it('takes the description back with it when it goes', async () => {
			const button = render();

			hover(button);
			expect(button.hasAttribute('aria-describedby')).toBe(true);

			unhover(button);
			await tick(200);

			expect(bubble()).toBeNull();
			expect(button.hasAttribute('aria-describedby')).toBe(false);
		});

		it('is dismissed by Escape without moving the pointer or the focus', async () => {
			const button = render();

			hover(button);
			expect(bubble()).toBeTruthy();

			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

			// The fade starts at once; the element and the description go with it.
			expect(bubble()!.classList.contains('hub-tooltip--show')).toBe(false);
			await tick(20);
			expect(bubble()).toBeNull();
			expect(button.hasAttribute('aria-describedby')).toBe(false);
		});

		it('survives the trip of the pointer from the host onto the bubble', async () => {
			const button = render();

			hover(button);
			const tip = bubble()!;

			// The pointer crosses the gap the offset opens: it leaves the host, and lands on
			// the label a moment later. The label has to still be there when it does.
			unhover(button);
			await tick(20);
			expect(bubble()).toBe(tip);
			hover(tip);

			await tick(200);
			expect(bubble()).toBe(tip);
			expect(tip.classList.contains('hub-tooltip--show')).toBe(true);
		});

		it('leaves a description the consumer wrote exactly as it found it', async () => {
			@Component({
				standalone: true,
				imports: [HubTooltipDirective],
				template: `<button hubTooltip="Delete invoice" [hubTooltipDelay]="0" aria-describedby="own-hint">✕</button>`
			})
			class DescribedHostComponent {}

			const fixture = TestBed.configureTestingModule({ imports: [DescribedHostComponent] }).createComponent(
				DescribedHostComponent
			);
			fixture.detectChanges();
			const button = fixture.nativeElement.querySelector('button') as HTMLElement;

			hover(button);
			expect(button.getAttribute('aria-describedby')).toBe(`own-hint ${bubble()!.id}`);

			unhover(button);
			await tick(200);
			expect(button.getAttribute('aria-describedby')).toBe('own-hint');
		});
	});

	describe('hubTooltipAdapter', () => {
		it('describes the host of every sibling library that resolves the tooltip token', () => {
			const host = document.createElement('button');
			document.body.appendChild(host);

			const handle = hubTooltipAdapter.attach(host, 'Delete invoice', { delay: 0 });
			hover(host);

			expect(bubble()!.getAttribute('role')).toBe('tooltip');
			expect(host.getAttribute('aria-describedby')).toBe(bubble()!.id);

			handle.destroy();
			expect(host.hasAttribute('aria-describedby')).toBe(false);
			host.remove();
		});
	});

	describe('[hubOverflowTooltip]', () => {
		@Component({
			standalone: true,
			imports: [HubOverflowTooltipDirective],
			template: `<span hubOverflowTooltip="Products and services">Products and services</span>`
		})
		class TruncatedHostComponent {}

		it('describes the truncated label it stands in for', async () => {
			const fixture = TestBed.configureTestingModule({ imports: [TruncatedHostComponent] }).createComponent(
				TruncatedHostComponent
			);
			const label = fixture.nativeElement.querySelector('span') as HTMLElement;

			// jsdom lays nothing out, so truncation has to be stated rather than measured.
			Object.defineProperty(label, 'scrollWidth', { value: 320, configurable: true });
			Object.defineProperty(label, 'clientWidth', { value: 80, configurable: true });

			fixture.detectChanges();
			await fixture.whenStable();
			fixture.detectChanges();

			hover(label);

			expect(bubble()!.getAttribute('role')).toBe('tooltip');
			expect(label.getAttribute('aria-describedby')).toBe(bubble()!.id);
		});
	});
});
