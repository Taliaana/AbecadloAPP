import { icon } from '../components/icons.js'
import { enterTeacher } from '../storage/studentStorage.js'

export function teacherLoginView({ navigate }) {
  return {
    focusTarget: '[data-pin]',
    html: `<main id="main-content" class="login-screen" tabindex="-1">
      <a class="text-link" href="#/welcome">${icon('back')} Wróć</a>
      <form class="login-card" data-teacher-form>
        <span class="role-icon role-icon--blue">${icon('teacher')}</span><p class="eyebrow">Panel nauczyciela</p>
        <h1>Wpisz PIN</h1><p>Wersja testowa używa prostego kodu.</p>
        <label class="pin-field"><span>PIN testowy: 1234</span><input type="password" inputmode="numeric" maxlength="4" autocomplete="off" data-pin aria-describedby="pin-error" /></label>
        <p class="form-error" id="pin-error" role="alert"></p>
        <button class="button button-primary" type="submit">Wejdź do panelu</button>
      </form>
    </main>`,
    mount(root) {
      const form = root.querySelector('[data-teacher-form]')
      const input = root.querySelector('[data-pin]')
      form.addEventListener('submit', (event) => {
        event.preventDefault()
        if (enterTeacher(input.value)) navigate('/teacher/class')
        else root.querySelector('#pin-error').textContent = 'Sprawdź PIN i spróbuj ponownie.'
      })
      input.focus()
    },
  }
}
