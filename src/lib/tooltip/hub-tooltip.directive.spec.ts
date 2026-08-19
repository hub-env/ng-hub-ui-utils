import { Component, Directive, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { HubTooltipDirective } from './hub-tooltip.directive';
import { TooltipDirective } from './tooltip.directive';

/**
 * Stand-in for `[hubDropdown]`, which lives in `ng-hub-ui-buttons` and cannot be
 * imported here without inverting the dependency between the two packages.
 *
 * What matters is reproduced exactly: a directive that also declares `placement`, over a
 * union the tooltip does not share. Angular feeds one attribute to every directive on
 * the element declaring an input of that name, so the two types have to agree — and
 * `'bottom-end'` is not a tooltip placement. That is a compile error, not a runtime one,
 * which is why the guard below is a template that has to build at all.
 */
type StubPlacement = 'top' | 'bottom' | 'bottom-start' | 'bottom-end';

@Directive({ selector: '[stubDropdown]' })
class StubDropdownDirective {
	readonly placement = input<StubPlacement>('bottom-start');
}

@Component({
	standalone: true,
	imports: [StubDropdownDirective, HubTooltipDirective],
	template: `
		<button stubDropdown placement="bottom-end" hubTooltip="More actions" hubTooltipPlacement="bottom">menu</button>
	`
})
class CoexistenceHostComponent {}

/** A component of its own that owns a `tooltip` input, as `<hub-badge>` does. */
@Component({
	selector: 'stub-badge',
	standalone: true,
	template: `<span class="stub-badge__content">{{ tooltip() }}</span>`
})
class StubBadgeComponent {
	readonly tooltip = input('');
}

@Component({
	standalone: true,
	imports: [StubBadgeComponent, HubTooltipDirective, TooltipDirective],
	template: `<stub-badge tooltip="from the input" />`
})
class BadgeHostComponent {}

describe('HubTooltipDirective', () => {
	/**
	 * The defect that blocked a build: a menu trigger could not also carry a tooltip,
	 * because both directives claimed `placement` and only one attribute exists. This
	 * test earns its keep at compile time — if the tooltip ever re-declares the bare
	 * name, the template stops building and the suite never runs.
	 */
	it('coexists with a directive that owns the bare placement input', () => {
		const fixture = TestBed.configureTestingModule({ imports: [CoexistenceHostComponent] }).createComponent(
			CoexistenceHostComponent
		);
		fixture.detectChanges();

		const button = fixture.nativeElement.querySelector('button') as HTMLElement;
		expect(button).toBeTruthy();

		// Each directive kept its own placement, which is the point of the prefix.
		const dropdown = fixture.debugElement.children[0].injector.get(StubDropdownDirective);
		const tooltip = fixture.debugElement.children[0].injector.get(HubTooltipDirective);

		expect(dropdown.placement()).toBe('bottom-end');
		expect(tooltip.placement()).toBe('bottom');
	});

	/**
	 * A component that owns a `tooltip` input must keep it to itself. The old selector
	 * matched the same attribute, so the element got the component's own tooltip and a
	 * directive-driven one on top of it.
	 */
	it('does not attach itself to a component that owns a tooltip input', () => {
		const fixture = TestBed.configureTestingModule({ imports: [BadgeHostComponent] }).createComponent(BadgeHostComponent);
		fixture.detectChanges();

		const badge = fixture.debugElement.children[0];

		// The input reached the component…
		expect(badge.injector.get(StubBadgeComponent).tooltip()).toBe('from the input');

		// …and the prefixed directive stayed out of it.
		expect(badge.injector.get(HubTooltipDirective, null)).toBeNull();
	});

	it('reads its text and options from the prefixed attributes', () => {
		@Component({
			standalone: true,
			imports: [HubTooltipDirective],
			template: `<span
				hubTooltip="Label"
				hubTooltipPlacement="right"
				[hubTooltipDelay]="0"
				[hubTooltipOffset]="4"
			></span>`
		})
		class OptionsHostComponent {}

		const fixture = TestBed.configureTestingModule({ imports: [OptionsHostComponent] }).createComponent(
			OptionsHostComponent
		);
		fixture.detectChanges();

		const directive = fixture.debugElement.children[0].injector.get(HubTooltipDirective);

		expect(directive.text()).toBe('Label');
		expect(directive.placement()).toBe('right');
		expect(directive.delay()).toBe(0);
		expect(directive.offset()).toBe(4);
	});
});

/**
 * The failure that is invisible until someone forgets the stylesheet.
 *
 * `HubTooltipController` appends its element to `<body>` and gives it PAGE coordinates. A
 * static element ignores those, so without `styles/tooltip` the tooltip lands in normal flow
 * at the end of the document — below the fold — and the page grows a scrollbar that flickers
 * in and out as the pointer crosses a truncated label. Measured in a real app: 24px of extra
 * document height per hover.
 *
 * jsdom is the right bench for this precisely because it never loads the sheet: what it sees
 * is exactly what an app that skipped the import sees.
 */
describe('HubTooltipController without its stylesheet', () => {
	@Component({
		standalone: true,
		imports: [HubTooltipDirective],
		template: `<button hubTooltip="Products and services" [hubTooltipDelay]="0">Products…</button>`
	})
	class BareHostComponent {}

	afterEach(() => {
		document.querySelectorAll('.hub-tooltip').forEach((el) => el.remove());
	});

	it('takes the tooltip out of flow itself, so a missing sheet cannot move the layout', () => {
		const fixture = TestBed.configureTestingModule({ imports: [BareHostComponent] }).createComponent(BareHostComponent);
		fixture.detectChanges();

		const button = fixture.nativeElement.querySelector('button') as HTMLElement;
		button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
		fixture.detectChanges();

		const tooltip = document.querySelector('.hub-tooltip') as HTMLElement | null;

		expect(tooltip).toBeTruthy();
		// `absolute`, not `fixed`: the controller writes `top + scrollY`, so the coordinates are
		// the page's. Viewport positioning would misplace it by the scroll offset.
		expect(tooltip!.style.position).toBe('absolute');
		expect(getComputedStyle(tooltip!).position).not.toBe('static');
	});
});
