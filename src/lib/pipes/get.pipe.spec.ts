import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';

import { GetPipe } from './get.pipe';

/**
 * Test component for integration testing of the GetPipe
 */
@Component({
	template: `
		<div id="simple-property">{{ testObject | get: 'name' }}</div>
		<div id="nested-property">{{ testObject | get: 'details.age' }}</div>
		<div id="deep-nested">{{ testObject | get: 'details.address.city' }}</div>
		<div id="array-property">{{ testObject | get: 'hobbies.0' }}</div>
		<div id="with-default">{{ testObject | get: 'nonExistent' : 'Default Value' }}</div>
		<div id="null-path">{{ testObject | get: nullPath }}</div>
		<div id="undefined-path">{{ testObject | get: undefinedPath }}</div>
		<div id="empty-string-path">{{ testObject | get: '' }}</div>
		<div id="number-path">{{ testObject | get: numberPath }}</div>
	`,
	standalone: true,
	imports: [GetPipe]
})
class TestComponent {
	// Intentionally-invalid path inputs used to verify the pipe's defensive handling
	// of non-string paths in templates. Cast through `unknown` to satisfy the typed API.
	nullPath = null as unknown as string;
	undefinedPath = undefined as unknown as string;
	numberPath = 123 as unknown as string;

	testObject = {
		name: 'John Doe',
		details: {
			age: 30,
			address: {
				city: 'New York',
				country: 'USA'
			}
		},
		hobbies: ['reading', 'gaming', 'cooking'],
		nullValue: null,
		undefinedValue: undefined,
		emptyString: '',
		zeroValue: 0,
		falseValue: false
	};
}

describe('GetPipe', () => {
	let pipe: GetPipe;
	let component: TestComponent;
	let fixture: any;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [TestComponent]
		});

		pipe = new GetPipe();
		fixture = TestBed.createComponent(TestComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	describe('Basic Functionality', () => {
		it('should create an instance', () => {
			expect(pipe).toBeTruthy();
		});

		it('should implement PipeTransform interface', () => {
			expect(pipe.transform).toBeDefined();
			expect(typeof pipe.transform).toBe('function');
		});
	});

	describe('Simple Property Access', () => {
		it('should get simple property', () => {
			const result = pipe.transform(component.testObject, 'name');
			expect(result).toBe('John Doe');
		});

		it('should return null for non-existent property', () => {
			const result = pipe.transform(component.testObject, 'nonExistent');
			expect(result).toBeNull();
		});

		it('should get falsy values correctly', () => {
			expect(pipe.transform(component.testObject, 'emptyString')).toBe('');
			expect(pipe.transform(component.testObject, 'zeroValue')).toBe(0);
			expect(pipe.transform(component.testObject, 'falseValue')).toBe(false);
		});

		it('should handle null values in object', () => {
			const result = pipe.transform(component.testObject, 'nullValue');
			expect(result).toBeNull();
		});

		it('should handle undefined values in object', () => {
			const result = pipe.transform(component.testObject, 'undefinedValue');
			expect(result).toBeNull();
		});
	});

	describe('Nested Property Access', () => {
		it('should get nested property', () => {
			const result = pipe.transform(component.testObject, 'details.age');
			expect(result).toBe(30);
		});

		it('should get deeply nested property', () => {
			const result = pipe.transform(component.testObject, 'details.address.city');
			expect(result).toBe('New York');
		});

		it('should return null for non-existent nested property', () => {
			const result = pipe.transform(component.testObject, 'details.nonExistent');
			expect(result).toBeNull();
		});

		it('should return null for deeply non-existent nested property', () => {
			const result = pipe.transform(component.testObject, 'details.address.nonExistent.deep');
			expect(result).toBeNull();
		});

		it('should handle null intermediate objects', () => {
			const objWithNull = {
				details: null
			};
			const result = pipe.transform(objWithNull, 'details.age');
			expect(result).toBeNull();
		});

		it('should handle undefined intermediate objects', () => {
			const objWithUndefined = {
				details: undefined
			};
			const result = pipe.transform(objWithUndefined, 'details.age');
			expect(result).toBeNull();
		});
	});

	describe('Array Access', () => {
		it('should access array elements by index', () => {
			const result = pipe.transform(component.testObject, 'hobbies.0');
			expect(result).toBe('reading');
		});

		it('should access nested array elements', () => {
			const result = pipe.transform(component.testObject, 'hobbies.2');
			expect(result).toBe('cooking');
		});

		it('should return null for out-of-bounds array access', () => {
			const result = pipe.transform(component.testObject, 'hobbies.10');
			expect(result).toBeNull();
		});

		it('should handle array in nested objects', () => {
			const complexObject = {
				data: {
					items: ['first', 'second', 'third']
				}
			};
			const result = pipe.transform(complexObject, 'data.items.1');
			expect(result).toBe('second');
		});
	});

	describe('Default Value Handling', () => {
		it('should return default value for non-existent property', () => {
			const result = pipe.transform(component.testObject, 'nonExistent', 'Default Value');
			expect(result).toBe('Default Value');
		});

		it('should return default value for deeply nested non-existent property', () => {
			const result = pipe.transform(component.testObject, 'level1.level2.level3', 'Deep Default');
			expect(result).toBe('Deep Default');
		});

		it('should not return default value for existing falsy properties', () => {
			expect(pipe.transform(component.testObject, 'emptyString', 'Default')).toBe('');
			expect(pipe.transform(component.testObject, 'zeroValue', 'Default')).toBe(0);
			expect(pipe.transform(component.testObject, 'falseValue', 'Default')).toBe(false);
		});

		it('should return default value for null properties', () => {
			const result = pipe.transform(component.testObject, 'nullValue', 'Default for Null');
			expect(result).toBe('Default for Null');
		});

		it('should return default value for undefined properties', () => {
			const result = pipe.transform(component.testObject, 'undefinedValue', 'Default for Undefined');
			expect(result).toBe('Default for Undefined');
		});

		it('should handle null as default value', () => {
			const result = pipe.transform(component.testObject, 'nonExistent', null);
			expect(result).toBeNull();
		});

		it('should handle undefined as default value', () => {
			const result = pipe.transform(component.testObject, 'nonExistent', undefined);
			expect(result).toBeNull(); // The pipe returns null when no defaultValue or undefined is provided
		});

		it('should handle complex objects as default value', () => {
			const defaultObj = { default: true };
			const result = pipe.transform(component.testObject, 'nonExistent', defaultObj);
			expect(result).toEqual(defaultObj);
		});
	});

	describe('Edge Cases and Error Handling', () => {
		it('should handle null input object', () => {
			const result = pipe.transform(null, 'name');
			expect(result).toBeNull();
		});

		it('should handle undefined input object', () => {
			const result = pipe.transform(undefined, 'name');
			expect(result).toBeNull();
		});

		it('should handle null path', () => {
			const result = pipe.transform(component.testObject, null as any);
			expect(result).toEqual(component.testObject);
		});

		it('should handle undefined path', () => {
			const result = pipe.transform(component.testObject, undefined as any);
			expect(result).toEqual(component.testObject);
		});

		it('should handle empty string path', () => {
			const result = pipe.transform(component.testObject, '');
			// Empty string is a valid string, so it splits to [''] and tries to access value[''] which returns null
			expect(result).toBeNull();
		});

		it('should handle non-string path types', () => {
			expect(pipe.transform(component.testObject, 123 as any)).toEqual(component.testObject);
			expect(pipe.transform(component.testObject, {} as any)).toEqual(component.testObject);
			expect(pipe.transform(component.testObject, [] as any)).toEqual(component.testObject);
		});

		it('should handle path with multiple dots', () => {
			const result = pipe.transform(component.testObject, 'details..age');
			expect(result).toBeNull(); // Empty string between dots should fail
		});

		it('should handle path starting with dot', () => {
			const result = pipe.transform(component.testObject, '.name');
			expect(result).toBeNull(); // Empty first segment should fail
		});

		it('should handle path ending with dot', () => {
			const result = pipe.transform(component.testObject, 'details.');
			expect(result).toBeNull(); // Empty last segment should fail
		});
	});

	describe('Complex Data Structures', () => {
		it('should handle nested arrays and objects', () => {
			const complexObject = {
				users: [
					{ name: 'John', details: { age: 30 } },
					{ name: 'Jane', details: { age: 25 } }
				]
			};

			expect(pipe.transform(complexObject, 'users.0.name')).toBe('John');
			expect(pipe.transform(complexObject, 'users.1.details.age')).toBe(25);
			expect(pipe.transform(complexObject, 'users.2.name')).toBeNull();
		});

		it('should handle objects with numeric keys', () => {
			const objWithNumericKeys = {
				'123': { value: 'numeric key' },
				'456': 'simple numeric'
			};

			expect(pipe.transform(objWithNumericKeys, '123.value')).toBe('numeric key');
			expect(pipe.transform(objWithNumericKeys, '456')).toBe('simple numeric');
		});

		it('should handle objects with special characters in keys', () => {
			const objWithSpecialKeys = {
				'key-with-dash': 'dash value',
				key_with_underscore: 'underscore value'
			};

			expect(pipe.transform(objWithSpecialKeys, 'key-with-dash')).toBe('dash value');
			expect(pipe.transform(objWithSpecialKeys, 'key_with_underscore')).toBe('underscore value');
		});
	});

	describe('Performance and Memory', () => {
		it('should handle large nested objects efficiently', () => {
			// Create a deeply nested object
			let largeObject: any = {};
			let current = largeObject;

			for (let i = 0; i < 100; i++) {
				current[`level${i}`] = {};
				current = current[`level${i}`];
			}
			current.finalValue = 'deep value';

			const path = Array.from({ length: 100 }, (_, i) => `level${i}`).join('.') + '.finalValue';

			const result = pipe.transform(largeObject, path);

			expect(result).toBe('deep value');
		});

		it('answers the same for every one of a thousand repeated calls', () => {
			const expected = pipe.transform(component.testObject, 'details.age');
			const answers = new Set();

			for (let i = 0; i < 1000; i++) {
				answers.add(pipe.transform(component.testObject, 'details.age'));
			}

			expect([...answers]).toEqual([expected]);
		});
	});

	describe('Integration Tests with Template', () => {
		it('should work correctly in template for simple property', () => {
			const element = fixture.debugElement.query(By.css('#simple-property'));
			expect(element.nativeElement.textContent.trim()).toBe('John Doe');
		});

		it('should work correctly in template for nested property', () => {
			const element = fixture.debugElement.query(By.css('#nested-property'));
			expect(element.nativeElement.textContent.trim()).toBe('30');
		});

		it('should work correctly in template for deeply nested property', () => {
			const element = fixture.debugElement.query(By.css('#deep-nested'));
			expect(element.nativeElement.textContent.trim()).toBe('New York');
		});

		it('should work correctly in template for array access', () => {
			const element = fixture.debugElement.query(By.css('#array-property'));
			expect(element.nativeElement.textContent.trim()).toBe('reading');
		});

		it('should work correctly in template with default value', () => {
			const element = fixture.debugElement.query(By.css('#with-default'));
			expect(element.nativeElement.textContent.trim()).toBe('Default Value');
		});

		it('should handle invalid paths in template', () => {
			const nullPathElement = fixture.debugElement.query(By.css('#null-path'));
			const undefinedPathElement = fixture.debugElement.query(By.css('#undefined-path'));
			const emptyPathElement = fixture.debugElement.query(By.css('#empty-string-path'));
			const numberPathElement = fixture.debugElement.query(By.css('#number-path'));

			// When path is not a string (null, undefined, number), pipe returns the original object
			expect(nullPathElement?.nativeElement).toBeTruthy();
			expect(undefinedPathElement?.nativeElement).toBeTruthy();
			expect(numberPathElement?.nativeElement).toBeTruthy();

			// Empty string is a valid string but returns null since value[''] doesn't exist
			expect(emptyPathElement?.nativeElement).toBeTruthy();
			expect(emptyPathElement?.nativeElement.textContent.trim()).toBe('');
		});
	});

	describe('Real-world Use Cases', () => {
		it('should handle API response structures', () => {
			const apiResponse = {
				status: 'success',
				data: {
					user: {
						id: 123,
						profile: {
							firstName: 'John',
							lastName: 'Doe',
							preferences: {
								theme: 'dark',
								notifications: {
									email: true,
									push: false
								}
							}
						}
					},
					meta: {
						timestamp: '2024-01-01T00:00:00Z',
						version: '1.0'
					}
				}
			};

			expect(pipe.transform(apiResponse, 'data.user.id')).toBe(123);
			expect(pipe.transform(apiResponse, 'data.user.profile.firstName')).toBe('John');
			expect(pipe.transform(apiResponse, 'data.user.profile.preferences.theme')).toBe('dark');
			expect(pipe.transform(apiResponse, 'data.user.profile.preferences.notifications.email')).toBe(true);
			expect(pipe.transform(apiResponse, 'data.meta.version')).toBe('1.0');
		});

		it('should handle form data structures', () => {
			const formData = {
				personal: {
					name: 'John Doe',
					email: 'john@example.com'
				},
				address: {
					street: '123 Main St',
					city: 'Anytown',
					country: {
						code: 'US',
						name: 'United States'
					}
				},
				preferences: ['email', 'sms']
			};

			expect(pipe.transform(formData, 'personal.name')).toBe('John Doe');
			expect(pipe.transform(formData, 'address.country.code')).toBe('US');
			expect(pipe.transform(formData, 'preferences.0')).toBe('email');
			expect(pipe.transform(formData, 'nonexistent.field', 'N/A')).toBe('N/A');
		});
	});
});
