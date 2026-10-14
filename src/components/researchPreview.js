import { boardItems, getResearchBoard } from '../data/researchBoards.js'
import { readImage } from '../storage/imageStorage.js'
import { displayImageSize } from '../utils/researchImageResize.js'
import { escapeHtml } from '../utils/html.js'

export function researchPreview(work) {
  const board = getResearchBoard(work.data.boardId)
  if (!board) return '<p>Nie znaleziono tablicy.</p>'
  return `<div class="research-groups">${board.groups.map(group => `<section><h2>${escapeHtml(group.title)}</h2>${group.items.map(item => `<article class="research-item"><h3>${escapeHtml(item.title)}</h3><div class="research-photo-frame research-photo"><div class="research-image-box" hidden><img data-research-image="${item.id}" alt="${escapeHtml(item.title)}" hidden /></div></div><p>Źródło: <span>${escapeHtml(work.data.entries?.[item.id]?.source || 'Jeszcze nie dodano')}</span></p></article>`).join('')}</section>`).join('')}</div><section><h2>Przyjrzyj się swoim zdjęciom.</h2>${board.reflectionQuestions.map((question, index) => `<p><strong>${escapeHtml(question)}</strong><br>${escapeHtml(work.data.answers?.[index] || 'Bez odpowiedzi')}</p>`).join('')}</section>`
}

export function mountResearchImages(root, work, onMissing = () => {}) {
  const urls = new Map()
  let disposed = false
  const board = getResearchBoard(work.data.boardId)
  const ready = Promise.all(boardItems(board).map(async item => {
    const id = work.data.entries?.[item.id]?.imageId
    if (!id) return
    try {
      const blob = await readImage(id, { studentId: work.studentId, workId: work.id })
      if (disposed) return
      if (!blob) { onMissing(item.id); return }
      const img = root.querySelector(`[data-research-image="${item.id}"]`)
      if (img && (!img.dataset.imageId || img.dataset.imageId === id)) {
        const url = URL.createObjectURL(blob); urls.set(item.id, url)
        img.addEventListener('load', () => displayImageSize(img, work.data.entries?.[item.id]?.imageSize), { once: true }); img.src = url; img.hidden = false
      }
    } catch { if (!disposed) onMissing(item.id, 'unavailable') }
  }))
  return { ready, dispose() { disposed = true; urls.forEach(url => URL.revokeObjectURL(url)) } }
}
