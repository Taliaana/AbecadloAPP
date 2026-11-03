export const desktopItems=[
  {id:'works',name:'Moje prace',type:'folder'}, {id:'images',name:'Obrazki',type:'folder'}, {id:'tasks',name:'Zadania',type:'folder'}, {id:'trash',name:'Kosz',type:'trash'},
  {id:'note',name:'Notatka.txt',type:'text',parent:'desktop',content:'Dzisiaj uczę się obsługiwać komputer. Mogę próbować i poprawiać swoją pracę.'},
  {id:'letter',name:'List.txt',type:'text',parent:'works',content:'Cześć! Zapraszam Cię do wspólnej pracy w PinkTower. Razem odkrywamy nowe rzeczy.'},
  {id:'drawing',name:'Rysunek.png',type:'image',parent:'desktop',picture:'landscape'},
  {id:'flower',name:'Kwiat.png',type:'image',parent:'images',picture:'flower'},
]
export const desktopFolders=['desktop','works','images','tasks','trash']
export const desktopFiles=desktopItems.filter(item=>item.parent)
export const desktopTasks=[
  {id:'open-folder',title:'Otwórz folder „Moje prace”.',hint:'Kliknij dwa razy. Możesz też zaznaczyć i nacisnąć Enter.'},
  {id:'open-image',title:'Otwórz „Kwiat.png” w folderze „Obrazki”.',hint:'Najpierw otwórz folder, potem obraz.'},
  {id:'window',title:'Zminimalizuj okno i przywróć je.',hint:'Kliknij kreskę w oknie. Potem wybierz okno na pasku u dołu.'},
  {id:'move-file',title:'Przenieś „Notatka.txt” do „Moje prace”.',hint:'Przeciągnij plik do folderu albo użyj „Przenieś”.'},
  {id:'trash-file',title:'Przenieś „Notatka.txt” do kosza.',hint:'Znajdź plik w „Moje prace”.'},
  {id:'restore-file',title:'Przywróć „Notatka.txt” z kosza.',hint:'Otwórz kosz, zaznacz plik i wybierz „Przywróć”.'},
]
export const DESKTOP_LESSON_STEPS=4+desktopTasks.length
const marks=['open-folder','open-image','minimize','restore-window','move-file','trash-file','restore-file']
/** @typedef {{id:string,target:string,history:string[],x:number,y:number,minimized:boolean}} DesktopWindow */
/** @typedef {{locations:Record<string,string>,restoreLocations:Record<string,string>,windows:DesktopWindow[],selected:string|null,achievements:string[]}} DesktopBoard */
/** @typedef {{version:1,currentStep:number,phase:'activity'|'complete',completedSteps:number[],puzzle:number[],board:DesktopBoard,minimized:boolean}} DesktopSession */
/** @returns {DesktopBoard} */
export function initialDesktop() {
  return {locations:Object.fromEntries(desktopFiles.map(item=>[item.id,item.parent])),restoreLocations:{},windows:[],selected:null,achievements:[]}
}
/** @returns {DesktopSession} */
export const initialDesktopSession=()=>({version:1,currentStep:1,phase:'activity',completedSteps:[],puzzle:[],board:initialDesktop(),minimized:false})
const sameKeys=(object,keys)=>object && typeof object==='object' && !Array.isArray(object) && Object.keys(object).every(key=>keys.includes(key))
export function isValidDesktopSession(s) {
  if(!sameKeys(s,['version','currentStep','phase','completedSteps','puzzle','board','minimized']) || s.version!==1 || !Number.isInteger(s.currentStep) || s.currentStep<1 || s.currentStep>DESKTOP_LESSON_STEPS || !['activity','complete'].includes(s.phase) || typeof s.minimized!=='boolean') return false
  if(!Array.isArray(s.completedSteps) || s.completedSteps.length>DESKTOP_LESSON_STEPS || !s.completedSteps.every(n=>Number.isInteger(n)&&n>=1&&n<=DESKTOP_LESSON_STEPS)) return false
  if(!Array.isArray(s.puzzle) || s.puzzle.length>4 || !s.puzzle.every(n=>[1,2,3,4].includes(n))) return false
  const b=s.board, ids=desktopFiles.map(item=>item.id)
  if(!sameKeys(b,['locations','restoreLocations','windows','selected','achievements']) || !sameKeys(b.locations,ids) || ids.some(id=>!desktopFolders.includes(b.locations[id])) || !sameKeys(b.restoreLocations,ids) || Object.values(b.restoreLocations).some(id=>!desktopFolders.includes(id)||id==='trash')) return false
  if(b.selected!==null && !desktopItems.some(item=>item.id===b.selected)) return false
  if(!Array.isArray(b.achievements) || b.achievements.length>marks.length || !b.achievements.every(mark=>marks.includes(mark))) return false
  if(!Array.isArray(b.windows) || b.windows.length>9 || b.windows.some(w=>!w||typeof w!=='object') || new Set(b.windows.map(w=>w.id)).size!==b.windows.length) return false
  return b.windows.every(w=>sameKeys(w,['id','target','history','x','y','minimized']) && [...desktopFolders,...ids].includes(w.id) && [...desktopFolders,...ids].includes(w.target) && typeof w.minimized==='boolean' && Number.isFinite(w.x)&&w.x>=0&&w.x<=1&&Number.isFinite(w.y)&&w.y>=0&&w.y<=1&&Array.isArray(w.history)&&w.history.length<=20&&w.history.every(id=>desktopFolders.includes(id)))
}
export function readDesktopSession(value) {
  if(!value) return initialDesktopSession()
  const {updatedAt,...state}=value
  return isValidDesktopSession(state)?structuredClone(state):initialDesktopSession()
}
export function desktopTaskDone(board,index) {
  const mark=desktopTasks[index]?.id
  return mark==='window'?board.achievements.includes('minimize')&&board.achievements.includes('restore-window'):board.achievements.includes(mark)
}
function mark(b,id) {if(!b.achievements.includes(id)) b.achievements.push(id)}
export function moveDesktopFile(b,id,destination) {
  if(!desktopFiles.some(item=>item.id===id) || !desktopFolders.includes(destination) || b.locations[id]===destination) return false
  if(destination==='trash') { b.restoreLocations[id]=b.locations[id]; if(id==='note') mark(b,'trash-file') }
  if(b.locations[id]==='trash' && destination!=='trash') { if(id==='note') mark(b,'restore-file');delete b.restoreLocations[id] }
  b.locations[id]=destination
  if(id==='note'&&destination==='works') mark(b,'move-file')
  return true
}
export function restoreDesktopFile(b,id) {return b.locations[id]==='trash'&&moveDesktopFile(b,id,b.restoreLocations[id]||'desktop')}
/** @param {DesktopBoard} b @param {string} target @param {string|null} existingId */
export function openDesktopWindow(b,target,existingId=null) {
  if(![...desktopFolders,...desktopFiles.map(item=>item.id)].includes(target)) return false
  let window=existingId?b.windows.find(w=>w.id===existingId):b.windows.find(w=>w.id===target)
  if(window) {
    if(window.minimized) mark(b,'restore-window')
    if(existingId&&window.target!==target) window.history=[...window.history,window.target].filter(id=>desktopFolders.includes(id)).slice(-20)
    window.target=target;window.minimized=false;b.windows=b.windows.filter(w=>w!==window)
  } else window={id:target,target,history:[],x:.18+(b.windows.length%3)*.07,y:.08+(b.windows.length%3)*.08,minimized:false}
  b.windows.push(window)
  if(target==='works') mark(b,'open-folder')
  if(target==='flower') mark(b,'open-image')
  return true
}
export function minimizeDesktopWindow(b,id) {
  const window=b.windows.find(w=>w.id===id);if(!window)return false
  window.minimized=true;mark(b,'minimize');return true
}
