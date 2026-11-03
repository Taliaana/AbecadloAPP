import { appLayout } from '../components/layout.js'
import { avatar } from '../components/icons.js'
import { clearCurrentStudent, updateCurrentAvatar, retryPending } from '../storage/studentStorage.js'
import { escapeHtml } from '../utils/html.js'
import { natureFriends, natureColors, natureOptions, defaultNatureAvatar, normalizeNatureAvatar } from '../data/natureFriends.js'

const categories = [['colors','Kolory'], ['face','Twarz'], ['parts','Wzór i części'], ['accessory','Dodatki'], ['background','Tło']]
const traits = { colors:['body','belly','detail'], face:['eyes','mouth'], parts:['pattern','part'], accessory:['accessory'], background:['background'] }
const labels = { body:'Ciało', belly:'Brzuch i jasne elementy', detail:'Charakterystyczne elementy', eyes:'Oczy', mouth:'Wyraz pyszczka', pattern:'Wzór', accessory:'Dodatek', background:'Tło' }
// JSONB may return keys in a different order than the editor created them.
const sameConfig = (a,b) => Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([key,value]) => b[key] === value)

export function avatarView({ student, navigate }) {
  const saved = structuredClone(student.profile.avatarConfig || { face:'round', hair:'short', hairColor:'brown', shirtColor:'green', backgroundColor:'mint' })
  let config = structuredClone(saved), history = [], category = 'colors'
  const groups=[...new Set(natureFriends.map(friend=>friend.group))]
  let group=natureFriends.find(friend=>friend.id===config.species)?.group || groups[0]
  const profile = () => ({ ...student.profile, avatarConfig:config })
  const animal = () => normalizeNatureAvatar(config)
  const speciesHtml=()=>natureFriends.filter(friend=>friend.group===group).map(friend=>`<button class="option-pill friend-option" type="button" data-species="${friend.id}" aria-pressed="${config.kind==='nature' && config.species===friend.id}">${avatar({avatarConfig:defaultNatureAvatar(friend.id)},'large')}<span>${friend.name}</span></button>`).join('')
  function optionsHtml() {
    const c = animal(), friend = natureFriends.find(item => item.id === c.species), options = natureOptions(c.species)
    return traits[category].map(trait => `<fieldset><legend>${trait === 'part' ? friend.partLabel : labels[trait]}</legend><div class="friend-choices">${options[trait].map(([value,label]) => {
      const color = natureColors[value]
      return `<button type="button" class="option-pill friend-option" data-trait="${trait}" data-value="${value}" aria-pressed="${config.kind === 'nature' && c[trait] === value}">${color ? `<span class="friend-swatch" style="background-color:${color[1]}" aria-hidden="true"></span>` : avatar({avatarConfig:{...c,[trait]:value}},'large')}<span>${label}</span></button>`
    }).join('')}</div></fieldset>`).join('')
  }
  const content = `<section class="page-heading"><p class="eyebrow">Mój profil</p><h1>Przyjaciele Natury</h1><p>Wybierz zwierzę i nadaj mu swój wygląd.</p></section>
    <div class="avatar-editor friend-editor">
      <aside class="avatar-preview friend-preview"><div data-avatar-preview>${avatar(profile(),'xlarge')}</div><strong>${escapeHtml(student.profile.name)}</strong><p class="friend-legacy-note" ${config.kind==='nature'?'hidden':''}>Twój obecny avatar zostanie, dopóki nie zapiszesz nowego.</p>
        <div class="form-actions"><button type="button" class="button button-secondary" data-random-avatar>Losuj wygląd</button><button type="button" class="button button-ghost" data-undo-avatar disabled>Cofnij zmianę</button></div>
        <button type="button" class="button button-ghost" data-reset-avatar>Przywróć zapisany wygląd</button>
      </aside>
      <section class="avatar-options friend-options" aria-label="Wygląd przyjaciela">
        <fieldset class="friend-species"><legend>Zwierzę</legend><div class="friend-categories" role="group" aria-label="Grupy zwierząt">${groups.map(name=>`<button type="button" class="option-pill" data-animal-group="${name}" aria-pressed="${group===name}">${name}</button>`).join('')}</div><div class="friend-species-grid">${speciesHtml()}</div></fieldset>
        <div class="friend-categories" role="group" aria-label="Kategorie wyglądu">${categories.map(([key,label])=>`<button type="button" class="option-pill" data-category="${key}" aria-pressed="${key===category}">${label}</button>`).join('')}</div>
        <div data-avatar-options>${optionsHtml()}</div>
        <p class="form-feedback" role="status" data-avatar-status></p>
        <div class="form-actions"><button class="button button-primary" type="button" data-save-avatar>Zapisz avatar</button><button class="button button-secondary" type="button" data-cancel-avatar>Anuluj</button></div>
        <button class="button button-ghost" type="button" data-switch-profile>Zmień profil</button>
      </section>
    </div>`
  return { html:appLayout(content,student), mount(root) {
    let alive=true, busy=false, failedSave=false
    const status=root.querySelector('[data-avatar-status]'), controls=root.querySelector('.friend-editor')
    function update(redraw=false) {
      const currentGroup=natureFriends.find(friend=>friend.id===config.species)?.group || groups[0]
      if(group!==currentGroup) {
        group=currentGroup
        root.querySelector('.friend-species-grid').innerHTML=speciesHtml()
        root.querySelectorAll('[data-animal-group]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.animalGroup===group)))
      }
      root.querySelector('[data-avatar-preview]').innerHTML=avatar(profile(),'xlarge')
      root.querySelector('.profile-chip .avatar').outerHTML=avatar(profile(),'small')
      root.querySelector('.friend-legacy-note').hidden=config.kind==='nature'
      if(redraw) root.querySelector('[data-avatar-options]').innerHTML=optionsHtml()
      root.querySelectorAll('[data-trait]').forEach(button=>{
        const {trait,value}=button.dataset
        button.setAttribute('aria-pressed',String(config.kind==='nature' && config[trait]===value))
        // Keep variant thumbnails in sync without replacing their focused button.
        const thumbnail=button.querySelector('.nature-avatar')
        if(thumbnail) thumbnail.outerHTML=avatar({avatarConfig:{...animal(),[trait]:value}},'large')
      })
      root.querySelectorAll('.friend-species button[data-species]').forEach(button=>button.setAttribute('aria-pressed',String(config.kind==='nature' && config.species===button.dataset.species)))
      root.querySelector('[data-undo-avatar]').disabled=!history.length
    }
    function change(next, redraw=false) {
      if(sameConfig(next,config)) return
      history.push(structuredClone(config)); if(history.length>30) history.shift()
      config=next; update(redraw); status.textContent='Podgląd zmieniony. Zapisz, gdy będzie gotowy.'
    }
    controls.addEventListener('click', async event=>{
      const button=event.target.closest('button'); if(!button || busy) return
      if(button.dataset.trait) change({...animal(),[button.dataset.trait]:button.dataset.value})
      else if(button.dataset.animalGroup) {
        group=button.dataset.animalGroup
        root.querySelectorAll('[data-animal-group]').forEach(option=>option.setAttribute('aria-pressed',String(option===button)))
        root.querySelector('.friend-species-grid').innerHTML=speciesHtml()
      }
      else if(button.hasAttribute('data-species')) change(defaultNatureAvatar(button.dataset.species),true)
      else if(button.dataset.category) {
        category=button.dataset.category
        root.querySelectorAll('[data-category]').forEach(option=>option.setAttribute('aria-pressed',String(option===button)))
        root.querySelector('[data-avatar-options]').innerHTML=optionsHtml()
      } else if(button.hasAttribute('data-random-avatar')) {
        const next=animal()
        for(const[key,values] of Object.entries(natureOptions(next.species))) next[key]=values[Math.floor(Math.random()*values.length)][0]
        if(sameConfig(next,config)) next.body=natureOptions(next.species).body.find(([value])=>value!==next.body)[0]
        change(next,true)
      } else if(button.hasAttribute('data-undo-avatar')) {
        if(history.length) { config=history.pop(); update(true); status.textContent='Zmiana cofnięta.' }
      } else if(button.hasAttribute('data-reset-avatar')) change(structuredClone(saved),true)
      else if(button.hasAttribute('data-cancel-avatar')) navigate('/home')
      else if(button.hasAttribute('data-save-avatar') || button.hasAttribute('data-switch-profile')) {
        busy=true; const disabled=new Map([...controls.querySelectorAll('button')].map(control=>[control,control.disabled]))
        disabled.forEach((_,control)=>{control.disabled=true});button.setAttribute('aria-busy','true')
        try {
          if(failedSave) { await retryPending(); failedSave=false }
          if(button.hasAttribute('data-save-avatar')) { await updateCurrentAvatar(config); if(alive) navigate('/home') }
          else { await clearCurrentStudent(); if(alive) navigate('/teacher-login?prepare=student') }
        } catch { failedSave=true; if(alive) status.textContent='Nie udało się zapisać. Twój podgląd pozostał. Spróbuj ponownie.' }
        finally { if(alive) { busy=false;disabled.forEach((value,control)=>{control.disabled=value});button.removeAttribute('aria-busy') } }
      }
    })
    return ()=>{alive=false}
  } }
}
