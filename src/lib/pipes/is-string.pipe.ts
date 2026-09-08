import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'hubIsString'
})
export class HubIsStringPipe implements PipeTransform {
	transform(value: any): boolean {
		return typeof value === 'string';
	}
}

/**
 * @deprecated The template name `isString` is a name in the consumer's namespace, not this
 * library's. Use `hubIsString` (`HubIsStringPipe`) instead. Removed in **23.0.0**.
 */
@Pipe({
	name: 'isString'
})
export class IsStringPipe extends HubIsStringPipe {}
