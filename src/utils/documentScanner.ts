import DocumentScanner, { ResponseType } from 'react-native-document-scanner-plugin'
import * as FileSystem from 'expo-file-system'
import { chatService } from '../services/api'
import { quotaGate, incrementQuota, remainingQuota } from './quota'

// Native multi-page document scanner: VisionKit (VNDocumentCameraViewController)
// on iOS, ML Kit on Android. Both give auto edge detection, auto-capture and
// perspective-corrected pages. Needs a development build — not Expo Go.
//
// Pinned to react-native-document-scanner-plugin 1.x on purpose: 2.x (and
// expo-document-scanner) are New Architecture only, and this app ships with
// newArchEnabled: false.
//
// Pages come back as JPEGs, not a PDF: the backend only reads PDFs that already
// contain a text layer (no OCR), so an image-only scan PDF would index as empty.
// Each page is OCR'd through /chat/extract-image instead.

export const MAX_SCAN_PAGES = 20

/**
 * Checks the scan_image quota (each page costs one), then opens the scanner
 * capped at the pages left today. Resolves to page image URIs plus how many
 * pages were dropped over the cap, or null if out of quota or cancelled.
 */
export async function scanPages(): Promise<{ pages: string[]; dropped: number } | null> {
  if (!(await quotaGate('scan_image'))) return null
  const remaining = await remainingQuota('scan_image')
  const maxPages  = Math.min(MAX_SCAN_PAGES, remaining ?? MAX_SCAN_PAGES)
  const { scannedImages, status } = await DocumentScanner.scanDocument({
    maxNumDocuments:     maxPages,   // Android only — VisionKit has no page limit
    croppedImageQuality: 70,
    responseType:        ResponseType.ImageFilePath,
  })
  if (status === 'cancel' || !scannedImages?.length) return null
  // VisionKit can't be capped, so trim here to keep OCR cost and quota bounded.
  return {
    pages:   scannedImages.slice(0, maxPages),
    dropped: Math.max(0, scannedImages.length - maxPages),
  }
}

/**
 * OCR every page, in order, charging one scan_image quota hit per page read.
 * Pages with no readable text are skipped; the result is empty if none had
 * any. `onPage` reports progress (1-based).
 */
export async function extractScanText(
  pageUris: string[],
  onPage?: (page: number, total: number) => void,
): Promise<string> {
  const parts: string[] = []
  for (let i = 0; i < pageUris.length; i++) {
    onPage?.(i + 1, pageUris.length)
    const uri    = !pageUris[i].startsWith('/') ? pageUris[i] : `file://${pageUris[i]}`
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
    const { text } = await chatService.extractFromImage(base64, 'image/jpeg')
    await incrementQuota('scan_image')
    if (!text?.trim()) continue
    parts.push(pageUris.length > 1 ? `--- Page ${i + 1} ---\n${text.trim()}` : text.trim())
  }
  return parts.join('\n\n')
}
