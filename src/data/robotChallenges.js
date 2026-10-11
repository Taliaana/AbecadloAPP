export const robotCommands = {
  forward: { label: 'Idź naprzód', symbol: '↑' },
  left: { label: 'Skręć w lewo', symbol: '↶' },
  right: { label: 'Skręć w prawo', symbol: '↷' },
  repeat: { label: 'Powtórz', symbol: '↻' },
}
export const robotGroups = [
  ['sequence', 'Pierwsze trasy'], ['obstacles', 'Omijam przeszkody'],
  ['prediction', 'Przewiduję'], ['debug', 'Szukam błędu'],
  ['alternative', 'Inna droga'], ['repeat', 'Powtarzam polecenia'],
]
function challenge(id, title, group, goal, extra = {}) {
  return { id, title, group, description: 'Doprowadź robota do celu.', difficulty: group === 'sequence' ? 'pierwsze kroki' : 'kolejne kroki', gridSize: 5,
    start: { x: 1, y: 4 }, startDirection: 0, goal, obstacles: [],
    availableCommands: ['forward', 'left', 'right'], mode: 'build', expectedSkills: ['kolejność instrukcji'], completionType: 'automatic', ...extra }
}
export const robotChallenges = [
  challenge('two-steps', 'Dwa kroki', 'sequence', { x: 1, y: 2 }, { availableCommands: ['forward'] }),
  challenge('first-turn', 'Pierwszy skręt', 'sequence', { x: 2, y: 3 }),
  challenge('turns', 'Kilka skrętów', 'sequence', { x: 2, y: 1 }, { obstacles: [{ x: 1, y: 2 }, { x: 3, y: 3 }] }),
  challenge('original', 'Poznana trasa', 'sequence', { x: 3, y: 1 }),
  challenge('around-stone', 'Omiń kamień', 'obstacles', { x: 1, y: 1 }, { obstacles: [{ x: 1, y: 3 }], expectedSkills: ['omijanie przeszkód'] }),
  challenge('passage', 'Przez przejście', 'obstacles', { x: 3, y: 1 }, { obstacles: [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }], expectedSkills: ['planowanie trasy'] }),
  challenge('predict-turn', 'Gdzie zatrzyma się robot?', 'prediction', { x: 2, y: 3 }, { mode: 'predict', initialProgram: ['forward', 'right', 'forward'], expectedSkills: ['przewidywanie efektu'] }),
  challenge('predict-edge', 'Spójrz na polecenia', 'prediction', { x: 1, y: 1 }, { mode: 'predict', initialProgram: ['forward', 'forward', 'forward'], expectedSkills: ['przewidywanie efektu'] }),
  challenge('wrong-turn', 'Sprawdź skręt', 'debug', { x: 2, y: 3 }, { mode: 'debug', initialProgram: ['forward', 'left', 'forward'], expectedSkills: ['poprawianie instrukcji'] }),
  challenge('extra-step', 'Sprawdź kroki', 'debug', { x: 2, y: 3 }, { mode: 'debug', initialProgram: ['forward', 'forward', 'right', 'forward'], expectedSkills: ['usuwanie instrukcji'] }),
  challenge('missing-step', 'Dokończ program', 'debug', { x: 1, y: 2 }, { mode: 'debug', initialProgram: ['forward'], expectedSkills: ['uzupełnianie instrukcji'] }),
  challenge('another-way', 'Czy znajdziesz inną drogę?', 'alternative', { x: 3, y: 2 }, { mode: 'alternative', expectedSkills: ['alternatywne rozwiązania'] }),
  challenge('repeat-steps', 'Powtórz kroki', 'repeat', { x: 1, y: 1 }, { availableCommands: ['forward', 'left', 'right', 'repeat'], expectedSkills: ['powtarzanie instrukcji'] }),
  challenge('repeat-turns', 'Kroki i skręty', 'repeat', { x: 2, y: 3 }, { availableCommands: ['forward', 'left', 'right', 'repeat'], expectedSkills: ['powtarzanie sekwencji'] }),
]
export const getRobotChallenge = id => robotChallenges.find(item => item.id === id)
export const createRobotBoard = () => challenge('custom', 'Moja trasa', 'custom', { x: 3, y: 1 }, { mode: 'custom', completionType: 'teacher-review', expectedSkills: ['tworzenie zadania'], availableCommands: ['forward', 'left', 'right'] })
