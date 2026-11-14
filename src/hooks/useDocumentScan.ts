import { useCallback } from 'react'
import { useToast, useLoader } from 'fluent-styles'
import { trackEvent } from '../services/analytics'
import { scanPages, extractScanText, deleteScanPages } from '../utils/documentScanner'

// Multi-page scan → OCR text, with the loader and toasts every screen shows.
// Quota is checked before the scanner opens and charged per page (see
// documentScanner). Resolves to null when cancelled or failed —
// the user has already been told why.
export function useDocumentScan() {
  const toast  = useToast()
  const loader = useLoader()

  const scanToText = useCallback(async (): Promise<{ text: string; pageCount: number } | null> => {
    let scan: Awaited<ReturnType<typeof scanPages>>
    trackEvent({ name: 'scan_started' })
    try {
      scan = await scanPages()
    } catch (e: any) {
      toast.error('Scanner unavailable', e?.message || 'Use "Take a photo" instead.')
      return null
    }
    if (!scan) return null
    const { pages, dropped } = scan
    if (dropped > 0) {
      toast.info(`Only ${pages.length} page${pages.length > 1 ? 's' : ''} read`, `${dropped} over your free limit ${dropped > 1 ? 'were' : 'was'} skipped.`)
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
      trackEvent({ name: 'scan_completed', params: { pages: pages.length } })
      return { text, pageCount: pages.length }
    } catch (e: any) {
      toast.error('Could not read scan', e.message)
      return null
    } finally {
      loader.hide(loadId)
      deleteScanPages(pages)
    }
  }, [toast, loader])

  return { scanToText }
}
