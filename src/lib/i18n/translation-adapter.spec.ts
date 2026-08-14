import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { provideHubTranslationAdapter } from './translation-adapter';
import { HubTranslationService } from './translation.service';

describe('provideHubTranslationAdapter', () => {
	it('updates HubTranslationService from an application-wide reactive dictionary', () => {
		const dictionary = new BehaviorSubject<Record<string, unknown>>({ action: 'Save' });
		TestBed.configureTestingModule({ providers: [provideHubTranslationAdapter(() => dictionary)] });
		const translations = TestBed.inject(HubTranslationService);

		dictionary.next({ action: 'Guardar' });

		expect(translations.getTranslation('action')).toBe('Guardar');
	});

	it('namespaces a selected dictionary and lets explicit streams override individual labels', () => {
		const dictionary = new BehaviorSubject<Record<string, unknown>>({
			SIGNATURE: { ACTION: { CLEAR: 'Clear signature', UNDO: 'Undo stroke' } }
		});
		const undo = new BehaviorSubject('Undo contract signature');
		TestBed.configureTestingModule({
			providers: [
				provideHubTranslationAdapter(() => ({
					dictionary,
					namespace: 'HUBUI',
					overrides: { SIGNATURE: { ACTION: { UNDO: undo } } }
				}))
			]
		});
		const translations = TestBed.inject(HubTranslationService);

		expect(translations.getTranslation('HUBUI.SIGNATURE.ACTION.CLEAR')).toBe('Clear signature');
		expect(translations.getTranslation('HUBUI.SIGNATURE.ACTION.UNDO')).toBe('Undo contract signature');

		undo.next('Deshacer firma contractual');

		expect(translations.getTranslation('HUBUI.SIGNATURE.ACTION.UNDO')).toBe('Deshacer firma contractual');
	});
});
