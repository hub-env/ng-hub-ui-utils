import { ChangeDetectorRef, inject, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

/**
 * A standalone pipe that unwraps the value of an observable or returns the value directly if it's not an observable.
 *
 * @description
 * The `HubUnwrapAsyncPipe` is used to unwrap the value emitted by an observable or return the value directly if it's not an observable.
 * It subscribes to the observable and returns the emitted value. If the input is not an observable, it simply returns the value.
 *
 * @usageNotes
 * ```html
 * <div>{{ observableOrValue | hubUnwrapAsync }}</div>
 * ```
 *
 * @publicApi
 */
@Pipe({
	name: 'hubUnwrapAsync',
	standalone: true,
	pure: false
})
export class HubUnwrapAsyncPipe<T = any> implements PipeTransform, OnDestroy {
	#cdr = inject(ChangeDetectorRef);

	/**
	 * The unwrapped value of the observable or the direct value.
	 */
	value: T | null = null;

	/**
	 * The subscription to the observable.
	 */
	subscription: Subscription | null = null;

	/**
	 * Performs cleanup tasks when the pipe is destroyed.
	 */
	ngOnDestroy(): void {
		this.unsubscribe();
	}

	/**
	 * Transforms the input value.
	 *
	 * @param value The input value to transform. It can be an observable or a direct value.
	 * @returns The unwrapped value of the observable or the direct value.
	 */
	transform(value: T | Observable<T>): T | null {
		if (value instanceof Observable) {
			this.unsubscribe();
			this.subscription = value.subscribe((result) => {
				this.value = result;
				this.#cdr.markForCheck();
			});
		} else {
			// Clean up subscription when switching to direct value
			this.unsubscribe();
			this.value = value;
		}
		return this.value;
	}

	/**
	 * Unsubscribes from the current subscription.
	 */
	private unsubscribe(): void {
		if (this.subscription) {
			this.subscription.unsubscribe();
			this.subscription = null;
		}
	}
}

/**
 * @deprecated The template name `unwrapAsync` is a name in the consumer's namespace, not this
 * library's. Use `hubUnwrapAsync` (`HubUnwrapAsyncPipe`) instead. Removed in **23.0.0**.
 */
@Pipe({
	name: 'unwrapAsync',
	standalone: true,
	pure: false
})
export class UnwrapAsyncPipe<T = any> extends HubUnwrapAsyncPipe<T> {}
