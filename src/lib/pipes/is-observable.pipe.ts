import { Pipe, PipeTransform } from '@angular/core';
import { isObservable, Observable } from 'rxjs';

@Pipe({
	name: 'hubIsObservable',
	standalone: true
})
export class HubIsObservablePipe<T = any> implements PipeTransform {
	transform(value: T | Observable<T>): boolean {
		return isObservable(value);
	}
}

/**
 * @deprecated The template name `isObservable` is a name in the consumer's namespace, not this
 * library's. Use `hubIsObservable` (`HubIsObservablePipe`) instead. Removed in **23.0.0**.
 */
@Pipe({
	name: 'isObservable',
	standalone: true
})
export class IsObservablePipe<T = any> extends HubIsObservablePipe<T> {}
