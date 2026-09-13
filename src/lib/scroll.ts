/** Reset a scroll container to the top (e.g. main content when switching pages). */
export function resetScrollTop(element: HTMLElement | null | undefined): void {
  if (!element) return;
  element.scrollTop = 0;
}
