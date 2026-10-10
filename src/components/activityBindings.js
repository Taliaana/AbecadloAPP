export function bindDragDrop(root, {
  sourceSelector,
  zoneSelector,
  sourceAttribute,
  zoneAttribute,
  onSelect,
  getSelected,
  onDrop,
}) {
  root.querySelectorAll(sourceSelector).forEach((source) => {
    const id = source.dataset[sourceAttribute]
    source.addEventListener('dragstart', (event) => event.dataTransfer.setData('text/plain', id))
    source.addEventListener('click', () => onSelect(id))
  })
  root.querySelectorAll(zoneSelector).forEach((zone) => {
    const zoneId = zone.dataset[zoneAttribute]
    zone.addEventListener('dragover', (event) => event.preventDefault())
    zone.addEventListener('drop', (event) => { event.preventDefault(); onDrop(event.dataTransfer.getData('text/plain'), zoneId) })
    zone.addEventListener('click', () => { const selected = getSelected(); if (selected) onDrop(selected, zoneId) })
  })
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
