// Hand-off between the flashcard "create" modal screen and the deck list: the list opens the
// freshly created deck when it regains focus.
let pendingDeckId: string | null = null

export const setPendingDeck  = (id: string) => { pendingDeckId = id }
export const takePendingDeck = (): string | null => {
  const id = pendingDeckId
  pendingDeckId = null
  return id
}
