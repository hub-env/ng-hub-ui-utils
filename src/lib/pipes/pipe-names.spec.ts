import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { HubTranslationService } from '../i18n/translation.service';
import {
	GetPipe,
	HubGetPipe,
	HubIsObjectPipe,
	HubIsObservablePipe,
	HubIsStringPipe,
	HubTranslatePipe,
	HubUnwrapAsyncPipe,
	IsObjectPipe,
	IsObservablePipe,
	IsStringPipe,
	TranslatePipe,
	UnwrapAsyncPipe
} from '../../public-api';

/**
 * A pipe name is a name in the consumer's template namespace, not in the library's: nothing
 * scopes it, and the host application cannot rename what it imports. `get`, `isObject`,
 * `isString`, `isObservable` and `unwrapAsync` are all words an application is entitled to
 * spend on its own pipes, and `translate` is the name transloco and ngx-translate already
 * give theirs — importing this package used to make that a compile error the consumer could
 * not work around.
 *
 * So each of them now answers to a `hub`-prefixed name, and the old spelling stays as a
 * deprecated alias until 23.0.0. Both halves are asserted here: the new name has to work, and
 * the old one has to keep working and to give the very same answer.
 */
@Component({
	standalone: true,
	imports: [
		HubGetPipe,
		GetPipe,
		HubIsObjectPipe,
		IsObjectPipe,
		HubIsStringPipe,
		IsStringPipe,
		HubIsObservablePipe,
		IsObservablePipe,
		HubUnwrapAsyncPipe,
		UnwrapAsyncPipe
	],
	template: `
		<i id="hub-get">{{ subject | hubGet: 'details.city' }}</i>
		<i id="get">{{ subject | get: 'details.city' }}</i>
		<i id="hub-is-object">{{ subject | hubIsObject }}</i>
		<i id="is-object">{{ subject | isObject }}</i>
		<i id="hub-is-string">{{ text | hubIsString }}</i>
		<i id="is-string">{{ text | isString }}</i>
		<i id="hub-is-observable">{{ stream | hubIsObservable }}</i>
		<i id="is-observable">{{ stream | isObservable }}</i>
		<i id="hub-unwrap-async">{{ stream | hubUnwrapAsync }}</i>
		<i id="unwrap-async">{{ stream | unwrapAsync }}</i>
	`
})
class PipeNamesHost {
	readonly subject = { details: { city: 'Valencia' } };
	readonly text = 'a string';
	readonly stream = of('emitted');
}

@Component({
	standalone: true,
	imports: [HubTranslatePipe, TranslatePipe],
	template: `
		<i id="hub-translate">{{ 'GREETING' | hubTranslate }}</i>
		<i id="translate">{{ 'GREETING' | translate }}</i>
	`
})
class TranslateHost {}

/** Text of the element with the given id, trimmed. */
function textOf(fixture: { nativeElement: HTMLElement }, id: string): string {
	return (fixture.nativeElement.querySelector(`#${id}`)?.textContent ?? '').trim();
}

describe('the template names of the ng-hub-ui-utils pipes', () => {
	it('answers to the prefixed name, and to the deprecated one with the same answer', () => {
		const fixture = TestBed.createComponent(PipeNamesHost);
		fixture.detectChanges();

		const pairs: [string, string, string][] = [
			['hub-get', 'get', 'Valencia'],
			['hub-is-object', 'is-object', 'true'],
			['hub-is-string', 'is-string', 'true'],
			['hub-is-observable', 'is-observable', 'true'],
			['hub-unwrap-async', 'unwrap-async', 'emitted']
		];

		pairs.forEach(([prefixed, legacy, expected]) => {
			expect(textOf(fixture, prefixed)).toBe(expected);
			expect(textOf(fixture, legacy)).toBe(expected);
		});
	});

	it('translates under `hubTranslate`, and still under the transloco-colliding `translate`', () => {
		const translationService = {
			getTranslation: (key: string) => (key === 'GREETING' ? 'Hola' : undefined),
			translationObserver: new Subject<unknown>().asObservable()
		} as unknown as HubTranslationService;

		TestBed.configureTestingModule({
			providers: [{ provide: HubTranslationService, useValue: translationService }]
		});

		const fixture = TestBed.createComponent(TranslateHost);
		fixture.detectChanges();

		expect(textOf(fixture, 'hub-translate')).toBe('Hola');
		expect(textOf(fixture, 'translate')).toBe('Hola');
	});

	it('keeps the deprecated class assignable where the prefixed one is expected', () => {
		// A consumer who imported `GetPipe` and typed against it keeps compiling and keeps the
		// behaviour: the alias is the same implementation under an older name.
		const legacy: HubGetPipe = new GetPipe();

		expect(legacy.transform({ a: 1 }, 'a')).toBe(1);
	});
});
