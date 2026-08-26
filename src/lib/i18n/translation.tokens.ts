import { InjectionToken } from '@angular/core';

export interface HubTranslationConfig {
	dictionaries?: Record<string, Record<string, any>>;
	language?: string;
	fallbackLanguage?: string;
}

export const HUB_TRANSLATION_CONFIG = new InjectionToken<HubTranslationConfig>('HUB_TRANSLATION_CONFIG');

/** Optional library namespace resolved before legacy unscoped translation keys. */
export const HUB_TRANSLATION_PREFIX = new InjectionToken<string>('HUB_TRANSLATION_PREFIX');
