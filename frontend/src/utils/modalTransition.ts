export const MODAL_EXIT_MS = 160

export function afterModalExit(action: () => void) {
  if (import.meta.env.MODE === 'test') {
    action()
    return
  }

  window.setTimeout(action, MODAL_EXIT_MS)
}
