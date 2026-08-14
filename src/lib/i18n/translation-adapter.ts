import {
	DestroyRef,
	EnvironmentProviders,
	inject,
	InjectionToken,
	makeEnvironmentProviders,
	provideAppInitializer
} from '@angular/core';
import { HubTranslationService } from './translation.service';

/** Reactive source accepted from an application translation framework. */
export interface HubTranslationSource<T = Record<string, unknown>> {
	/** Subscribes to translation updates and returns a cleanup handle. */
	subscribe(next: (translations: T) => void): { unsubscribe(): void };
}

/** A literal override, reactive label source, or a nested group of either. */
export type HubTranslationOverrides = {
	[key: string]: string | HubTranslationSource<string> | HubTranslationOverrides;
};

/**
 * Describes a namespaced application dictionary and optional explicit library-label mappings.
 * Overrides win over values emitted by `dictionary` while preserving reactive language changes.
 */
export interface HubTranslationAdapterConfig {
	/** Complete reactive dictionary supplied by the application i18n framework. */
	dictionary: HubTranslationSource;
	/** Namespace added around the selected dictionary, such as `HUB`. */
	namespace?: string;
	/** Deliberate library-label mappings, for applications whose keys differ from Hub UI's defaults. */
	overrides?: HubTranslationOverrides;
}

/** Factory evaluated in Angular's injection context to connect an external translation service. */
export type HubTranslationAdapterFactory = () => HubTranslationSource | HubTranslationAdapterConfig;

/** Internal token holding the application's external dictionary source. */
export const HUB_TRANSLATION_SOURCE = new InjectionToken<HubTranslationSource | HubTranslationAdapterConfig>(
	'HUB_TRANSLATION_SOURCE'
);

/** Identifies the extended configuration while retaining the concise source-only provider form. */
function isAdapterConfig(source: HubTranslationSource | HubTranslationAdapterConfig): source is HubTranslationAdapterConfig {
	return 'dictionary' in source;
}

/** Distinguishes a reactive label stream from a nested group of label mappings. */
function isTranslationValueSource(
	value: HubTranslationSource<string> | HubTranslationOverrides
): value is HubTranslationSource<string> {
	return typeof value.subscribe === 'function';
}

/** Sets a nested value without mutating the dictionary emitted by the application service. */
function setNestedValue(target: Record<string, unknown>, path: string[], value: string): void {
	let current = target;
	path.forEach((key, index) => {
		if (index === path.length - 1) {
			current[key] = value;
			return;
		}
		const next = current[key];
		const nested =
			typeof next === 'object' && next !== null && !Array.isArray(next) ? (next as Record<string, unknown>) : {};
		current[key] = nested;
		current = nested;
	});
}

/** Deeply overlays explicit label values while retaining unrelated dictionary branches. */
function mergeDictionaries(base: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> {
	const result = { ...base };
	Object.entries(overrides).forEach(([key, value]) => {
		const current = result[key];
		result[key] =
			typeof current === 'object' && current !== null && typeof value === 'object' && value !== null
				? mergeDictionaries(current as Record<string, unknown>, value as Record<string, unknown>)
				: value;
	});
	return result;
}

/**
 * Connects an external reactive translation source to every Hub UI library using HubTranslationService.
 * The provider owns the subscription lifetime. A complete `HUB` dictionary is the simple default;
 * `overrides` lets applications deliberately connect individual labels to arbitrary service streams.
 *
 * @param factory - Creates a reactive dictionary or a namespaced dictionary with explicit overrides.
 * @returns Environment providers for the Hub UI translation bridge.
 */
export function provideHubTranslationAdapter(factory: HubTranslationAdapterFactory): EnvironmentProviders {
	return makeEnvironmentProviders([
		HubTranslationService,
		{ provide: HUB_TRANSLATION_SOURCE, useFactory: factory },
		provideAppInitializer(() => {
			const providedSource = inject(HUB_TRANSLATION_SOURCE);
			const translations = inject(HubTranslationService);
			const destroyRef = inject(DestroyRef);
			const config = isAdapterConfig(providedSource) ? providedSource : { dictionary: providedSource };
			let dictionary: Record<string, unknown> = {};
			const overrides: Record<string, unknown> = {};
			const subscriptions: Array<{ unsubscribe(): void }> = [];

			const publish = () => {
				const merged = mergeDictionaries(dictionary, overrides);
				translations.setTranslations(config.namespace ? { [config.namespace]: merged } : merged);
			};
			const connectOverrides = (items: HubTranslationOverrides, path: string[] = []) => {
				Object.entries(items).forEach(([key, value]) => {
					const currentPath = [...path, key];
					if (typeof value === 'string') {
						setNestedValue(overrides, currentPath, value);
					} else if (isTranslationValueSource(value)) {
						subscriptions.push(
							value.subscribe((translated) => {
								setNestedValue(overrides, currentPath, translated);
								publish();
							})
						);
					} else {
						connectOverrides(value, currentPath);
					}
				});
			};

			subscriptions.push(
				config.dictionary.subscribe((nextDictionary) => {
					dictionary = nextDictionary;
					publish();
				})
			);
			if (config.overrides) connectOverrides(config.overrides);
			publish();
			destroyRef.onDestroy(() => subscriptions.forEach((subscription) => subscription.unsubscribe()));
		})
	]);
}
