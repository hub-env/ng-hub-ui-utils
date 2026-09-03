# ng-hub-ui-utils

[![NPM Version](https://img.shields.io/npm/v/ng-hub-ui-utils.svg)](https://www.npmjs.com/package/ng-hub-ui-utils)
[![License](https://img.shields.io/npm/l/ng-hub-ui-utils.svg)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/carlos-morcillo/ng-hub-ui/ci.yml)](https://github.com/carlos-morcillo/ng-hub-ui/actions)

> Biblioteca de utilidades común para Angular, soporte fundamental del ecosistema Hub UI.

**Español** | [English](./README.md)

## 📝 Descripción

`ng-hub-ui-utils` es la biblioteca de utilidades fundamental de todo el ecosistema Hub UI. Proporciona un conjunto cuidado de funciones de apoyo agnósticas al framework, type guards, pipes standalone de Angular, un sistema flexible de overlay/popup, helpers de focus-trap y accesibilidad, compensación de scrollbar, un motor de transiciones fluidas y un sistema ligero de internacionalización (i18n). No incluye componentes visuales: en su lugar, da soporte al comportamiento compartido de bajo nivel utilizado por el resto de las bibliotecas `ng-hub-ui`, manteniéndose tree-shakable para que solo empaquetes lo que importes.

## 📑 Tabla de Contenidos

- [Descripción](#-descripción)
- [Documentación y ejemplos en vivo](#-documentación-y-ejemplos-en-vivo)
- [Familia de bibliotecas `ng-hub-ui`](#-familia-de-bibliotecas-ng-hub-ui)
- [Inspiración](#-inspiración)
- [Características](#-características)
- [Instalación](#-instalación)
- [Uso Rápido](#-uso-rápido)
- [Internacionalización (i18n)](#-internacionalización-i18n)
- [API de Utilidades](#-api-de-utilidades)
- [Componentes de Apoyo](#-componentes-de-apoyo)
- [Compatibilidad](#-compatibilidad)
- [Desarrollo](#-desarrollo)
- [Testing](#-testing)
- [Changelog](#-changelog)
- [Soporte e incidencias](#-soporte-e-incidencias)
- [Apoya el proyecto](#-apoya-el-proyecto)
- [Contribuciones](#-contribuciones)
- [Licencia](#-licencia)

## 📚 Documentación y ejemplos en vivo

Este paquete forma parte de [Hub UI](https://hubui.dev/en/), una colección de bibliotecas de componentes Angular para aplicaciones standalone.

- Documentación: https://hubui.dev/en/utils/overview/
- Ejemplos en vivo: https://hubui.dev/en/utils/examples/
- Hub UI: https://hubui.dev/en/

## 🧩 Familia de bibliotecas `ng-hub-ui`

Esta biblioteca forma parte del ecosistema **ng-hub-ui**:

- [**ng-hub-ui-accordion**](https://www.npmjs.com/package/ng-hub-ui-accordion) (obsoleta — usa ng-hub-ui-panels)
- [**ng-hub-ui-action-sheet**](https://www.npmjs.com/package/ng-hub-ui-action-sheet)
- [**ng-hub-ui-avatar**](https://www.npmjs.com/package/ng-hub-ui-avatar)
- [**ng-hub-ui-board**](https://www.npmjs.com/package/ng-hub-ui-board)
- [**ng-hub-ui-breadcrumbs**](https://www.npmjs.com/package/ng-hub-ui-breadcrumbs)
- [**ng-hub-ui-calendar**](https://www.npmjs.com/package/ng-hub-ui-calendar)
- [**ng-hub-ui-dropdown**](https://www.npmjs.com/package/ng-hub-ui-dropdown)
- [**ng-hub-ui-ds**](https://www.npmjs.com/package/ng-hub-ui-ds)
- [**ng-hub-ui-forms**](https://www.npmjs.com/package/ng-hub-ui-forms)
- [**ng-hub-ui-history**](https://www.npmjs.com/package/ng-hub-ui-history)
- [**ng-hub-ui-milestones**](https://www.npmjs.com/package/ng-hub-ui-milestones)
- [**ng-hub-ui-modal**](https://www.npmjs.com/package/ng-hub-ui-modal)
- [**ng-hub-ui-nav**](https://www.npmjs.com/package/ng-hub-ui-nav)
- [**ng-hub-ui-paginable**](https://www.npmjs.com/package/ng-hub-ui-paginable)
- [**ng-hub-ui-panels**](https://www.npmjs.com/package/ng-hub-ui-panels)
- [**ng-hub-ui-portal**](https://www.npmjs.com/package/ng-hub-ui-portal)
- [**ng-hub-ui-skeleton**](https://www.npmjs.com/package/ng-hub-ui-skeleton)
- [**ng-hub-ui-sortable**](https://www.npmjs.com/package/ng-hub-ui-sortable)
- [**ng-hub-ui-stepper**](https://www.npmjs.com/package/ng-hub-ui-stepper)
- [**ng-hub-ui-utils**](https://www.npmjs.com/package/ng-hub-ui-utils) ← Estás aquí

## 💡 Inspiración

Esta biblioteca de utilidades surge de la necesidad de proporcionar funciones de apoyo comunes, reutilizables y optimizadas para todo el ecosistema Hub UI. Inspirada en las mejores prácticas de desarrollo Angular y en las utilidades internas de bibliotecas como Angular Bootstrap y Material Design, proporciona herramientas esenciales para el desarrollo de componentes UI modernos.

## ✨ Características

### 🔧 Gestión de Focus y Accesibilidad
Utilidades para manejo avanzado del foco, trap de foco y navegación por teclado.

```typescript
import { getFocusableBoundaryElements, FOCUSABLE_ELEMENTS_SELECTOR } from 'ng-hub-ui-utils';

// Obtener elementos focusables en un contenedor
const [firstElement, lastElement] = getFocusableBoundaryElements(containerElement);

// Crear un trap de foco en un modal
const focusTrap = hubFocusTrap(ngZone, modalElement, stopFocusTrap$);
```

### 🪟 Servicio de Overlay

Sistema avanzado para crear overlays y componentes flotantes con posicionamiento flexible.

```typescript
import { OverlayService, OverlayConfig } from 'ng-hub-ui-utils';

@Component({
  selector: 'app-example'
})
export class ExampleComponent {
  constructor(private overlayService: OverlayService) {}

  openOverlay(elementRef: ElementRef) {
    // Crear overlay con configuración
    const overlayRef = this.overlayService.create({
      hasBackdrop: true,
      backdropClass: 'custom-backdrop'
    });

    // Configurar estrategia de posición
    const positionStrategy = this.overlayService.position()
      .flexibleConnectedTo(elementRef)
      .withPositions([{
        originX: 'start',
        originY: 'bottom',
        overlayX: 'start',
        overlayY: 'top'
      }]);

    // Adjuntar componente al overlay
    const componentRef = overlayRef.attach(MyComponent);
  }
}
```

**Apilamiento (z-index).** `OverlayRef` resuelve su z-index inline a través de los tokens del design-system — `var(--hub-overlay-zindex, 1000)` para el contenedor y `var(--hub-overlay-backdrop-zindex, 999)` para el backdrop — así que reapilar un overlay (p. ej. un dropdown por encima de un modal) es un override CSS normal, sin `!important`. Para una instancia concreta, pasa una capa explícita:

```typescript
this.overlayService.create({ zIndex: 1100 }); // OverlayConfig.zIndex: number | string — tiene prioridad sobre el token
```

### 🎯 Servicio Popup (Clase Base)

Servicio base para crear implementaciones de popup personalizadas.

```typescript
import { PopupService } from 'ng-hub-ui-utils';

@Injectable()
export class MyPopupService extends PopupService<MyPopupComponent> {
  constructor() {
    super(MyPopupComponent);
  }

  openPopup(content?: string | TemplateRef<any>) {
    const { windowRef, transition$ } = super.open(content, {}, true);
    return { windowRef, transition$ };
  }
}
```

### 📜 Gestión de Scrollbar
Control inteligente de scrollbars con compensación de layout.

```typescript
import { ScrollBar } from 'ng-hub-ui-utils';

constructor(private scrollBar: ScrollBar) {}

openModal() {
  // Oculta scrollbar y compensa el espacio
  const reverter = this.scrollBar.hide();
  
  // Al cerrar el modal, restaura el scrollbar
  modalClose.subscribe(() => reverter());
}
```

### ⚡ Sistema de Transiciones
Utilidades para animaciones y transiciones fluidas con detección automática.

```typescript
import { hubRunTransition } from 'ng-hub-ui-utils';

// Ejecutar transición con callback
hubRunTransition(
  this.ngZone,
  element,
  (element, animation, context) => {
    // Lógica de inicio de transición
    element.classList.add('transitioning');
    
    return () => {
      // Cleanup al final de la transición
      element.classList.remove('transitioning');
    };
  },
  {
    animation: true,
    runningTransition: 'continue',
    context: { customData: 'value' }
  }
).subscribe(() => {
  console.log('Transición completada');
});
```

### 🌐 Internacionalización (i18n)

Sistema de traducción ligero basado en inyección de dependencias con un pipe reactivo. Registra los diccionarios de traducción en el arranque con `provideHubTranslation` y traduce claves en los templates con el pipe `translate`.

```typescript
import { provideHubTranslation, HubTranslationService, TranslatePipe } from 'ng-hub-ui-utils';

// En la configuración / providers de arranque de tu aplicación
bootstrapApplication(AppComponent, {
	providers: [
		provideHubTranslation({
			language: 'es',
			fallbackLanguage: 'en',
			dictionaries: {
				en: { greeting: 'Hello {name}!' },
				es: { greeting: '¡Hola {name}!' }
			}
		})
	]
});
```

```typescript
@Component({
	standalone: true,
	imports: [TranslatePipe],
	template: `
		<!-- Clave simple -->
		<p>{{ 'greeting' | translate }}</p>

		<!-- Con parámetros de interpolación -->
		<p>{{ 'greeting' | translate: { name: 'Carlos' } }}</p>
	`
})
export class ExampleComponent {}
```

Consulta [Internacionalización (i18n)](#-internacionalización-i18n) para la API completa.

### 🧰 Pipes Standalone de Angular

Conjunto completo de pipes de utilidad para validación, transformación y manipulación de datos.

```typescript
import {
  GetPipe,
  IsStringPipe,
  IsObjectPipe,
  IsObservablePipe,
  UcfirstPipe,
  UnwrapAsyncPipe
} from 'ng-hub-ui-utils';

@Component({
  standalone: true,
  imports: [GetPipe, IsStringPipe, UcfirstPipe, UnwrapAsyncPipe],
  template: `
    <!-- Acceso seguro a propiedades anidadas -->
    <p>{{ user | get:'address.city':'Desconocido' }}</p>

    <!-- Capitalizar primera letra -->
    <h1>{{ title | ucfirst }}</h1>

    <!-- Verificación de tipos en templates -->
    @if (value | isString) {
      <span>Es un string: {{ value }}</span>
    }

    <!-- Desempaquetar Observable o valor directo -->
    <div>{{ observableOrValue | unwrapAsync }}</div>
  `
})
export class ExampleComponent {
  user = { address: { city: 'Madrid' } };
  title = 'hola mundo';
  value: any = 'prueba';
  observableOrValue = of('Valor Observable');
}
```

**Pipes Disponibles:**
- **GetPipe** (`get`): Acceso seguro a propiedades anidadas con valores por defecto
- **IsStringPipe** (`isString`): Verifica si el valor es un string
- **IsObjectPipe** (`isObject`): Verifica si el valor es un objeto
- **IsObservablePipe** (`isObservable`): Verifica si el valor es un Observable
- **UcfirstPipe** (`ucfirst`): Capitaliza la primera letra de un string
- **UnwrapAsyncPipe** (`unwrapAsync`): Desempaqueta Observable o retorna valor directo

### 🛠️ Funciones de Utilidad General

Conjunto completo de helpers para validación, transformación y manipulación de datos.

```typescript
import {
  toInteger,
  toString,
  getValueInRange,
  isString,
  isNumber,
  isInteger,
  isDefined,
  isPromise,
  padNumber,
  regExpEscape,
  closest,
  reflow,
  removeAccents,
  getActiveElement
} from 'ng-hub-ui-utils';

// Conversiones seguras
const numValue = toInteger('42');        // 42
const strValue = toString(null);         // ''

// Validaciones de tipo
if (isString(value)) { /* ... */ }
if (isPromise(result)) { /* ... */ }

// Manipulación de DOM
const parent = closest(element, '.container');
reflow(element); // Fuerza reflow del navegador

// Utilidades de string
const clean = removeAccents('niño'); // "nino"
const escaped = regExpEscape('hello?'); // "hello\\?"

// Gestión de foco
const activeEl = getActiveElement(); // Incluye shadow DOM
```

### 🎯 TypeScript completo
Tipado estricto en toda la biblioteca con interfaces y tipos bien definidos.

```typescript
// Tipos de transición
type TransitionStartFn<T> = (
  element: HTMLElement,
  animation: boolean,
  context: T
) => TransitionEndFn | void;

interface TransitionOptions<T> {
  animation: boolean;
  runningTransition: 'continue' | 'stop';
  context?: T;
}

// Tipo para el reversor de scrollbar
type ScrollbarReverter = () => void;
```

### ⚡ Tree-shaking optimizado
Importa solo las utilidades que necesitas para optimizar el bundle.

```typescript
// Importaciones específicas
import { toInteger, isString } from 'ng-hub-ui-utils';
import { ScrollBar } from 'ng-hub-ui-utils';
import { hubRunTransition } from 'ng-hub-ui-utils';
import { GetPipe, UcfirstPipe } from 'ng-hub-ui-utils';
```

### 🏷️ Directiva Tooltip

Añade un tooltip ligero y tematizable a cualquier elemento con la directiva `[tooltip]`.
El tooltip se inserta en `<body>` (no se recorta) y aparece al pasar el cursor o enfocar.

```typescript
import { TooltipDirective } from 'ng-hub-ui-utils';

@Component({
	standalone: true,
	imports: [TooltipDirective],
	template: `<button tooltip="Guardar cambios" placement="top">Guardar</button>`
})
export class ExampleComponent {}
```

Inputs: `tooltip` (texto), `placement` (`top` | `bottom` | `left` | `right`, por defecto `top`),
`delay` (ms de fundido, por defecto `150`), `offset` (px, por defecto `8`).

Tematízalo desde cualquier ámbito con variables `--hub-tooltip-*`:

```css
.mi-ambito {
	--hub-tooltip-bg: var(--hub-sys-color-primary);
	--hub-tooltip-color: #fff;
	--hub-tooltip-border-radius: 999px;
	--hub-tooltip-opacity: 1;
}
```

Tokens disponibles: `--hub-tooltip-bg`, `--hub-tooltip-color`, `--hub-tooltip-opacity`,
`--hub-tooltip-padding-x`, `--hub-tooltip-padding-y`, `--hub-tooltip-border-radius`,
`--hub-tooltip-font-size`, `--hub-tooltip-max-width`, `--hub-tooltip-zindex`,
`--hub-tooltip-transition-duration`, `--hub-tooltip-shadow`, `--hub-tooltip-font-family`.

## 🚀 Instalación

```bash
npm install ng-hub-ui-utils
# o
yarn add ng-hub-ui-utils
```

## 📖 Uso Rápido

```typescript
// Importar utilidades específicas
import {
  toInteger,
  isString,
  ScrollBar,
  getFocusableBoundaryElements,
  GetPipe,
  UcfirstPipe
} from 'ng-hub-ui-utils';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [GetPipe, UcfirstPipe],
  template: `
    <div #container>
      <h1>{{ title | ucfirst }}</h1>
      <p>{{ user | get:'name':'Anónimo' }}</p>
    </div>
  `
})
export class ExampleComponent {
  constructor(private scrollBar: ScrollBar) {}

  @ViewChild('container') containerElement!: ElementRef<HTMLElement>;

  title = 'bienvenido';
  user = { name: 'Juan Pérez' };

  ngAfterViewInit() {
    // Obtener elementos focusables
    const [first, last] = getFocusableBoundaryElements(this.containerElement.nativeElement);

    // Conversión segura
    const value = toInteger('42');

    if (isString(this.title)) {
      console.log('Es un string');
    }
  }

  openOverlay() {
    // Ocultar scrollbar durante overlay
    const reverter = this.scrollBar.hide();

    // Restaurar al cerrar
    this.overlayRef.onClose(() => reverter());
  }
}
```

## 🌐 Internacionalización (i18n)

El sistema de i18n (disponible desde `v1.2.0`) permite registrar diccionarios de traducción mediante inyección de dependencias y resolver claves de forma reactiva en los templates. Al actualizar las traducciones activas en tiempo de ejecución, cualquier pipe `translate` de la vista se refresca automáticamente.

### `provideHubTranslation(config?)`

Helper de provider de entorno que registra `HubTranslationService` y su configuración. Llámalo una sola vez en los providers de arranque de tu aplicación.

### `provideHubTranslationAdapter(factory)`

Usa este provider cuando la aplicación gestione las traducciones con Transloco, ngx-translate u otro servicio reactivo. La factoría se ejecuta una vez en el contexto de inyección de Angular y devuelve una fuente de diccionarios completos. Toda biblioteca Hub UI que use `HubTranslationService` recibe los cambios de idioma sin suscripciones en componentes.

```typescript
function provideHubTranslation(config?: HubTranslationConfig): EnvironmentProviders;
```

### `HubTranslationConfig`

```typescript
interface HubTranslationConfig {
	/** Mapa de código de idioma → diccionario de traducciones. */
	dictionaries?: Record<string, Record<string, any>>;
	/** Código del idioma activo (por defecto fallbackLanguage y, en su defecto, 'en'). */
	language?: string;
	/** Idioma de respaldo fusionado bajo el idioma activo (por defecto 'en'). */
	fallbackLanguage?: string;
}
```

La configuración también se expone a través del token de inyección `HUB_TRANSLATION_CONFIG` para escenarios avanzados.

### `HubTranslationService`

Servicio inyectable que mantiene las traducciones activas y notifica a los suscriptores cuando cambian.

```typescript
@Injectable()
class HubTranslationService {
	/** Mapa plano de traducciones activas. */
	translations: Record<string, string>;
	/** Emite cada vez que se actualizan las traducciones activas. */
	translationObserver: Observable<Record<string, string>>;

	/** Resuelve una clave (admite notación con puntos) contra las traducciones activas. */
	getTranslation(key: string): any;
	/** Reemplaza las traducciones activas, fusionándolas sobre el diccionario de respaldo. */
	setTranslations(translations?: Record<string, string>): void;
}
```

```typescript
import { HubTranslationService } from 'ng-hub-ui-utils';

@Component({ /* ... */ })
export class LanguageSwitcherComponent {
	private translationSvc = inject(HubTranslationService);

	switchToSpanish() {
		// Cambia el diccionario activo en tiempo de ejecución; el pipe `translate` se actualiza solo.
		this.translationSvc.setTranslations({ greeting: '¡Hola {name}!' });
	}
}
```

### `TranslatePipe` (`translate`)

Pipe standalone impuro que resuelve una clave de traducción con parámetros de interpolación opcionales. Se suscribe al servicio para mantener la vista sincronizada cuando cambian las traducciones.

```typescript
// Clave simple
{{ 'greeting' | translate }}

// Con un objeto de parámetros de interpolación
{{ 'greeting' | translate: { name: 'Carlos' } }}

// Los parámetros también pueden escribirse en línea como un string de pseudo-objeto
{{ 'greeting' | translate: "{name: 'Carlos'}" }}
```

Si una clave no tiene traducción, se devuelve la propia clave. Los tokens de interpolación usan la sintaxis `{nombreParam}` (gestionada por la utilidad `interpolateString`).

### Utilidades de apoyo

Estas funciones dan soporte al sistema de i18n y se exportan para uso directo:

- `getValue(target: any, key: string): any` - Lee un valor anidado mediante una clave en notación con puntos.
- `interpolateString(text: string, params?: object): string` - Reemplaza los marcadores `{token}` en un string.
- `equals(o1: any, o2: any): boolean` - Comprobación de igualdad profunda usada para memoizar el valor del pipe.

## 📊 API de Utilidades

### Funciones de Conversión
- `toInteger(value: any): number` - Convierte a entero de forma segura
- `toString(value: any): string` - Convierte a string manejando null/undefined
- `getValueInRange(value: number, max: number, min?: number): number` - Limita valor a rango
- `padNumber(value: number): string` - Añade cero inicial a números

### Funciones de Validación
- `isString(value: any): value is string` - Verifica si es string
- `isNumber(value: any): value is number` - Verifica si es número válido
- `isInteger(value: any): value is number` - Verifica si es entero
- `isDefined(value: any): boolean` - Verifica si no es null/undefined
- `isPromise<T>(v: any): v is Promise<T>` - Verifica si es Promise

### Funciones de String
- `regExpEscape(text: string): string` - Escapa caracteres especiales para RegExp
- `removeAccents(str: string): string` - Remueve acentos de texto

### Funciones de color

-   `parseColor(value): HubRgb | null` - Analiza hex (3/4/6/8), `rgb()`, `hsl()`, `oklch()`, `oklab()`, los 148 colores CSS con nombre y `transparent`, en sintaxis moderna y heredada. Sin DOM, así que funciona con SSR. Devuelve `null` — nunca lanza — ante lo que no puede resolver, incluidos `var()` y `currentColor`
-   `toRgb(color): HubRgb | null` - Normaliza una cadena o un color ya analizado a canales
-   `toHex(color): string | null` - Devuelve `#rrggbb`, o `#rrggbbaa` si es translúcido
-   `isValidColor(value): boolean` - Indica si el analizador puede resolver la cadena
-   `HUB_NAMED_COLORS: Readonly<Record<string, string>>` - Los 148 colores CSS con nombre

### Funciones de contraste

-   `relativeLuminance(color): number | null` - Luminancia relativa WCAG 2, de 0 a 1
-   `contrastRatio(a, b): number | null` - Ratio de contraste WCAG 2, de 1 a 21
-   `contrastAPCA(text, background): number | null` - Contraste APCA, sensible a la polaridad
-   `compositeOver(foreground, background): HubColor` - Compone un color translúcido sobre uno opaco
-   `readableOn(background, metric?): string` - Negro o blanco, el que mejor se lea. Por defecto `'lightness'`, la misma decisión que toma `--hub-sys-color-*-on` en CSS; también admite `'apca'` y `'wcag'`
-   `HUB_INK_LIGHTNESS_THRESHOLD: number` - Luminosidad OKLCh a partir de la cual una superficie lleva tinta oscura

### Funciones OKLCh

-   `rgbToOklch(color): HubOklch` / `oklchToRgb(color): HubRgb` - Conversiones en el espacio en el que mezcla el sistema de diseño
-   `maxSrgbChroma(l, h): number` - Croma máximo en gamut para un tono a una luminosidad dada. El gamut sRGB no es un cilindro — a L 0,578 el azul llega a 0,232 y el ámbar solo a 0,119 — así que una paleta no puede dar a todos los tonos el mismo croma absoluto
-   `isInSrgbGamut(color): boolean` - Indica si el color sobrevive a la conversión a sRGB
-   `clampToSrgbGamut(color): HubOklch` - Reduce el croma hasta que quepa, conservando luminosidad y tono

### Funciones de DOM
- `closest(element: HTMLElement, selector?: string): HTMLElement | null` - Busca elemento padre por selector
- `reflow(element: HTMLElement): DOMRect` - Fuerza reflow del navegador
- `getActiveElement(root?: Document | ShadowRoot): Element | null` - Obtiene elemento activo incluyendo Shadow DOM

### Funciones de Focus
- `getFocusableBoundaryElements(element: HTMLElement): HTMLElement[]` - Obtiene primer y último elemento focusable
- `hubFocusTrap(zone, element, stopFocusTrap$, refocusOnClick?)` - Crea trampa de foco para modales/overlays
- `FOCUSABLE_ELEMENTS_SELECTOR: string` - Selector CSS para elementos focusables

### Pipes

#### GetPipe
```typescript
// Acceso seguro a propiedades anidadas
{{ object | get:'path.to.property':'valorPorDefecto' }}
```

#### IsStringPipe
```typescript
// Verificación de tipos
@if (value | isString) { <span>Valor string</span> }
```

#### IsObjectPipe
```typescript
// Verificación de objetos
@if (value | isObject) { <span>Valor objeto</span> }
```

#### IsObservablePipe
```typescript
// Verificación de Observables
@if (stream | isObservable) { <span>Stream Observable</span> }
```

#### UcfirstPipe
```typescript
// Capitalizar primera letra
{{ 'hola mundo' | ucfirst }}  <!-- Hola mundo -->
```

#### UnwrapAsyncPipe
```typescript
// Desempaquetar Observable o retornar valor directo
{{ observableOrValue | unwrapAsync }}
```

### Servicios

#### OverlayService
```typescript
@Injectable({ providedIn: 'root' })
class OverlayService {
  create(config?: OverlayConfig): OverlayRef;
  position(): OverlayPosition;
}

class OverlayRef {
  attach<T>(component: ComponentType<T>): ComponentRef<T>;
  detach(): void;
  dispose(): void;
  updatePosition(): void;
}

class OverlayPosition {
  flexibleConnectedTo(element: ElementRef | HTMLElement): this;
  withPositions(positions: ConnectionPosition[]): this;
}
```

#### ScrollBar Service
```typescript
@Injectable({ providedIn: 'root' })
class ScrollBar {
  hide(): ScrollbarReverter; // Oculta scrollbar con compensación
}
```

#### PopupService<T> (Clase Base)
```typescript
abstract class PopupService<T> {
  // Sistema base para crear popups dinámicos
  // Extender esta clase para crear servicios de popup específicos
  open(content?, templateContext?, animation?): { windowRef: ComponentRef<T>; transition$: Observable<void> };
  close(animation?): Observable<void>;
}
```

### Utilidades de Transición
- `hubRunTransition<T>(zone, element, startFn, options)` - Sistema avanzado de transiciones con Observable
- `hubCompleteTransition(element)` - Completa una transición en ejecución en un elemento
- `getTransitionDurationMs(element)` - Obtiene duración de transición CSS en milisegundos
- `runInZone<T>(zone)` - Operador RxJS para ejecutar observables dentro de NgZone

## 🎨 Componentes de Apoyo

Esta biblioteca no incluye componentes visuales, sino utilidades de soporte que son utilizadas por otros componentes del ecosistema Hub UI:

| Utilidad | Descripción | Usado por |
|----------|-------------|-----------|
| Overlay Service | Sistema de posicionamiento flexible de overlays | ng-hub-ui-modal, ng-hub-ui-portal |
| Focus Trap | Manejo de foco en modales/overlays | ng-hub-ui-modal, ng-hub-ui-portal |
| Scrollbar | Compensación de scrollbar | ng-hub-ui-modal, ng-hub-ui-portal |
| Popup Service | Clase base para componentes popup | ng-hub-ui-modal, ng-hub-ui-portal |
| Transitions | Animaciones fluidas | ng-hub-ui-accordion, ng-hub-ui-modal |
| Type Guards | Funciones de validación de tipos | ng-hub-ui-stepper                      |
| Pipes | Utilidades de template | Todos los componentes Hub UI |

## 🤝 Compatibilidad

- Angular 16+
- TypeScript 4.8+
- Node.js 16+
- Browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## 🛠️ Desarrollo

```bash
git clone https://github.com/carlos-morcillo/ng-hub-ui-utils
cd ng-hub-ui-utils
npm install
npm run build
npm run test
```

### Scripts disponibles

```bash
npm run build:lib        # Construir biblioteca
npm run test:unit        # Tests unitarios
npm run test:e2e         # Tests end-to-end
npm run lint             # Linting
npm run format           # Formatear código
```

## 🧪 Testing

```typescript
import { TestBed } from '@angular/core/testing';
import { ScrollBar, toInteger, isString, GetPipe } from 'ng-hub-ui-utils';

describe('ng-hub-ui-utils', () => {
  it('should convert values safely', () => {
    expect(toInteger('42')).toBe(42);
    expect(toInteger('invalid')).toBe(NaN);
    expect(isString('hello')).toBe(true);
    expect(isString(42)).toBe(false);
  });

  it('should manage scrollbar', () => {
    const scrollBar = TestBed.inject(ScrollBar);
    const reverter = scrollBar.hide();

    expect(typeof reverter).toBe('function');
    reverter(); // Cleanup
  });

  it('should get nested properties safely', () => {
    const pipe = new GetPipe();
    const obj = { user: { name: 'Juan' } };

    expect(pipe.transform(obj, 'user.name')).toBe('Juan');
    expect(pipe.transform(obj, 'user.age', 0)).toBe(0);
  });
});
```

## 📋 Changelog

Todos los cambios relevantes están documentados en el [CHANGELOG.md](./CHANGELOG.md), siguiendo [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) y [Versionado Semántico](https://semver.org/spec/v2.0.0.html).

Cambios destacados recientes:

- **1.2.1** — Renombrado de los archivos internos de i18n y refresco de `TranslatePipe`; añadida una suite de tests para `HubTranslationService`.
- **1.2.0** — Añadido el sistema de i18n (`HubTranslationService`, `provideHubTranslation`, `TranslatePipe`, tokens de traducción) junto con las utilidades `equals`, `interpolateString` y `getValue`.

### Servicios externos de traducción

`HubTranslationService` es deliberadamente agnóstico al framework. Las aplicaciones con Transloco o ngx-translate pueden extraer el espacio de nombres de una biblioteca al cambiar el idioma y pasarlo a `setTranslations()`. Bibliotecas como Calendar, Stepper y Paginable consumen ese puente; sus README documentan el espacio de nombres que espera cada una.

```typescript
// Transloco: hubTranslation.setTranslations(transloco.translateObject('STEPPER'))
// ngx-translate: hubTranslation.setTranslations(translate.instant('STEPPER'))
```

## 🐛 Soporte e incidencias

- [Reportar bug](https://github.com/carlos-morcillo/ng-hub-ui-utils/issues)
- [Solicitar feature](https://github.com/carlos-morcillo/ng-hub-ui-utils/issues/new?template=feature_request.md)
- [Repositorio](https://github.com/carlos-morcillo/ng-hub-ui-utils)
- **Autor**: [Carlos Morcillo](https://www.carlosmorcillo.com)

## ☕ Apoya el proyecto

Si Hub UI te ha sido útil, considera apoyar su desarrollo:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat-square&logo=buy-me-a-coffee)](https://buymeacoffee.com/carlosmorcillo)
[![Sponsor](https://img.shields.io/badge/Sponsor-GitHub-red.svg?style=flat-square&logo=github)](https://github.com/sponsors/carlos-morcillo)

Tu apoyo ayuda a:
- 🚀 Mantener el proyecto activo
- 🐛 Resolver bugs más rápido  
- ✨ Desarrollar nuevas características
- 📚 Mejorar la documentación

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Por favor:

1. 🍴 Fork el repositorio
2. 🌿 Crea una rama para tu feature (`git checkout -b feature/nueva-utilidad`)
3. ✍️ Commit tus cambios (`git commit -am 'feat: añade nueva utilidad'`)
4. 📤 Push a la rama (`git push origin feature/nueva-utilidad`)
5. 🔄 Abre un Pull Request

Consulta nuestras [guías de contribución](CONTRIBUTING.md) para más detalles.

## 📄 Licencia

MIT © colaboradores de Hub UI

```
MIT License

Copyright (c) 2025 Hub UI Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

⭐ **Si te gusta este proyecto, ¡no olvides darle una estrella en GitHub!**

[![GitHub stars](https://img.shields.io/github/stars/carlos-morcillo/ng-hub-ui.svg?style=social&label=Star)](https://github.com/carlos-morcillo/ng-hub-ui)
