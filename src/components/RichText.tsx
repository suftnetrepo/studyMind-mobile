import React from 'react'
import Markdown from 'react-native-markdown-display'
import { useColors } from '../constants'

interface RichTextProps {
  content: string
  fontSize?: number
}

// TODO: render real LaTeX via react-native-math-view once this app has a
// native dev client (expo prebuild). It ships real iOS/Android native code
// (ios/RNMathView.podspec, android/build.gradle) and can't run under plain
// Expo Go, which this project currently uses — no ios/android folders, no
// expo-dev-client. Until then, math source is shown as inline code so it's
// at least visually distinguished rather than rendered as raw "$...$" text.
function preprocessMath(content: string): string {
  return content
    .replace(/\$\$([^$]+)\$\$/g, (_match, expr) => `\n\n\`${expr.trim()}\`\n\n`)
    .replace(/\$([^$\n]+)\$/g, (_match, expr) => `\`${expr.trim()}\``)
}

export function RichText({ content, fontSize = 14 }: RichTextProps) {
  const C = useColors()

  const markdownStyles = {
    body:             { color: C.textPrimary, fontSize, fontFamily: 'PlusJakartaSans_400Regular' },
    strong:           { color: C.textPrimary, fontFamily: 'PlusJakartaSans_700Bold' },
    em:               { color: C.textSecondary, fontStyle: 'italic' as const },
    bullet_list_icon: { color: C.primary, marginTop: 4 },
    bullet_list:      { marginBottom: 4 },
    list_item:        { marginBottom: 4, color: C.textPrimary },
    heading2:         { fontSize: fontSize + 2, fontFamily: 'PlusJakartaSans_700Bold', color: C.textPrimary, marginTop: 8, marginBottom: 4 },
    heading3:         { fontSize: fontSize + 1, fontFamily: 'PlusJakartaSans_600SemiBold', color: C.textPrimary, marginTop: 6, marginBottom: 3 },
    paragraph:        { marginBottom: 6, color: C.textPrimary },
    code_block:       { backgroundColor: C.bgMuted, borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: fontSize - 1 },
    code_inline:      { backgroundColor: C.bgMuted, borderRadius: 4, paddingHorizontal: 4, fontFamily: 'monospace', fontSize: fontSize - 1 },
    blockquote:       { backgroundColor: C.primaryBg, borderLeftColor: C.primary, borderLeftWidth: 3, paddingLeft: 10, marginVertical: 4 },
    fence:            { backgroundColor: C.bgMuted, borderRadius: 8, padding: 12 },
    table:            { borderWidth: 1, borderColor: C.border, borderRadius: 8, marginVertical: 8 },
    th:               { backgroundColor: C.bgMuted, padding: 8, fontFamily: 'PlusJakartaSans_600SemiBold' },
    td:               { padding: 8, borderTopWidth: 1, borderColor: C.border },
  }

  return (
    <Markdown style={markdownStyles}>
      {preprocessMath(content)}
    </Markdown>
  )
}
