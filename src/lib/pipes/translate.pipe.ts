import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { HubTranslationService } from '../i18n/translation.service';
import { HUB_TRANSLATION_PREFIX } from '../i18n/translation.tokens';
import { equals, interpolateString, isDefined } from '../util';

@Pipe({
	name: 'hubTranslate',
	standalone: true,
	pure: false
})
export class HubTranslatePipe implements PipeTransform, OnDestroy {
	private _ref = inject(ChangeDetectorRef);
	private _translationSvc = inject(HubTranslationService);
	private readonly prefix = inject(HUB_TRANSLATION_PREFIX, { optional: true });

	value: string = '';
	lastKey: string | null = null;
	lastParams: any[] = [];

	translationSubscription: Subscription | undefined;

	/**
	 * Updates the value of a key by interpolating the translation and marking for change detection.
	 */
	updateValue(key: string, interpolateParams?: Object): void {
		const scopedKey = this.prefix ? `${this.prefix}.${key}` : key;
		const translated = this._translationSvc.getTranslation(scopedKey) ?? this._translationSvc.getTranslation(key);
		const value = interpolateString(translated, interpolateParams);
		this.value = value !== undefined ? value : key;
		this.lastKey = key;
		this._ref.markForCheck();
	}

	/**
	 * Transforms a translation key with optional interpolation params.
	 */
	transform(query: string, ...args: any[]): any {
		if (!query || !query.length) {
			return query;
		}

		// If we ask another time for the same key, return the last value.
		if (equals(query, this.lastKey) && equals(args, this.lastParams)) {
			return this.value;
		}

		let interpolateParams: Object | undefined = undefined;
		if (isDefined(args[0]) && args.length) {
			if (typeof args[0] === 'string' && args[0].length) {
				// We accept objects written in the template such as {n:1}, {'n':1}, {n:'v'}.
				// This converts them to valid JSON.
				let validArgs: string = args[0]
					.replace(/(\')?([a-zA-Z0-9_]+)(\')?(\s)?:/g, '"$2":')
					.replace(/:(\s)?(\')(.*?)(\')/g, ':"$3"');
				try {
					interpolateParams = JSON.parse(validArgs);
				} catch (e) {
					throw new SyntaxError(`Wrong parameter in HubTranslatePipe. Expected a valid Object, received: ${args[0]}`);
				}
			} else if (typeof args[0] === 'object' && !Array.isArray(args[0])) {
				interpolateParams = args[0];
			}
		}

		// Store the query, in case it changes.
		this.lastKey = query;

		// Store the params, in case they change.
		this.lastParams = args;

		// Set the value.
		this.updateValue(query, interpolateParams);

		// Clean any existing subscription.
		this._dispose();

		if (!this.translationSubscription) {
			this.translationSubscription = this._translationSvc.translationObserver.subscribe(() => {
				if (this.lastKey) {
					this.lastKey = null;
					this.updateValue(query, interpolateParams);
				}
			});
		}
		return this.value;
	}

	/**
	 * Clean any existing subscription to change events.
	 */
	private _dispose(): void {
		if (typeof this.translationSubscription !== 'undefined') {
			this.translationSubscription.unsubscribe();
			this.translationSubscription = undefined;
		}
	}

	ngOnDestroy(): void {
		this._dispose();
	}
}

/**
 * @deprecated The template name `translate` is a name in the consumer's namespace, not this
 * library's — it is also the name transloco and ngx-translate give their own pipe, so a host
 * application that imports both cannot tell them apart. Use `hubTranslate`
 * (`HubTranslatePipe`) instead. Removed in **23.0.0**.
 */
@Pipe({
	name: 'translate',
	standalone: true,
	pure: false
})
export class TranslatePipe extends HubTranslatePipe {}
