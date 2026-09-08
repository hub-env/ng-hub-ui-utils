import { Pipe, PipeTransform } from '@angular/core';

/**
 * Uppercases the first character of a string.
 *
 * The template name is still the unprefixed `ucfirst`, unlike the rest of this package's
 * pipes, and that is deliberate rather than forgotten: `ng-hub-ui-forms` already ships a
 * pipe named `hubUcfirst` with a different rule — it skips leading non-letters — so minting
 * a second one here would put two pipes of the same name and different behaviour in the
 * family, and a component that imports both packages could not tell them apart. Which of the
 * two owns the name is a decision that has to be taken across both packages at once.
 */
@Pipe({
	name: 'ucfirst',
	standalone: true
})
export class UcfirstPipe implements PipeTransform {
	transform(value: string = ''): string {
		return value.charAt(0).toUpperCase() + value.slice(1);
	}
}
