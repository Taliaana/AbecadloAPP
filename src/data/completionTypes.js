export const completionTypes = ['automatic', 'self-check', 'teacher-review']

export function isCompletionType(value) {
  return completionTypes.includes(value)
}
