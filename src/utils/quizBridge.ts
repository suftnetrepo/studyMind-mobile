// Hand-off between the quiz "create" modal screen and the quiz list: the list opens the freshly
// created quiz when it regains focus. (A module-level value is enough; nothing needs to re-render.)
let pendingQuizId: string | null = null

export const setPendingQuiz  = (id: string) => { pendingQuizId = id }
export const takePendingQuiz = (): string | null => {
  const id = pendingQuizId
  pendingQuizId = null
  return id
}
