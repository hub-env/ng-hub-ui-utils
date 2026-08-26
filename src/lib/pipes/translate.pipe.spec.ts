import type { MockedObject } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { HubTranslationService } from '../i18n/translation.service';
import { TranslatePipe } from './translate.pipe';

/**
 * Test suite for TranslatePipe
 * Tests the translation functionality with parameter interpolation
 */
describe('TranslatePipe', () => {
	let pipe: TranslatePipe;
	let translationService: MockedObject<HubTranslationService>;
	let changeDetectorRef: MockedObject<ChangeDetectorRef>;
	let translationObserver: Subject<any>;

	beforeEach(() => {
		translationObserver = new Subject();

		translationService = {
			getTranslation: vi.fn().mockName('HubTranslationService.getTranslation')
		} as unknown as MockedObject<HubTranslationService>;
		translationService.translationObserver = translationObserver.asObservable();

		changeDetectorRef = {
			markForCheck: vi.fn().mockName('ChangeDetectorRef.markForCheck')
		} as unknown as MockedObject<ChangeDetectorRef>;

		TestBed.configureTestingModule({
			providers: [
				{ provide: HubTranslationService, useValue: translationService },
				{ provide: ChangeDetectorRef, useValue: changeDetectorRef }
			]
		});

		pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
	});

	afterEach(() => {
		pipe.ngOnDestroy();
	});

	it('should create an instance', () => {
		expect(pipe).toBeTruthy();
	});

	describe('transform', () => {
		it('should return empty string for empty query', () => {
			const result = pipe.transform('');
			expect(result).toBe('');
		});

		it('should return the query itself for null query', () => {
			const result = pipe.transform(null as any);
			expect(result).toBe(null);
		});

		it('should return the query itself for undefined query', () => {
			const result = pipe.transform(undefined as any);
			expect(result).toBe(undefined);
		});

		it('should translate simple key', () => {
			translationService.getTranslation.mockReturnValue('Hello World');
			const result = pipe.transform('greeting');
			expect(result).toBe('Hello World');
			expect(translationService.getTranslation).toHaveBeenCalledWith('greeting');
		});

		it('should return key if translation not found', () => {
			translationService.getTranslation.mockReturnValue(undefined);
			const result = pipe.transform('unknown.key');
			// When translation is undefined, interpolateString returns empty string
			expect(result).toBe('');
		});

		it('should cache translation for same key', () => {
			translationService.getTranslation.mockReturnValue('Cached Value');
			pipe.transform('test.key');
			translationService.getTranslation.mockClear();

			const result = pipe.transform('test.key');
			expect(result).toBe('Cached Value');
			expect(translationService.getTranslation).not.toHaveBeenCalled();
		});

		it('should interpolate parameters as object', () => {
			translationService.getTranslation.mockReturnValue('Hello {{name}}!');
			const result = pipe.transform('greeting', { name: 'John' });
			expect(result).toBe('Hello John!');
		});

		it('should parse string parameters to object', () => {
			translationService.getTranslation.mockReturnValue('Count: {{count}}');
			const result = pipe.transform('message', '{count:5}');
			expect(result).toBe('Count: 5');
		});

		it('should handle string parameters with quotes', () => {
			translationService.getTranslation.mockReturnValue('Name: {{name}}');
			const result = pipe.transform('message', "{name:'Alice'}");
			expect(result).toBe('Name: Alice');
		});

		it('should handle multiple interpolation parameters', () => {
			translationService.getTranslation.mockReturnValue('{{greeting}} {{name}}!');
			const result = pipe.transform('message', { greeting: 'Hello', name: 'Bob' });
			expect(result).toBe('Hello Bob!');
		});

		it('should throw error for invalid parameter string', () => {
			translationService.getTranslation.mockReturnValue('Test');
			expect(() => {
				pipe.transform('key', 'invalid{json');
			}).toThrow(expect.any(SyntaxError));
		});

		it('should handle array arguments by ignoring them', () => {
			translationService.getTranslation.mockReturnValue('Test');
			const result = pipe.transform('key', [1, 2, 3] as any);
			expect(result).toBe('Test');
		});

		it('should update on translation observer emission', async () => {
			translationService.getTranslation.mockReturnValue('Initial');
			pipe.transform('key');

			translationService.getTranslation.mockReturnValue('Updated');
			translationObserver.next({});

			// The assertion must be reached inside the test body: a bare `setTimeout(() => expect(…))`
			// runs after the test returned, so it throws unhandled once the pipe has been torn down.
			await new Promise<void>((resolve) => setTimeout(resolve, 10));

			expect(pipe.value).toBe('Updated');
			expect(changeDetectorRef.markForCheck).toHaveBeenCalled();
		});

		it('should unsubscribe from previous translation observer', () => {
			translationService.getTranslation.mockReturnValue('Test1');
			pipe.transform('key1');
			const firstSubscription = pipe.translationSubscription;

			translationService.getTranslation.mockReturnValue('Test2');
			pipe.transform('key2');

			expect(firstSubscription?.closed).toBe(true);
		});

		it('should handle changing parameters for same key', () => {
			translationService.getTranslation.mockReturnValue('Value: {{val}}');

			pipe.transform('key', { val: 1 });
			expect(pipe.value).toBe('Value: 1');

			pipe.transform('key', { val: 2 });
			expect(pipe.value).toBe('Value: 2');
		});

		it('should preserve whitespace in interpolated values', () => {
			translationService.getTranslation.mockReturnValue('Text: {{text}}');
			const result = pipe.transform('key', { text: '  spaced  ' });
			expect(result).toBe('Text:   spaced  ');
		});

		it('should handle numeric interpolation parameters', () => {
			translationService.getTranslation.mockReturnValue('{{count}} items');
			const result = pipe.transform('key', { count: 42 });
			expect(result).toBe('42 items');
		});
	});

	describe('updateValue', () => {
		it('should update value and mark for check', () => {
			translationService.getTranslation.mockReturnValue('Updated');
			pipe.updateValue('test.key');

			expect(pipe.value).toBe('Updated');
			expect(pipe.lastKey).toBe('test.key');
			expect(changeDetectorRef.markForCheck).toHaveBeenCalled();
		});

		it('should use key as value if translation returns undefined', () => {
			translationService.getTranslation.mockReturnValue(undefined);
			pipe.updateValue('fallback.key');

			// When translation is undefined, interpolateString returns empty string
			expect(pipe.value).toBe('');
		});
	});

	describe('ngOnDestroy', () => {
		it('should unsubscribe from translation observer', () => {
			translationService.getTranslation.mockReturnValue('Test');
			pipe.transform('key');

			const subscription = pipe.translationSubscription;
			pipe.ngOnDestroy();

			expect(subscription?.closed).toBe(true);
			expect(pipe.translationSubscription).toBeUndefined();
		});

		it('should not throw if no subscription exists', () => {
			expect(() => pipe.ngOnDestroy()).not.toThrow();
		});
	});
});
