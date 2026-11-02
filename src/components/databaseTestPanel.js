import { createDatabaseTestData, deleteDatabaseTestData, getDatabaseTestStatus, revalidate } from '../storage/studentStorage.js'

export function databaseTestPanel() {
  return `<details class="form-card no-print" data-database-test><summary>Test bazy danych</summary><p>Mały zestaw testowy pojawi się w zwykłych widokach PinkTower. Usuwanie obejmuje tylko zestawy zarejestrowane przez ten panel.</p><p data-database-status role="status">Otwórz sekcję, aby sprawdzić połączenie.</p><p data-database-feedback role="status"></p><div class="form-actions"><button type="button" class="button button-secondary" data-database-create>Utwórz dane testowe</button><button type="button" class="button button-ghost" data-database-refresh>Odśwież dane z serwera</button><button type="button" class="button button-danger" data-database-delete>Usuń dane testowe</button></div></details>`
}

export function mountDatabaseTestPanel(root, state, render) {
  const panel = root.querySelector('[data-database-test]')
  panel.open = Boolean(state.open)
  const feedback = panel.querySelector('[data-database-feedback]'), status = panel.querySelector('[data-database-status]')
  feedback.textContent = state.message || ''
  function busy(value) { panel.querySelectorAll('button').forEach(button => { button.disabled = value; button.setAttribute('aria-busy', String(value)) }) }
  async function check() {
    try { const result = await getDatabaseTestStatus(); status.textContent = `Backend i baza odpowiadają. Uczniowie testowi: ${result.students}.` }
    catch { status.textContent = 'Nie udało się połączyć z bazą. Sprawdź konfigurację i spróbuj ponownie.' }
  }
  panel.addEventListener('toggle', () => { state.open = panel.open; if (panel.open) check() })
  if (panel.open) check()
  async function action(operation, message) {
    busy(true); feedback.textContent = 'Proszę poczekać…'
    try { await operation(); await revalidate(); state.message = message; render() }
    catch (error) { feedback.textContent = error.message; busy(false); await check() }
  }
  panel.querySelector('[data-database-create]').onclick = () => action(createDatabaseTestData, 'Utworzono zestaw. Uczeń testowy jest na liście klasy, jego praca w Pracach, a zadanie w profilu ucznia.')
  panel.querySelector('[data-database-refresh]').onclick = () => action(revalidate, 'Pobrano aktualne dane z serwera.')
  panel.querySelector('[data-database-delete]').onclick = () => {
    if (window.confirm('Usunąć wszystkie zestawy utworzone przez „Test bazy danych”, wraz z ich pracami i zdjęciami? Zwykłe i zaimportowane profile pozostaną.')) action(deleteDatabaseTestData, 'Usunięto dane testowe. Zwykłe i zaimportowane dane pozostały.')
  }
}
