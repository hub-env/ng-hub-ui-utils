import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'hubGet',
	standalone: true
})
export class HubGetPipe implements PipeTransform {
	/**
	 * @param value The object to retrieve the property from.
	 * @param path The dot-separated path string to the property.
	 * @param defaultValue The value to return if the property is not found.
	 */
	transform(value: any, path: string, defaultValue?: any): any {
		if (typeof path !== 'string') {
			return value;
		}
		return path
			.split('.')
			.reduce((a, c) => (a && a[c] !== null && a[c] !== undefined ? a[c] : defaultValue || null), value);
	}
}

/**
 * @deprecated The template name `get` is a name in the consumer's namespace, not this
 * library's. Use `hubGet` (`HubGetPipe`) instead. Removed in **23.0.0**.
 */
@Pipe({
	name: 'get',
	standalone: true
})
export class GetPipe extends HubGetPipe {}
