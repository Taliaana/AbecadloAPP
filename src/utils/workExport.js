export function downloadWork(work, studentName = '') {
  const payload = {
    title: work.title,
    student: studentName,
    type: work.type,
    status: work.status,
    lessonId: work.lessonId,
    assignmentId: work.assignmentId,
    updatedAt: work.updatedAt,
    data: work.data,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${work.title.toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]+/gi, '-') || 'praca'}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function printWorkCard(card) {
  if (!card) return
  card.classList.add('is-print-target')
  document.body.classList.add('printing-work')
  window.print()
  document.body.classList.remove('printing-work')
  card.classList.remove('is-print-target')
}
