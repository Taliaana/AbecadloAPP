export function bindDragDrop(root, {
  sourceSelector,
  zoneSelector,
  sourceAttribute,
  zoneAttribute,
  onSelect,
  getSelected,
  onDrop,
}) {
  const listeners = new AbortController()
  const options = { signal: listeners.signal }
  let preview = null
  const sources = [...root.querySelectorAll(sourceSelector)]
  const clearDrag = () => {
    preview?.remove(); preview = null
    sources.forEach(source => source.classList.remove('is-dragging'))
    root.querySelectorAll(zoneSelector).forEach(zone => zone.classList.remove('is-drop-target'))
  }
  const movePreview = event => {
    if (!preview) return
    preview.style.left = `${Math.max(0, Math.min(innerWidth - preview.offsetWidth, event.clientX + 14))}px`
    preview.style.top = `${Math.max(0, Math.min(innerHeight - preview.offsetHeight, event.clientY + 12))}px`
    if (!root.contains(event.target)) root.querySelectorAll(zoneSelector).forEach(zone => zone.classList.remove('is-drop-target'))
  }
  sources.forEach((source) => {
    const id = source.dataset[sourceAttribute]
    source.addEventListener('dragstart', event => {
      if (source.disabled) { event.preventDefault(); return }
      clearDrag()
      event.dataTransfer.setData('text/plain', id)
      event.dataTransfer.effectAllowed = 'move'
      onSelect(id)
      const rect = source.getBoundingClientRect()
      preview = source.cloneNode(true)
      preview.removeAttribute(`data-${sourceAttribute}`)
      preview.removeAttribute('id')
      preview.removeAttribute('aria-pressed')
      preview.setAttribute('aria-hidden', 'true')
      preview.tabIndex = -1; preview.draggable = false
      preview.classList.add('activity-drag-preview')
      preview.style.width = `${rect.width}px`; preview.style.height = `${rect.height}px`
      ;(document.fullscreenElement || document.body).append(preview)
      movePreview(event)
      const blank = document.createElement('canvas'); blank.width = blank.height = 1
      event.dataTransfer.setDragImage(blank, 0, 0)
      source.classList.add('is-dragging')
    }, options)
    source.addEventListener('dragend', clearDrag, options)
    source.addEventListener('click', () => onSelect(id), options)
  })
  root.querySelectorAll(zoneSelector).forEach((zone) => {
    const zoneId = zone.dataset[zoneAttribute]
    zone.addEventListener('dragover', event => {
      if (!preview) return
      event.preventDefault(); event.dataTransfer.dropEffect = 'move'
      root.querySelectorAll(zoneSelector).forEach(node => node.classList.toggle('is-drop-target', node === zone))
    }, options)
    zone.addEventListener('dragleave', event => { if (!zone.contains(event.relatedTarget)) zone.classList.remove('is-drop-target') }, options)
    zone.addEventListener('drop', event => {
      event.preventDefault()
      const id = event.dataTransfer.getData('text/plain')
      if (!preview || !sources.some(source => source.dataset[sourceAttribute] === id && !source.disabled)) return
      clearDrag(); onDrop(id, zoneId)
    }, options)
    zone.addEventListener('click', () => { const selected = getSelected(); if (selected) onDrop(selected, zoneId) }, options)
  })
  document.addEventListener('dragover', movePreview, options)
  return () => { clearDrag(); listeners.abort() }
}

export function bindDoubleClick(element, onComplete) {
  let keyboardActivations = 0
  element.addEventListener('dblclick', onComplete)
  element.addEventListener('click', (event) => {
    if (event.detail !== 0) return
    keyboardActivations += 1
    if (keyboardActivations === 2) onComplete()
  })
}
