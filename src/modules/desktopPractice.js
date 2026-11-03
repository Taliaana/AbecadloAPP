import {appLayout} from '../components/layout.js'
import {desktopActivityHtml,mountDesktopActivity} from '../components/desktopActivity.js'
import {readDesktopSession} from '../data/desktop.js'
import {getUnlockedTools,saveDesktopSession,flushData,retryPending} from '../storage/studentStorage.js'
import {createAutosave} from '../utils/autosave.js'

export function desktopPracticeView({student,navigate}) {
  if(!getUnlockedTools().includes('mouse-practice'))return {html:appLayout('<section class="empty-state"><h1>To narzędzie jeszcze czeka</h1><a class="button button-primary" href="#/workshop">Wróć do Pracowni</a></section>',student,'/workshop')}
  const session=readDesktopSession(student.toolProgress.desktop?.practice)
  const autosave=createAutosave(state=>{saveDesktopSession('practice',state).catch(()=>{})})
  return {html:appLayout(`<section class="page-heading"><a class="text-link" href="#/tools/mouse">Wróć do ćwiczeń myszy</a><p class="eyebrow">Pracownia · Ćwicz mysz</p><h1>Mój ćwiczebny pulpit</h1><p>Otwieraj foldery i układaj pliki. Możesz próbować samodzielnie.</p></section>${desktopActivityHtml(session)}`,student,'/workshop'),mount(root){
    const cleanup=mountDesktopActivity(root,{session,onChange:()=>autosave.schedule(structuredClone(session)),onSaveExit:async()=>{autosave.flush();await retryPending();await saveDesktopSession('practice',session);await flushData();navigate('/workshop')}})
    return ()=>{autosave.flush();cleanup()}
  }}
}
