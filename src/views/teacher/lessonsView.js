import { teacherLayout } from '../../components/layout.js'
import { lessons } from '../../data/lessons.js'
import { escapeHtml } from '../../utils/html.js'

export function teacherLessonsView() {
  return { html:teacherLayout(`<section class="teacher-page-heading"><div><p class="eyebrow">Materiały nauczyciela</p><h1>Testuj lekcje</h1><p>Uruchom ćwiczenie bez wybierania ucznia. Test nie zapisuje postępu dzieci.</p></div><a class="button button-ghost" href="#/teacher/class">Wróć do klasy</a></section><section class="teacher-table-card" aria-label="Lekcje do testowania">${lessons.map(lesson=>`<article class="teacher-lesson-test"><div><p class="eyebrow">Lekcja ${lesson.id}</p><h2>${escapeHtml(lesson.title)}</h2></div>${lesson.implemented?`<a class="button button-primary" href="#/teacher/test-lesson/${lesson.id}">Testuj lekcję ${lesson.id}</a>`:'<span class="work-status">Materiał w przygotowaniu</span>'}</article>`).join('')}</section>`,'/teacher/class') }
}
