import { appLayout } from '../components/layout.js'
import { getStudentWorks } from '../storage/studentStorage.js'
import { formatDate } from '../utils/dates.js'
import { workStatus } from '../components/workStatus.js'

function thumbnail(type) {
  if (type === 'cat') return '<div class="thumb-cat"><i></i><span></span><b></b></div>'
  if (type === 'shapes') return '<div class="thumb-shapes"><i></i><span></span><b></b></div>'
  if (type === 'assignment') return '<div class="thumb-assignment"><i>1</i><i>2</i><i>3</i><i>4</i></div>'
  return '<div class="thumb-tree"><i></i><span></span><b></b></div>'
}

export function worksView({ student }) {
  const works = getStudentWorks()
  const content = `<section class="page-heading"><p class="eyebrow">Portfolio</p><h1>Moje prace</h1><p>Wszystko, co tworzysz, może znaleźć się tutaj.</p></section>
    <div class="works-grid">${works.map((work) => `<article class="work-card"><div class="work-thumbnail work-thumbnail--${work.data.thumbnail}" role="img" aria-label="Miniatura pracy ${work.title}">${thumbnail(work.data.thumbnail)}</div><div>${workStatus(work.status)}<span>${work.type}</span><h2>${work.title}</h2><time datetime="${work.updatedAt}">${formatDate(work.updatedAt)}</time>${['draft', 'returned'].includes(work.status) ? `<a class="text-link" href="#/work/${work.id}">Kontynuuj</a>` : ''}</div></article>`).join('')}</div>`
  return { html: appLayout(content, student, '/works') }
}
