import type { MockedObject } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, BehaviorSubject, delay } from 'rxjs';
import { UnwrapAsyncPipe } from './unwrap-async.pipe';

/**
 * Awaits a real timer so a pending asynchronous emission is delivered.
 *
 * The assertions below must be reached *inside* the test body. A bare `setTimeout(() => expect(…))`
 * runs after the test has already returned, so `afterEach` destroys the pipe first and the assertion
 * either throws unhandled or reads a torn-down value — which made this suite fail intermittently.
 *
 * @param ms - Milliseconds to wait.
 * @returns A promise resolved once the timer fires.
 */
const tick = (ms = 10): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Test suite for UnwrapAsyncPipe
 * Tests the unwrapping functionality for Observable and non-Observable values
 */
describe('UnwrapAsyncPipe', () => {
	let pipe: UnwrapAsyncPipe;
	let changeDetectorRef: MockedObject<ChangeDetectorRef>;

	beforeEach(() => {
		changeDetectorRef = {
			markForCheck: vi.fn().mockName('ChangeDetectorRef.markForCheck')
		} as unknown as MockedObject<ChangeDetectorRef>;

		TestBed.configureTestingModule({
			providers: [{ provide: ChangeDetectorRef, useValue: changeDetectorRef }]
		});
		pipe = TestBed.runInInjectionContext(() => new UnwrapAsyncPipe());
	});

	afterEach(() => {
		pipe.ngOnDestroy();
	});

	it('should create an instance', () => {
		expect(pipe).toBeTruthy();
	});

	describe('transform', () => {
		it('should return the value directly if not an Observable', () => {
			const value = 'test value';
			const result = pipe.transform(value);
			expect(result).toBe(value);
			expect(pipe.value).toBe(value);
		});

		it('should handle number values', () => {
			const value = 42;
			const result = pipe.transform(value);
			expect(result).toBe(value);
		});

		it('should handle object values', () => {
			const value = { key: 'value' };
			const result = pipe.transform(value);
			expect(result).toBe(value);
		});

		it('should handle null values', () => {
			const result = pipe.transform(null);
			expect(result).toBe(null);
		});

		it('should unwrap Observable values', async () => {
			const observableValue = of('observable value');
			pipe.transform(observableValue);

			await tick();
			expect(pipe.value).toBe('observable value');
		});

		it('should handle Subject emissions', async () => {
			const subject = new Subject<string>();
			pipe.transform(subject);

			subject.next('subject value');

			await tick();
			expect(pipe.value).toBe('subject value');
		});

		it('should handle BehaviorSubject with initial value', async () => {
			const behaviorSubject = new BehaviorSubject('initial');
			pipe.transform(behaviorSubject);

			await tick();
			expect(pipe.value).toBe('initial');
		});

		it('should update value when BehaviorSubject emits new value', async () => {
			const behaviorSubject = new BehaviorSubject('initial');
			pipe.transform(behaviorSubject);

			await tick();
			expect(pipe.value).toBe('initial');

			behaviorSubject.next('updated');

			await tick();
			expect(pipe.value).toBe('updated');
		});

		it('should unsubscribe from previous Observable when new Observable is provided', async () => {
			const subject1 = new Subject<string>();
			const subject2 = new Subject<string>();

			pipe.transform(subject1);
			const firstSubscription = pipe.subscription;

			pipe.transform(subject2);

			expect(firstSubscription).not.toBe(pipe.subscription);
			expect(firstSubscription?.closed).toBe(true);

			subject1.next('should not update');
			subject2.next('should update');

			await tick();
			expect(pipe.value).toBe('should update');
		});

		it('should handle multiple Observable emissions', async () => {
			const subject = new Subject<number>();
			pipe.transform(subject);

			subject.next(1);
			await tick();
			expect(pipe.value).toBe(1);

			subject.next(2);
			await tick();
			expect(pipe.value).toBe(2);

			subject.next(3);
			await tick();
			expect(pipe.value).toBe(3);
		});

		it('should handle Observable with delayed emission', async () => {
			const delayedObservable = of('delayed').pipe(delay(50));
			pipe.transform(delayedObservable);

			expect(pipe.value).toBe(null);

			await tick(100);
			expect(pipe.value).toBe('delayed');
		});

		it('should return null initially for Observable that has not emitted', () => {
			const subject = new Subject<string>();
			const result = pipe.transform(subject);
			expect(result).toBe(null);
		});

		it('should handle switching from Observable to non-Observable value', async () => {
			const subject = new Subject<string>();
			pipe.transform(subject);

			subject.next('observable value');

			await tick();
			expect(pipe.value).toBe('observable value');

			const oldSubscription = pipe.subscription;

			pipe.transform('direct value');

			expect(pipe.value).toBe('direct value');
			expect(oldSubscription?.closed).toBe(true);
			expect(pipe.subscription).toBe(null);
		});
	});

	describe('ngOnDestroy', () => {
		it('should unsubscribe from Observable on destroy', async () => {
			const subject = new Subject<string>();
			pipe.transform(subject);

			await tick();
			const subscription = pipe.subscription;
			expect(subscription).not.toBe(null);

			pipe.ngOnDestroy();

			expect(subscription?.closed).toBe(true);
			expect(pipe.subscription).toBe(null);
		});

		it('should not throw error when destroying without subscription', () => {
			expect(() => pipe.ngOnDestroy()).not.toThrow();
		});

		it('should handle multiple destroy calls', async () => {
			const subject = new Subject<string>();
			pipe.transform(subject);

			await tick();
			pipe.ngOnDestroy();
			expect(() => pipe.ngOnDestroy()).not.toThrow();
		});
	});
});
