const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

// Dimensions are fractions of the frame, never pixels or image data in storage.
export function resizedImage({ width, height, dx, dy, frameWidth, frameHeight, ratio, proportional = false }) {
  const maxW = frameWidth * .9, maxH = frameHeight * .9
  let w = width + dx, h = height + dy
  if (proportional) {
    if (Math.abs(dx) >= Math.abs(dy)) h = w / ratio
    else w = h * ratio
    const max = Math.min(maxW, maxH * ratio)
    const min = Math.min(max, Math.max(64, 64 * ratio))
    w = clamp(w, min, max); h = w / ratio
  } else { w = clamp(w, Math.min(64, maxW), maxW); h = clamp(h, Math.min(64, maxH), maxH) }
  return { width: w / frameWidth, height: h / frameHeight }
}

export function displayImageSize(img, size) {
  const box = img.closest('.research-image-box')
  if (!box || !img.naturalWidth) return
  const frame = box.parentElement.getBoundingClientRect()
  if (!frame.width || !frame.height) return
  const ratio = img.naturalWidth / img.naturalHeight
  const fitW = Math.min(frame.width * .9, frame.height * .9 * ratio)
  box.style.width = `${clamp(size?.width || fitW / frame.width, Number.EPSILON, .9) * 100}%`
  box.style.height = `${clamp(size?.height || fitW / ratio / frame.height, Number.EPSILON, .9) * 100}%`
  box.hidden = false
}

export function mountImageResizing(root, { getSize, onChange, isDisabled }) {
  let drag = null
  const images = [...root.querySelectorAll('[data-research-image]')]
  const load = event => displayImageSize(event.target, getSize(event.target.dataset.researchImage))
  images.forEach(img => { img.addEventListener('load', load); if (img.complete) load({ target: img }) })
  function change(handle, dx, dy, shift, initial) {
    const box = handle.closest('.research-image-box'), img = box.querySelector('img')
    const frame = box.parentElement.getBoundingClientRect(), rect = initial || box.getBoundingClientRect()
    const size = resizedImage({ width: rect.width, height: rect.height, dx, dy, frameWidth: frame.width, frameHeight: frame.height, ratio: img.naturalWidth / img.naturalHeight, proportional: shift })
    displayImageSize(img, size); onChange(img.dataset.researchImage, size)
  }
  const down = event => {
    const handle = event.target.closest('[data-resize-corner]')
    if (!handle || event.button !== 0 || isDisabled()) return
    event.preventDefault(); handle.focus(); handle.setPointerCapture(event.pointerId)
    drag = { handle, pointerId: event.pointerId, x: event.clientX, y: event.clientY, rect: handle.closest('.research-image-box').getBoundingClientRect() }
  }
  const move = event => {
    if (!drag || event.pointerId !== drag.pointerId) return
    const corner = drag.handle.dataset.resizeCorner
    change(drag.handle, (event.clientX - drag.x) * (corner.includes('w') ? -1 : 1), (event.clientY - drag.y) * (corner.includes('n') ? -1 : 1), event.shiftKey, drag.rect)
  }
  const up = () => { drag = null }
  const key = event => {
    const handle = event.target.closest('[data-resize-corner]')
    if (!handle || isDisabled() || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const corner = handle.dataset.resizeCorner
    change(handle, (event.key === 'ArrowRight' ? 8 : event.key === 'ArrowLeft' ? -8 : 0) * (corner.includes('w') ? -1 : 1), (event.key === 'ArrowDown' ? 8 : event.key === 'ArrowUp' ? -8 : 0) * (corner.includes('n') ? -1 : 1), event.shiftKey)
  }
  root.addEventListener('pointerdown', down); root.addEventListener('pointermove', move)
  root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up); root.addEventListener('keydown', key)
  return () => { images.forEach(img => img.removeEventListener('load', load)); root.removeEventListener('pointerdown', down); root.removeEventListener('pointermove', move); root.removeEventListener('pointerup', up); root.removeEventListener('pointercancel', up); root.removeEventListener('keydown', key); drag = null }
}
