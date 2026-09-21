// Hand-off between the summary "create" modal screen and the summary list: the list opens the
// freshly created summary when it regains focus.
let pendingSummaryId: string | null = null

export const setPendingSummary  = (id: string) => { pendingSummaryId = id }
export const takePendingSummary = (): string | null => {
  const id = pendingSummaryId
  pendingSummaryId = null
  return id
}
