import { TemplateRef } from '@angular/core';

/**
 * A rendered drag image, plus a disposer to tear it down once the drag ends.
 */
export interface DragImageResult {
	/** The root element to pass to `dataTransfer.setDragImage`. */
	node: HTMLElement;
	/** Destroys the embedded view and removes the rendered nodes. */
	destroy(): void;
}

/**
 * Renders a template off-screen so it can be used as a native drag image
 * (`dataTransfer.setDragImage`). The caller is responsible for calling `setDragImage` and,
 * on `dragend`, the returned `destroy()`.
 *
 * @param template Template to render as the drag preview.
 * @param context Template context (e.g. `{ item }`).
 * @param container Optional host element to mount into; when omitted, an off-screen holder is
 *   appended to `document.body`.
 * @returns The rendered image and its disposer, or `null` when nothing renders (e.g. SSR or
 *   an empty template).
 */
export function createNativeDragImage(
	template: TemplateRef<any>,
	context: Record<string, unknown>,
	container?: HTMLElement
): DragImageResult | null {
	if (typeof document === 'undefined') {
		return null;
	}
	const view = template.createEmbeddedView(context);
	view.detectChanges();
	const node = view.rootNodes.find((candidate: Node) => candidate.nodeType === Node.ELEMENT_NODE) as HTMLElement | undefined;
	if (!node) {
		view.destroy();
		return null;
	}

	const mountedNodes: Node[] = [...view.rootNodes];
	let holder: HTMLElement | null = null;
	if (container) {
		mountedNodes.forEach((rootNode: Node) => container.appendChild(rootNode));
	} else {
		holder = document.createElement('div');
		holder.style.position = 'fixed';
		holder.style.top = '-9999px';
		holder.style.left = '-9999px';
		holder.style.pointerEvents = 'none';
		mountedNodes.forEach((rootNode: Node) => holder!.appendChild(rootNode));
		document.body.appendChild(holder);
	}

	return {
		node,
		destroy: () => {
			// Angular's `EmbeddedViewRef.destroy()` tears down the view but does NOT remove the
			// DOM nodes it produced, so remove them explicitly to keep the helper self-contained
			// (no caller-side `innerHTML` clearing needed). The off-screen holder is removed whole.
			view.destroy();
			if (holder) {
				holder.remove();
			} else {
				mountedNodes.forEach((rootNode: Node) => (rootNode as ChildNode).remove?.());
			}
		}
	};
}
