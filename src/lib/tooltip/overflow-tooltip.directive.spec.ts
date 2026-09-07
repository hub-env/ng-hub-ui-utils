import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HubOverflowTooltipDirective } from './overflow-tooltip.directive';
import { HUB_TOOLTIP_ADAPTER } from './tooltip.token';
import { HubTooltipAdapter, HubTooltipHandle } from './tooltip.types';

/**
 * The element that is hovered and the element that is measured are two different questions,
 * and `hubOverflowTooltipMeasure` is what lets them have two different answers.
 *
 * jsdom lays nothing out, so `scrollWidth` and `clientWidth` are zero on everything. They are
 * stubbed per element here, which is the only part of the truncation the browser would have
 * decided anyway — the directive's own job is to ask the right element.
 */

/** Records what the directive attached and every label it pushed afterwards. */
class RecordingAdapter implements HubTooltipAdapter {
	host: HTMLElement | null = null;
	labels: string[] = [];

	attach(host: HTMLElement, text: string): HubTooltipHandle {
		this.host = host;
		this.labels.push(text);
		return {
			update: (next: string) => this.labels.push(next),
			destroy: () => {}
		};
	}

	/** The label as it stands after everything the directive has pushed. */
	get label(): string {
		return this.labels[this.labels.length - 1] ?? '';
	}
}

/** Fakes the layout jsdom does not do: `width` of content vs `width` of the box. */
function stubWidths(el: HTMLElement, scrollWidth: number, clientWidth: number): void {
	Object.defineProperty(el, 'scrollWidth', { value: scrollWidth, configurable: true });
	Object.defineProperty(el, 'clientWidth', { value: clientWidth, configurable: true });
}

@Component({
	selector: 'hub-chip-host',
	standalone: true,
	imports: [HubOverflowTooltipDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="chip" [hubOverflowTooltip]="label()" [hubOverflowTooltipMeasure]="measure()">
			<span class="chip__icon">•</span>
			<span class="chip__title">{{ label() }}</span>
		</div>
	`
})
class ChipHostComponent {
	readonly label = signal('Quarterly planning review');
	readonly measure = signal<string | undefined>('.chip__title');
}

describe('HubOverflowTooltipDirective — where it measures', () => {
	let fixture: ComponentFixture<ChipHostComponent>;
	let adapter: RecordingAdapter;

	function chip(): HTMLElement {
		return (fixture.nativeElement as HTMLElement).querySelector('.chip') as HTMLElement;
	}

	function title(): HTMLElement {
		return (fixture.nativeElement as HTMLElement).querySelector('.chip__title') as HTMLElement;
	}

	/** Renders, lets `afterNextRender` run, and flushes the effect that feeds the label. */
	async function render(): Promise<void> {
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();
		await fixture.whenStable();
	}

	beforeEach(async () => {
		adapter = new RecordingAdapter();
		await TestBed.configureTestingModule({
			imports: [ChipHostComponent],
			providers: [{ provide: HUB_TOOLTIP_ADAPTER, useValue: adapter }]
		}).compileComponents();

		fixture = TestBed.createComponent(ChipHostComponent);
	});

	it('attaches the tooltip to the host, so the whole control is the hover area', async () => {
		await render();

		// Not the measured box: a pointer over the icon, or over any other part of the chip,
		// must get the same tooltip.
		expect(adapter.host).toBe(chip());
	});

	it('speaks when the measured box is truncated, even though the host is not', async () => {
		fixture.detectChanges();
		// The chip fits its own content — it is the title inside that is cut. Measuring the
		// host would report no truncation and the tooltip would never appear.
		stubWidths(chip(), 200, 200);
		stubWidths(title(), 400, 120);
		await render();

		expect(adapter.label).toBe('Quarterly planning review');
	});

	it('stays quiet when the measured box fits, even though the host overflows', async () => {
		fixture.detectChanges();
		stubWidths(chip(), 400, 120);
		stubWidths(title(), 100, 100);
		await render();

		expect(adapter.label).toBe('');
	});

	it('measures the host when no selector is given, as it always has', async () => {
		fixture.componentInstance.measure.set(undefined);
		fixture.detectChanges();
		stubWidths(chip(), 400, 120);
		stubWidths(title(), 100, 100);
		await render();

		expect(adapter.label).toBe('Quarterly planning review');
	});

	it('falls back to the host when the selector matches nothing', async () => {
		fixture.componentInstance.measure.set('.not-here');
		fixture.detectChanges();
		stubWidths(chip(), 400, 120);
		stubWidths(title(), 100, 100);
		await render();

		// Quietly measuring nothing would retire the tooltip with no way to notice.
		expect(adapter.label).toBe('Quarterly planning review');
	});
});
