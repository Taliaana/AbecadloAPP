// Schedule after the router's page focus, retaining a control after a local update.
export function restoreControlFocus(root, selector) {
  requestAnimationFrame(() => root.querySelector(selector)?.focus({ preventScroll: true }))
}
