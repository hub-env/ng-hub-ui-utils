import { InjectionToken, Signal } from '@angular/core';

/** Where a form field shows its validation message. */
export type HubFieldFeedbackPlacement = 'bottom' | 'tooltip';

/**
 * Lets a container decide where the form fields inside it show their validation messages.
 *
 * Under the control is right in a form and wrong in a grid: in a table cell the message makes
 * the row taller and pushes every row below it. A container that lays fields out as cells
 * provides `'tooltip'`, and each field then marks itself in the danger colour and keeps the
 * message for a tooltip on hover.
 *
 * It lives here, and not in `ng-hub-ui-forms`, so a library that hosts fields (the paginable
 * table) can ask for it without depending on the forms library. A signal, because the
 * container's own setting can change at runtime.
 */
export const HUB_FIELD_FEEDBACK = new InjectionToken<Signal<HubFieldFeedbackPlacement>>('HUB_FIELD_FEEDBACK');
