import { teacherLayout } from '../../components/layout.js'
import { readLegacy, legacyImages, downloadLegacyBackup, markMigration, migrationMarker } from '../../storage/legacyStorage.js'
import { imageHash, storeImage } from '../../storage/imageStorage.js'
import { request, revalidate } from '../../storage/studentStorage.js'
import { escapeHtml } from '../../utils/html.js'
export function teacherMigrationView() {
  const legacy = readLegacy()
  return { html: teacherLayout(`<a class="text-link" href="#/teacher/class">Wróć do klasy</a><section class="form-card"><h1>Przenoszenie danych</h1><p>${legacy ? 'Znaleziono dane zapisane na tym komputerze.' : 'Na tym komputerze nie znaleziono lokalnych danych.'}</p><p>Stara kopia i zdjęcia pozostaną na komputerze. Backup JSON zawiera dane i odwołania do zdjęć, ale nie same pliki zdjęć.</p><label>Lokalna kopia<select data-legacy-key ${legacy ? '' : 'disabled'}>${(legacy?.copies || []).map(copy => `<option value="${escapeHtml(copy.key)}">${escapeHtml(copy.key)}</option>`).join('')}</select></label><p data-migration-status role="status"></p><ul data-migration-summary></ul><div data-migration-issues></div><div class="form-actions"><button class="button button-secondary" data-backup ${legacy ? '' : 'disabled'}>Pobierz kopię danych przed migracją</button><button class="button button-secondary" data-preview ${legacy ? '' : 'disabled'}>Sprawdź dane</button><button class="button button-primary" data-import disabled>Przenieś dane do PinkTower</button></div></section>`, '/teacher/class'), mount(root) {
    let payload, records, report, source = legacy?.source, extraFiles = 0
    const message = text => { root.querySelector('[data-migration-status]').textContent = text }
    const controls = busy => root.querySelectorAll('button, select').forEach(button => { button.disabled = busy || !legacy || (button.matches('[data-import]') && (!report || report.errors?.length || report.conflicts?.length || report.completed)) })
    root.querySelector('[data-legacy-key]').addEventListener('change', event => {
      report = null; source = undefined
      try { source = JSON.parse(legacy.copies.find(copy => copy.key === event.target.value).raw); message('Sprawdź wybraną kopię przed importem.') }
      catch { message('Nie można odczytać tej kopii. Pobierz backup.') }
      controls(false)
    })
    function show(result) {
      report = result
      const summary = root.querySelector('[data-migration-summary]'); summary.replaceChildren()
      for (const [key, title] of Object.entries({ students: 'Uczniowie', lessons: 'Postępy lekcji', works: 'Prace', assignments: 'Zadania', assets: 'Zdjęcia' })) { const li = document.createElement('li'); li.textContent = `${title}: ${result.summary[key]}`; summary.append(li) }
      const issues = root.querySelector('[data-migration-issues]'); issues.replaceChildren()
      for (const text of [...(result.errors || []), ...(result.conflicts || []), ...(result.warnings || []), ...(extraFiles ? [`Na komputerze są także ${extraFiles} pliki niepowiązane z wybraną kopią. Pozostaną lokalnie; sprawdź pozostałe kopie.`] : [])]) { const p = document.createElement('p'); p.textContent = text; issues.append(p) }
      controls(false)
    }
    if (legacy?.error) message(legacy.error)
    else if (migrationMarker()) message('Na tym komputerze zapisano potwierdzenie wcześniejszego importu. Możesz ponownie sprawdzić jego stan.')
    root.querySelector('[data-backup]').addEventListener('click', () => downloadLegacyBackup(legacy))
    root.querySelector('[data-preview]').addEventListener('click', async () => {
      controls(true); message('Sprawdzam lokalną kopię…')
      try {
        if (!source) throw new Error('Nie można odczytać tej kopii. Pobierz backup.')
        const allFiles = await legacyImages()
        records = allFiles.filter(record => source.students?.[record.studentId]?.works?.some(work => work.id === record.workId))
        extraFiles = allFiles.length - records.length
        const assets = []
        for (const record of records) assets.push({ id: record.id, studentId: record.studentId, workId: record.workId, mimeType: record.blob.type, size: record.blob.size, hash: await imageHash(record.blob) })
        payload = { source, assets }
        show(await request('migration/preview', payload))
        message(report.errors?.length || report.conflicts?.length ? 'Dane wymagają sprawdzenia. Niczego nie nadpisano.' : report.completed ? 'Ten import jest już zakończony.' : 'Sprawdź podsumowanie i pobierz kopię przed importem.')
      } catch (error) { message(error.message); controls(false) }
    })
    root.querySelector('[data-import]').addEventListener('click', async () => {
      controls(true)
      try {
        report = await request('migration/import', payload)
        if (report.errors?.length || report.conflicts?.length) { show(report); message('Dane wymagają sprawdzenia. Niczego nie nadpisano.'); return }
        for (let index = 0; index < records.length; index++) {
          const record = records[index]; message(`Przenoszę zdjęcie ${index + 1} z ${records.length}…`)
          await storeImage(record.blob, { workId: record.workId, importId: report.id, legacyImageId: record.id })
        }
        report = await request('migration/finalize', { importId: report.id })
        if (!report.completed) throw new Error('Nie wszystkie zdjęcia zostały zapisane. Możesz wznowić import.')
        markMigration(report.id); await revalidate(); show(report); message('Dane zostały przeniesione. Uczniowie, postępy, prace, zadania i pliki są zapisane. Lokalna kopia pozostaje na komputerze.')
      } catch (error) { message(`${error.message} Kopia lokalna pozostaje bez zmian. Sprawdź dane, aby wznowić.`); controls(false) }
    })
  } }
}
