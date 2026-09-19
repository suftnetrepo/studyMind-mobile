import * as Clipboard from 'expo-clipboard'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system'

type Toast = { success: (title: string, desc?: string) => number; error: (title: string, desc?: string) => number }

// Strips the same inline citation junk the chat bubble hides from the user
// (see app/chat/index.tsx) so copied/shared/exported text matches what's
// actually shown on screen.
function stripCitations(text: string): string {
  return text
    .replace(/\[[^\]]*?(?:chunk|\.pdf|\.docx|\.txt|\.md)[^\]]*?\]/gi, '')
    .replace(/\[\s*[^,\]]+\s*,\s*chunk\s*\d+\s*\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function copyToClipboard(text: string, toast: Toast) {
  await Clipboard.setStringAsync(text)
  toast.success('Copied!', 'Text copied to clipboard.')
}

export async function shareText(text: string, filename: string, toast: Toast) {
  try {
    const isAvailable = await Sharing.isAvailableAsync()
    if (!isAvailable) {
      // Fallback to clipboard
      await Clipboard.setStringAsync(text)
      toast.success('Copied!', 'Sharing not available — copied to clipboard instead.')
      return
    }
    // Write to temp file so we can share as a document
    const uri = FileSystem.cacheDirectory + filename
    await FileSystem.writeAsStringAsync(uri, text, { encoding: FileSystem.EncodingType.UTF8 })
    await Sharing.shareAsync(uri, {
      mimeType:    'text/plain',
      dialogTitle: 'Share',
      UTI:         'public.plain-text',
    })
  } catch (e: any) {
    toast.error('Share failed', e.message)
  }
}

export function formatConversationForExport(messages: any[], title: string): string {
  const lines = [
    `StudyMind AI — ${title}`,
    `Exported: ${new Date().toLocaleString()}`,
    '─'.repeat(50),
    '',
  ]
  messages.forEach((m) => {
    if (m.loading) return
    const role = m.role === 'user' ? 'You' : 'StudyMind AI'
    lines.push(`${role}:`)
    lines.push(m.role === 'user' ? m.content : stripCitations(m.content))
    if (m.sources?.length) {
      lines.push(`Sources: ${m.sources.map((s: any) => s.filename).join(', ')}`)
    }
    lines.push('')
  })
  return lines.join('\n')
}

export function formatSummaryForExport(summary: any, courseCode: string): string {
  return [
    `StudyMind AI — ${courseCode} Summary`,
    `Scope: ${summary.scope} | Sources: ${summary.source_doc_count} documents`,
    `Generated: ${new Date(summary.created_at).toLocaleString()}`,
    '─'.repeat(50),
    '',
    summary.content,
  ].join('\n')
}
