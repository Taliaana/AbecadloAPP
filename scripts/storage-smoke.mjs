globalThis.localStorage = {
  data: {},
  getItem(key) { return this.data[key] ?? null },
  setItem(key, value) { this.data[key] = value },
  removeItem(key) { delete this.data[key] },
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}

function legacyProgress() {
  return Object.fromEntries(Array.from({ length: 30 }, (_, index) => [index + 1, index === 0 ? 'in-progress' : 'locked']))
}

localStorage.setItem('abecadlo-state-v1', JSON.stringify({
  version: 1,
  currentStudentId: 'zosia',
  students: {
    zosia: {
      profile: { id: 'zosia', name: 'Zosia', greetingName: 'Zosiu', avatar: 'leaf', color: 'green' },
      progress: legacyProgress(),
      unlockedTools: ['mouse-practice'],
      typingResults: { fj: { correct: 8, attempts: 10 } },
      works: [{ id: 'legacy-work', title: 'Stara praca', type: 'Rysunek', createdAt: '2026-01-01', updatedAt: '2026-01-02', thumbnail: 'cat' }],
    },
  },
}))

const storage = await import('../src/storage/studentStorage.js')
const { implementedLessons, lessons } = await import('../src/data/lessons.js')
const { createAutosave } = await import('../src/utils/autosave.js')
const { createStepFlow, getCompletionModel } = await import('../src/components/lessonFlow.js')

storage.initializeStorage()

// Migration and backward compatibility.
const migrated = storage.getStateSnapshot()
expect(migrated.schemaVersion === 3, 'Migracja powinna ustawić schemaVersion 3.')
expect(migrated.currentRole === 'student', 'Aktywna uczennica z v1 powinna zachować rolę ucznia.')
expect(migrated.currentStudentId === 'zosia', 'Migracja powinna zachować aktywny profil.')
expect(migrated.students.zosia.progress[1] === 'in-progress', 'Migracja powinna zachować postęp lekcji.')
expect(migrated.students.zosia.toolProgress.unlockedTools.includes('mouse-practice'), 'Migracja powinna zachować narzędzia.')
expect(migrated.students.zosia.toolProgress.typingResults.fj.correct === 8, 'Migracja powinna zachować niezależny postęp Typewritingu.')
const legacyWork = storage.getWork('legacy-work')
expect(legacyWork.status === 'completed' && legacyWork.studentId === 'zosia', 'Stara praca powinna otrzymać nowy model bez utraty danych.')
expect(legacyWork.data.thumbnail === 'cat', 'Miniatura starej pracy powinna zostać przeniesiona do data.')
expect(migrated.students.zosia.profile.avatarConfig.face, 'Migracja powinna dodać konfigurację avatara.')
const migratedCustom = storage.migrateState({
  schemaVersion: 2,
  students: { kuba: { profile: { id: 'kuba', name: 'Kuba', className: '1C' }, progress: legacyProgress(), unlockedTools: ['typewriting'], works: [] } },
})
expect(migratedCustom.students.kuba.profile.name === 'Kuba', 'Migracja v2 powinna zachować profil dodany poza listą startową.')
expect(migratedCustom.students.kuba.toolProgress.unlockedTools.includes('typewriting'), 'Migracja v2 powinna przenieść postęp narzędzi własnego profilu.')
const migratedWorkCount = storage.getStudentWorks('zosia').length
storage.initializeStorage()
expect(storage.getStudentWorks('zosia').length === migratedWorkCount, 'Ponowna inicjalizacja v3 nie może duplikować prac ani resetować danych.')
expect(lessons.every((lesson) => ['automatic', 'self-check', 'teacher-review'].includes(lesson.completionType)), 'Każda lekcja powinna mieć jawny completionType.')
expect(implementedLessons.map((lesson) => lesson.id).join(',') === '1,2,3,4', 'Pole implemented powinno być jedynym źródłem listy gotowych lekcji.')
expect(storage.enterTeacher('0000') === false, 'Niepoprawny PIN nie powinien otwierać panelu nauczyciela.')
expect(storage.enterTeacher('1234') && storage.getCurrentRole() === 'teacher', 'Testowy PIN powinien otwierać rolę nauczyciela.')
storage.setCurrentStudent('zosia')

// Sequential lesson progress and student isolation.
expect(lessons.length === 30, 'Ścieżka powinna zawierać 30 lekcji.')
storage.completeLesson(1)
expect(storage.getStudentProgress('zosia')[2] === 'available', 'Ukończenie lekcji powinno odblokować wyłącznie następną.')
expect(storage.unlockLessonForStudent('zosia', 5) === false, 'Niezaimplementowanej lekcji nie można odblokować przez panel.')
expect(storage.getStudentProgress('antek')[2] === 'locked', 'Postęp uczniów musi być niezależny.')
expect(storage.completeLessonForStudent('lena', 2) === false && storage.getStudentProgress('lena')[2] === 'locked', 'Zablokowanej lekcji nie można zaliczyć z pominięciem kolejności.')
storage.setCurrentStudent('antek')
storage.completeLesson(1)
storage.completeLesson(2)
expect(storage.getUnlockedTools('antek').includes('mouse-practice'), 'Lekcja 2 powinna odblokować ćwiczenie myszy.')
expect(!storage.getUnlockedTools('zosia').includes('typewriting'), 'Narzędzia różnych uczniów nie mogą się mieszać.')
storage.updateCurrentAvatar({ hair: 'tufts', shirtColor: 'coral' })
expect(storage.getStudentById('antek').profile.avatarConfig.hair === 'tufts', 'Zmiana avatara powinna zostać zapisana w profilu.')
expect(storage.getStudentById('zosia').profile.avatarConfig.hair !== 'tufts', 'Avatary uczniów muszą być niezależne.')

// Work statuses and teacher review.
const lessonWork = storage.createWork({ studentId: 'antek', title: 'Praca lekcyjna', type: 'Studio', completionType: 'teacher-review', data: { note: 'Szkic' } })
expect(lessonWork.status === 'draft', 'Nowa praca powinna zaczynać jako draft.')
const waiting = storage.updateWork(lessonWork.id, { status: 'waiting-review' })
expect(waiting.status === 'waiting-review', 'Pokaż nauczycielowi powinno ustawić waiting-review.')
expect(storage.getPendingWorks().some((work) => work.id === lessonWork.id), 'Praca powinna trafić do kolejki nauczyciela.')
const returned = storage.reviewWork(lessonWork.id, 'returned')
expect(returned.status === 'returned', 'Nauczyciel powinien móc zwrócić pracę.')
expect(storage.getResumableWork('antek').id === lessonWork.id, 'Zwrócona praca powinna być dostępna do kontynuowania.')
storage.updateWork(lessonWork.id, { status: 'waiting-review' })
const completed = storage.reviewWork(lessonWork.id, 'completed')
expect(completed.status === 'completed', 'Nauczyciel powinien móc zakończyć pracę.')
expect(storage.reviewWork(lessonWork.id, 'returned') === null, 'Zakończonej pracy nie można zwrócić bez nowej prośby.')

const automaticWork = storage.createWork({ studentId: 'antek', title: 'Sekwencja', type: 'Sekwencje', completionType: 'automatic' })
expect(storage.updateWork(automaticWork.id, { status: 'waiting-review' }) === null, 'Automatyczne ćwiczenie nie może trafić do kolejki nauczyciela.')
expect(!storage.getPendingWorks().some((work) => work.id === automaticWork.id), 'Kolejka ma zawierać wyłącznie prace teacher-review.')

// Student profiles, classes and non-destructive archiving.
const maria = storage.createStudentProfile({ name: 'Maria', className: '1A' })
expect(maria?.progress[1] === 'available' && maria.progress[2] === 'locked', 'Nowy uczeń powinien rozpocząć od pierwszej lekcji.')
expect(maria.toolProgress.unlockedTools.length === 0, 'Nowy uczeń powinien mieć pusty postęp narzędzi.')
storage.updateStudentProfile(maria.id, { name: 'Marysia', className: '1B' })
expect(storage.getStudentById(maria.id).profile.name === 'Marysia' && storage.getStudentById(maria.id).className === '1B', 'Nauczyciel powinien móc zmienić imię i klasę.')
expect(storage.archiveStudent(maria.id), 'Archiwizacja powinna się udać.')
expect(!storage.getAllStudents().some((student) => student.id === maria.id), 'Archiwalny uczeń nie powinien być widoczny na aktywnej liście.')
expect(storage.getAllStudents({ includeArchived: true }).some((student) => student.id === maria.id), 'Archiwizacja nie może usuwać danych ucznia.')

// Additional assignments do not change course position.
const beforeAssignmentProgress = JSON.stringify(storage.getStudentProgress('lena'))
const assignment = storage.createAssignment({ title: 'Mój znak', instruction: 'Zaprojektuj prosty znak.', tool: 'studio', wholeClass: false, studentIds: ['lena'], addToCourse: true })
expect(assignment.addToCourse === true, 'Model powinien zapisywać przyszłe dodanie do programu.')
expect(storage.getAssignmentsForStudent('lena').some((item) => item.id === assignment.id), 'Zadanie powinno trafić do wskazanej uczennicy.')
expect(!storage.getAssignmentsForStudent('zosia').some((item) => item.id === assignment.id), 'Zadanie nie powinno trafić do innych uczniów.')
expect(JSON.stringify(storage.getStudentProgress('lena')) === beforeAssignmentProgress, 'Dodatkowe zadanie nie może zmieniać numeru lekcji.')

// Debounced autosave saves the newest change and can flush on exit.
let scheduledCallback = null
let savedValue = null
const fakeTimers = { setTimeout(callback) { scheduledCallback = callback; return 1 }, clearTimeout() { scheduledCallback = null } }
const autosave = createAutosave((value) => { savedValue = value }, 450, fakeTimers)
autosave.schedule({ note: 'pierwsza' })
autosave.schedule({ note: 'najnowsza' })
expect(savedValue === null && autosave.pending, 'Autosave nie powinien blokować UI natychmiastowym zapisem.')
scheduledCallback()
expect(savedValue.note === 'najnowsza' && !autosave.pending, 'Autosave powinien zapisać najnowszy stan po debounce.')
autosave.schedule({ note: 'przed wyjściem' })
expect(autosave.flush() && savedValue.note === 'przed wyjściem', 'Flush powinien zachować pracę przy wyjściu.')

// Completion screen model and gated step navigation.
const flow = createStepFlow(2)
expect(flow.continue().advanced === false, 'Nie można przejść dalej przed ukończeniem etapu.')
const firstCompletion = flow.completeStep()
expect(firstCompletion.phase === 'complete' && !firstCompletion.isFinal, 'Ukończony etap powinien pokazać ekran zakończenia.')
expect(flow.continue().advanced && flow.currentStep === 2, 'Dalej powinno przejść do kolejnego etapu dopiero z completion screen.')
expect(flow.completeStep().isFinal, 'Ostatni etap powinien zostać oznaczony jako końcowy.')
expect(flow.continue().finished, 'Dalej z ostatniego completion screen powinno kończyć przepływ.')
expect(getCompletionModel().announcement === 'Etap ukończony.', 'Model etapu powinien mieć komunikat dla aria-live.')
expect(getCompletionModel({ final: true, nextLessonId: 2, nextUnlocked: true }).nextLessonId === 2, 'Ekran lekcji powinien wskazać odblokowaną następną lekcję.')

console.log('Storage and product model smoke test: OK')
