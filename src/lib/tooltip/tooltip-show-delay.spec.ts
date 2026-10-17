import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { HubTooltipDirective } from './hub-tooltip.directive';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const bubble = (): HTMLElement | null => document.querySelector('.hub-tooltip');

@Component({
	standalone: true,
	imports: [HubTooltipDirective],
	template: `<button hubTooltip="Copy" [hubTooltipShowDelay]="120">copy</button>`
})
class DelayedHostComponent {}

/**
 * An icon-only button that names itself in a tooltip should not flash a label every time
 * the pointer crosses it: the label waits for a hover that stays. Keyboard focus is a
 * deliberate gesture and gets the label at once, delay or not.
 */
describe('HubTooltipDirective show delay', () => {
	let button: HTMLElement;

	beforeEach(() => {
		const fixture = TestBed.configureTestingModule({ imports: [DelayedHostComponent] }).createComponent(DelayedHostComponent);
		fixture.detectChanges();
		button = fixture.nativeElement.querySelector('button');
	});

	afterEach(() => document.querySelectorAll('.hub-tooltip').forEach((el) => el.remove()));

	it('waits for a sustained hover before opening', async () => {
		button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
		expect(bubble()).toBeNull();

		await wait(160);

		expect(bubble()?.textContent).toContain('Copy');
	});

	it('does not open when the pointer leaves before the delay', async () => {
		button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
		await wait(40);
		button.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

		await wait(160);

		expect(bubble()).toBeNull();
	});

	it('opens at once on keyboard focus', () => {
		button.dispatchEvent(new FocusEvent('focus'));

		expect(bubble()).not.toBeNull();
	});
});
