import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { getValue } from '../util';
import { HUB_TRANSLATION_CONFIG, HubTranslationConfig } from './translation.tokens';

@Injectable()
export class HubTranslationService {
	#config: HubTranslationConfig = inject(HUB_TRANSLATION_CONFIG, { optional: true }) ?? {};

	defaultTranslations: Record<string, string | any> = this.#config.dictionaries ?? {};

	translations!: Record<string, string>;

	private translationSource = new Subject<any>();

	translationObserver = this.translationSource.asObservable();

	constructor() {
		this.initialize();
	}

	initialize() {
		const language = this.#config.language ?? this.#config.fallbackLanguage ?? 'en';
		const fallbackLanguage = this.#config.fallbackLanguage ?? 'en';
		const fallbackTranslations = this.defaultTranslations[fallbackLanguage] ?? {};
		const selectedTranslations = this.defaultTranslations[language] ?? fallbackTranslations;

		this.setTranslations(selectedTranslations);
	}

	/**
	 * Retrieves a value from a translations object based on a given key.
	 */
	getTranslation(key: string): any {
		return getValue(this.translations, key);
	}

	/**
	 * Merges fallback translations with the provided translations and updates observers.
	 */
	setTranslations(translations: Record<string, string> | any = {}) {
		const fallbackLanguage = this.#config.fallbackLanguage ?? 'en';
		const fallbackTranslations = this.defaultTranslations[fallbackLanguage] ?? {};
		const nextTranslations = translations ?? {};

		this.translations = { ...fallbackTranslations, ...nextTranslations };
		this.translationSource.next(this.translations);
	}
}
