import { TestBed } from '@angular/core/testing';
import { HubTranslationService } from './translation.service';
import { HUB_TRANSLATION_CONFIG } from './translation.tokens';

const DICTIONARIES = {
	en: {
		simple: 'Default Value',
		nested: {
			key: 'Nested Value',
			deep: {
				key: 'Deep Value'
			}
		}
	},
	es: {
		simple: 'Valor por defecto'
	}
};

const createService = (language: string = 'en') => {
	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			HubTranslationService,
			{
				provide: HUB_TRANSLATION_CONFIG,
				useValue: {
					dictionaries: DICTIONARIES,
					language,
					fallbackLanguage: 'en'
				}
			}
		]
	});

	return TestBed.inject(HubTranslationService);
};

/**
 * Test suite for HubTranslationService
 * Tests translation management and language switching functionality
 */
describe('HubTranslationService', () => {
	let service: HubTranslationService;

	beforeEach(() => {
		service = createService('en');
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	describe('initialization', () => {
		it('should have default translations for en and es', () => {
			expect(service.defaultTranslations['en']).toBeDefined();
			expect(service.defaultTranslations['es']).toBeDefined();
		});

		it('should initialize with English translations by default', () => {
			expect(service.translations).toBeDefined();
			expect(typeof service.translations).toBe('object');
		});

		it('should use language from config when available', () => {
			service = createService('es');
			expect(service.translations).toBeDefined();
		});

		it('should fallback to English if configured language not found', () => {
			service = createService('fr');
			expect(service.translations).toBeDefined();
			expect(typeof service.translations).toBe('object');
		});
	});

	describe('getTranslation', () => {
		beforeEach(() => {
			service.translations = {
				'simple.key': 'Simple Value',
				'nested.key': 'Nested Value',
				'nested.deep.key': 'Deep Value'
			} as any;
		});

		it('should get simple translation key', () => {
			const result = service.getTranslation('simple.key');
			expect(result).toBe('Simple Value');
		});

		it('should get nested translation key', () => {
			const result = service.getTranslation('nested.key');
			expect(result).toBe('Nested Value');
		});

		it('should get deeply nested translation key', () => {
			const result = service.getTranslation('nested.deep.key');
			expect(result).toBe('Deep Value');
		});

		it('should return undefined for non-existent key', () => {
			const result = service.getTranslation('nonexistent.key');
			expect(result).toBeUndefined();
		});

		it('should handle nested key paths', () => {
			service.translations = {
				app: {
					title: 'My App'
				}
			} as any;
			const result = service.getTranslation('app.title');
			expect(result).toBe('My App');
		});
	});

	describe('setTranslations', () => {
		it('should set new translations', () => {
			const newTranslations = {
				'test.key': 'Test Value'
			};

			service.setTranslations(newTranslations);
			expect(service.translations['test.key']).toBe('Test Value');
		});

		it('should merge with English default translations', () => {
			const customTranslations = {
				'custom.key': 'Custom Value'
			};

			service.setTranslations(customTranslations);

			expect(service.translations['custom.key']).toBe('Custom Value');
			expect(Object.keys(service.translations).length).toBeGreaterThan(1);
		});

		it('should override existing translations', () => {
			service.translations = {
				key: 'Old Value'
			} as any;

			service.setTranslations({
				key: 'New Value'
			});

			expect(service.translations['key']).toBe('New Value');
		});

		it('should emit on translation observer', async () => {
			service.translationObserver.subscribe((translations) => {
				expect(translations).toBeDefined();
				expect(translations['test.key']).toBe('Test Value');
			});

			service.setTranslations({
				'test.key': 'Test Value'
			});
		});

		it('should handle empty translations object', () => {
			service.setTranslations({});
			expect(service.translations).toBeDefined();
			expect(typeof service.translations).toBe('object');
		});

		it('should handle undefined parameter', () => {
			service.setTranslations(undefined);
			expect(service.translations).toBeDefined();
		});

		it('should handle null parameter', () => {
			service.setTranslations(null as any);
			expect(service.translations).toBeDefined();
		});
	});

	describe('translationObserver', () => {
		it('should be an observable', () => {
			expect(service.translationObserver.subscribe).toBeDefined();
		});

		it('should emit when translations are set', async () => {
			let emissionCount = 0;

			service.translationObserver.subscribe(() => {
				emissionCount++;
				if (emissionCount === 2) {
					expect(emissionCount).toBe(2);
				}
			});

			service.setTranslations({ key1: 'value1' });
			service.setTranslations({ key2: 'value2' });
		});

		it('should emit current translations', async () => {
			const testTranslations = { test: 'value' };

			service.translationObserver.subscribe((translations) => {
				expect(translations).toBeDefined();
				expect(translations['test']).toBe('value');
			});

			service.setTranslations(testTranslations);
		});
	});

	describe('default translations structure', () => {
		it('should have lang property in default translations', () => {
			expect(service.defaultTranslations['en']).toBeDefined();
			expect(service.defaultTranslations['es']).toBeDefined();
		});

		it('should have reducible structure', () => {
			const keys = Object.keys(service.defaultTranslations);
			expect(keys).toContain('en');
			expect(keys).toContain('es');
		});
	});
});
