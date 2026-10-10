export function createAutosave(save, delay = 450, timers = globalThis) {
  let timeoutId = null
  let pendingValue

  function flush() {
    if (timeoutId != null) timers.clearTimeout(timeoutId)
    timeoutId = null
    if (pendingValue === undefined) return false
    const value = pendingValue
    pendingValue = undefined
    save(value)
    return true
  }

  return {
    schedule(value) {
      pendingValue = value
      if (timeoutId != null) timers.clearTimeout(timeoutId)
      timeoutId = timers.setTimeout(flush, delay)
    },
    flush,
    cancel() {
      if (timeoutId != null) timers.clearTimeout(timeoutId)
      timeoutId = null
      pendingValue = undefined
    },
    get pending() { return pendingValue !== undefined },
  }
}
