import { startLesson, completeLesson, getCurrentStudent, saveDesktopSession } from '../storage/studentStorage.js'

export const studentLessonSession={ start:startLesson, complete:completeLesson, readDesktop:()=>getCurrentStudent()?.toolProgress.desktop?.lesson, saveDesktop:state=>saveDesktopSession('lesson',state) }
export function teacherLessonSession() {
  // A disposable in-memory exercise, never a pupil session or a repository write.
  let desktop
  return { preview:true, start:async(_lessonId)=>{},complete:async(_lessonId)=>{},readDesktop:()=>desktop,saveDesktop:async state=>{desktop=structuredClone(state)} }
}
