import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'isObject'
})
export class IsObjectPipe implements PipeTransform {
	transform(value: any): boolean {
		return typeof value === 'object';
	}
}
