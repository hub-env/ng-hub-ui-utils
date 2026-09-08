import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'hubIsObject'
})
export class HubIsObjectPipe implements PipeTransform {
	transform(value: any): boolean {
		return typeof value === 'object';
	}
}

/**
 * @deprecated The template name `isObject` is a name in the consumer's namespace, not this
 * library's. Use `hubIsObject` (`HubIsObjectPipe`) instead. Removed in **23.0.0**.
 */
@Pipe({
	name: 'isObject'
})
export class IsObjectPipe extends HubIsObjectPipe {}
