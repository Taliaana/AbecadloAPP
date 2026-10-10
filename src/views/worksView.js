import { appLayout } from '../components/layout.js'
import { getStudentWorks } from '../storage/studentStorage.js'
import { formatDate } from '../utils/dates.js'

function thumbnail(type) {
  if (type === 'cat') return '<div class="thumb-cat"><i></i><span></span><b></b></div>'
  if (type === 'shapes') return '<div class="thumb-shapes"><i></i><span></span><b></b></div>'
  return '<div class="thumb-tree"><i></i><span></span><b></b></div>'
}

export function worksView({ student }) {
  const works = getStudentWorks()
  const content = `<section class="page-heading"><p class="eyebrow">Portfolio</p><h1>Moje prace</h1><p>Wszystko, co tworzysz, może znaleźć się tutaj.</p></section>
    <div class="works-grid">${works.map((work) => `<article class="work-card"><div class="work-thumbnail work-thumbnail--${work.thumbnail}" role="img" aria-label="Miniatura pracy ${work.title}">${thumbnail(work.thumbnail)}</div><div><span>${work.type}</span><h2>${work.title}</h2><time datetime="${work.updatedAt}">${formatDate(work.updatedAt)}</time></div></article>`).join('')}</div>`
  return { html: appLayout(content, student, '/works') }
}
