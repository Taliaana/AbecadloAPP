const activeAutosaves = new Set()
export function flushAutosaves() { for (const flush of [...activeAutosaves]) flush() }
export function createAutosave(save, delay = 450, timers = globalThis) {
  let timeoutId = null
  let pendingValue

  function flush() {
    activeAutosaves.delete(flush)
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
      activeAutosaves.add(flush)
      pendingValue = value
      if (timeoutId != null) timers.clearTimeout(timeoutId)
      timeoutId = timers.setTimeout(flush, delay)
    },
    flush,
    cancel() {
      activeAutosaves.delete(flush)
      if (timeoutId != null) timers.clearTimeout(timeoutId)
      timeoutId = null
      pendingValue = undefined
    },
    get pending() { return pendingValue !== undefined },
  }
}
