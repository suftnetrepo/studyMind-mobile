import { useCallback } from 'react'
import { useToast, useLoader } from 'fluent-styles'
import { scanPages, extractScanText } from '../utils/documentScanner'

// Multi-page scan → OCR text, with the loader and toasts every screen shows.
// Quota is checked before the scanner opens and charged per page (see
// documentScanner). Resolves to null when cancelled, out of quota, or failed —
// the user has already been told why.
export function useDocumentScan() {
  const toast  = useToast()
  const loader = useLoader()

  const scanToText = useCallback(async (): Promise<{ text: string; pageCount: number } | null> => {
    let scan: Awaited<ReturnType<typeof scanPages>>
    try {
      scan = await scanPages()
    } catch (e: any) {
      toast.error('Scanner unavailable', e?.message || 'Use "Take a photo" instead.')
      return null
    }
    if (!scan) return null
    const { pages, dropped } = scan
    if (dropped > 0) {
      toast.info(`Only ${pages.length} page${pages.length > 1 ? 's' : ''} read`, `${dropped} over today's limit ${dropped > 1 ? 'were' : 'was'} skipped.`)
    }
    const loadId = loader.show({
      label: pages.length > 1 ? `Reading ${pages.length} pages…` : 'Reading page…',
      variant: 'dots',
    })
    try {
      const text = await extractScanText(pages)
      if (!text.trim()) {
        toast.warning('No text found', 'Try again with the pages in clear view.')
        return null
      }
      return { text, pageCount: pages.length }
    } catch (e: any) {
      toast.error('Could not read scan', e.message)
      return null
    } finally {
      loader.hide(loadId)
    }
  }, [toast, loader])

  return { scanToText }
}
