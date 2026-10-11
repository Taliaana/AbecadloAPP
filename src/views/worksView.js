import { appLayout } from '../components/layout.js'
import { getStudentWorks } from '../storage/studentStorage.js'
import { formatDate } from '../utils/dates.js'
import { escapeHtml } from '../utils/html.js'
import { workStatus } from '../components/workStatus.js'
import { robotWorkPreview } from '../components/robotBoard.js'

function thumbnail(type, work) {
  if (type === 'robot') return robotWorkPreview(work)
  if (type === 'cat') return '<div class="thumb-cat"><i></i><span></span><b></b></div>'
  if (type === 'shapes') return '<div class="thumb-shapes"><i></i><span></span><b></b></div>'
  if (type === 'assignment') return '<div class="thumb-assignment"><i>1</i><i>2</i><i>3</i><i>4</i></div>'
  return '<div class="thumb-tree"><i></i><span></span><b></b></div>'
}

export function worksView({ student }) {
  const works = getStudentWorks()
  const content = `<section class="gallery-heading"><div><p class="eyebrow">Moja galeria</p><h1>Pomysły, które już powstały</h1></div><p>Każda praca ma tutaj swoje spokojne miejsce.</p></section>
    <div class="gallery-wall" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="works-grid">${works.map((work, index) => `<article class="work-card work-card--${(index % 3) + 1}"><div class="work-frame"><div class="work-thumbnail work-thumbnail--${escapeHtml(work.data.thumbnail)}" role="img" aria-label="Miniatura pracy ${escapeHtml(work.title)}">${thumbnail(work.data.thumbnail, work)}</div></div><div class="work-caption"><div>${workStatus(work.status)}<span>${escapeHtml(work.type)}</span></div><h2>${escapeHtml(work.title)}</h2><time datetime="${escapeHtml(work.updatedAt)}">${formatDate(work.updatedAt)}</time>${['draft', 'returned'].includes(work.status) ? `<a class="text-link" href="#/work/${escapeHtml(work.id)}">Kontynuuj</a>` : ''}</div></article>`).join('')}</div>`
  return { html: appLayout(content, student, '/works') }
}
