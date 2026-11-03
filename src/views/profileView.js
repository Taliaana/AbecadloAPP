import { avatar } from '../components/icons.js'
import { brandLogo } from '../components/brand.js'
import { getAllStudents, setCurrentStudent } from '../storage/studentStorage.js'
import { escapeHtml } from '../utils/html.js'
import { profileGrade } from '../data/natureFriends.js'

export function profileView({ navigate, render }) {
  // Teacher-only device assignment; a student session cannot switch its owner.
  const students=getAllStudents()
  let grade=null
  const getGrade=student=>profileGrade(student.className ?? student.profile.className)
  function current() {
    const selected=students.filter(student=>grade==='other'?!getGrade(student):getGrade(student)===grade)
    return { html:`<main id="main-content" class="profile-screen nature-profile-screen" tabindex="-1">
      <header class="profile-intro"><a class="profile-brand" href="#/welcome" aria-label="PinkTower, wybór roli">${brandLogo('brand-logo--profile')}</a><p class="eyebrow">Nasza pracownia</p><h1>${grade ? (grade==='other'?'Pozostałe profile':`Klasa ${grade}`) : 'Znajdź swoje miejsce'}</h1><p>${grade?'Wybierz swoje imię.':'Najpierw wybierz swoją klasę.'}</p></header>
      ${grade ? `<button class="button button-ghost" type="button" data-back-grades>Wróć do wyboru klasy</button><div class="profile-grid nature-profile-grid" aria-label="Profile uczniów">${selected.map(({id,profile,className})=>`<button class="profile-card" type="button" data-profile="${escapeHtml(id)}"><span class="profile-avatar">${avatar(profile,'large')}</span><span class="profile-name">${escapeHtml(profile.name)}</span><small>${escapeHtml(className || profile.className || 'Moje miejsce')}</small></button>`).join('')}</div>${selected.length?'':'<p class="form-feedback">Nie ma jeszcze profili w tej klasie.</p>'}` : `<div class="grade-grid" aria-label="Wybór klasy">${['1','2','3'].map(number=>`<button class="grade-card grade-card--${number}" type="button" data-grade="${number}"><span class="grade-number" aria-hidden="true">${number}</span><span>Klasa ${number}</span><small>Wybierz swoje miejsce</small></button>`).join('')}</div>${students.some(student=>!getGrade(student))?'<button class="button button-ghost" type="button" data-grade="other">Pozostałe profile</button>':''}`}
      <p class="form-feedback" role="status" data-profile-status></p><a class="text-link profile-role-link" href="#/welcome">Zmień rolę</a>
    </main>`, mount(root) {
      let alive=true
      root.querySelectorAll('[data-grade]').forEach(button=>button.addEventListener('click',()=>{grade=button.dataset.grade;render(current())}))
      root.querySelector('[data-back-grades]')?.addEventListener('click',()=>{grade=null;render(current())})
      root.querySelectorAll('[data-profile]').forEach(button=>button.addEventListener('click',async()=>{
        const controls=root.querySelectorAll('button');controls.forEach(control=>{control.disabled=true});button.setAttribute('aria-busy','true')
        try { await setCurrentStudent(button.dataset.profile); if(alive) navigate('/home') }
        catch { if(alive) { root.querySelector('[data-profile-status]').textContent='Nie udało się otworzyć profilu. Spróbuj ponownie.';controls.forEach(control=>{control.disabled=false});button.removeAttribute('aria-busy') } }
      }))
      return ()=>{alive=false}
    } }
  }
  return current()
}
