import { robotCommands } from '../../data/robotChallenges.js'

export function programHtml(program, parent = null) {
  return program.map((block, index) => {
    const path = parent === null ? `${index}` : `${parent}.${index}`
    const number = path.split('.').map(value => Number(value) + 1).join('-')
    const repeat = block?.type === 'repeat'
    const command = robotCommands[repeat ? 'repeat' : block]
    const label = repeat ? 'Powtórz' : command.label
    return `<li class="robot-block ${repeat ? 'robot-repeat' : ''}" draggable="true" data-index="${index}" data-path="${path}"><span><span aria-hidden="true">${command.symbol}</span> ${index + 1}. ${label}</span>
      <div><button class="button button-icon" type="button" data-move="-1" aria-label="Przesuń polecenie ${number} w górę" ${index === 0 ? 'disabled' : ''}>↑</button><button class="button button-icon" type="button" data-move="1" aria-label="Przesuń polecenie ${number} w dół" ${index === program.length - 1 ? 'disabled' : ''}>↓</button><button class="button button-icon" type="button" data-remove aria-label="Usuń polecenie ${number}">×</button></div>
      ${repeat ? `<label>Liczba powtórzeń<select data-repeat-times aria-label="Liczba powtórzeń bloczka ${index + 1}">${[2, 3, 4].map(times => `<option value="${times}" ${times === block.times ? 'selected' : ''}>${times} razy</option>`).join('')}</select></label><ol class="robot-repeat-body" data-container="${index}" aria-label="Polecenia powtarzane">${programHtml(block.body, path)}</ol><div class="robot-repeat-add" role="group" aria-label="Dodaj do powtórzenia ${index + 1}">${['forward', 'left', 'right'].map(id => `<button class="button button-secondary" type="button" data-add-child="${id}" aria-label="${robotCommands[id].label} do powtórzenia ${index + 1}">${robotCommands[id].symbol} ${robotCommands[id].label}</button>`).join('')}</div>` : ''}</li>`
  }).join('')
}

export function sequenceAt(program, path) {
  const parts = path.split('.').map(Number)
  return { sequence: parts.length === 2 ? program[parts[0]]?.body : program, index: parts.at(-1) }
}
