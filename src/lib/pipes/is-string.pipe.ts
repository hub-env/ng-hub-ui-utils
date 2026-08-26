import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'isString'
})
export class IsStringPipe implements PipeTransform {
	transform(value: any): boolean {
		return typeof value === 'string';
	}
}
