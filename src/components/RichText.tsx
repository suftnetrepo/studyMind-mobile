import React from 'react'
import { View, Text as RNText } from 'react-native'
import Markdown from 'react-native-markdown-display'
import { useColors } from '../constants'
import { useReaderFontStore } from '../stores'
import { MathView } from './MathView'

interface RichTextProps {
  content: string
  fontSize?: number
}

// Maths is typeset with KaTeX (see MathView). The Unicode conversion below is the fallback shown
// while KaTeX loads, or when it cannot render (bad LaTeX, offline):
// \frac{a}{b} -> (a)/(b), x^{2} -> x², \alpha -> α, H_2O -> H₂O, and so on.
const SYMBOLS: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η',
  theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ',
  sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠',
  approx: '≈', equiv: '≡', sim: '∼', propto: '∝', infty: '∞', partial: '∂', nabla: '∇', degree: '°',
  rightarrow: '→', to: '→', leftarrow: '←', leftrightarrow: '↔', Rightarrow: '⇒', Leftarrow: '⇐',
  Leftrightarrow: '⇔', implies: '⇒', iff: '⇔', uparrow: '↑', downarrow: '↓', rightleftharpoons: '⇌',
  sum: '∑', prod: '∏', int: '∫', oint: '∮', sqrt: '√', in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆',
  cup: '∪', cap: '∩', emptyset: '∅', forall: '∀', exists: '∃', neg: '¬', land: '∧', lor: '∨',
  therefore: '∴', because: '∵', angle: '∠', perp: '⊥', parallel: '∥', circ: '∘', bullet: '•', ldots: '…',
  cdots: '⋯', dots: '…', hbar: 'ħ', ell: 'ℓ', Re: 'ℜ', Im: 'ℑ', prime: '′', langle: '⟨', rangle: '⟩',
  lbrace: '{', rbrace: '}', quad: ' ', qquad: '  ',
}

const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ', x: 'ˣ', T: 'ᵀ',
}
const SUB: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '−': '₋', '=': '₌', '(': '₍', ')': '₎', a: 'ₐ', e: 'ₑ', o: 'ₒ', x: 'ₓ',
  i: 'ᵢ', j: 'ⱼ', n: 'ₙ', m: 'ₘ', k: 'ₖ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ',
}

function script(body: string, map: Record<string, string>, marker: string): string {
  const chars = [...body]
  return chars.every((c) => map[c]) ? chars.map((c) => map[c]).join('') : `${marker}(${body})`
}

export function latexToUnicode(expr: string): string {
  let t = expr
  t = t.replace(/\\(?:text|mathrm|mathbf|mathit|mathcal|operatorname|boldsymbol|mathbb)\{([^{}]*)\}/g, '$1')
  t = t.replace(/\\(?:left|right|big|Big|bigg|Bigg)\b\s*/g, '')
  for (let i = 0; i < 4; i++) {
    t = t.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_m, n, d) =>
      `${/^[\w.]+$/.test(n) ? n : `(${n})`}/${/^[\w.]+$/.test(d) ? d : `(${d})`}`)
    t = t.replace(/\\sqrt\[3\]\{([^{}]*)\}/g, '∛($1)')
    t = t.replace(/\\sqrt\{([^{}]*)\}/g, (_m, x) => (/^[\w.]+$/.test(x) ? `√${x}` : `√(${x})`))
  }
  t = t.replace(/\^\{([^{}]*)\}/g, (_m, b) => script(b, SUP, '^'))
  t = t.replace(/\^([0-9+\-nix])/g, (_m, b) => script(b, SUP, '^'))
  t = t.replace(/_\{([^{}]*)\}/g, (_m, b) => script(b, SUB, '_'))
  t = t.replace(/_([0-9a-z])/g, (_m, b) => script(b, SUB, '_'))
  t = t.replace(/\\([A-Za-z]+)( ?)([A-Za-z0-9]?)/g, (_m, name, sp, next) => {
    const sym = SYMBOLS[name] ?? name
    return sym + (/^\p{L}$/u.test(sym) && next ? '' : sp) + next
  })
  t = t.replace(/\\[,;:! ]/g, ' ').replace(/\\\\/g, '\n').replace(/[{}]/g, '')
  return t.replace(/[ \t]{2,}/g, ' ').trim()
}

export function preprocessMath(content: string): string {
  return content
    .replace(/\$\$([\s\S]+?)\$\$/g, (_m, e) => `\n\n**${latexToUnicode(e)}**\n\n`)
    .replace(/\\\[([\s\S]+?)\\\]/g, (_m, e) => `\n\n**${latexToUnicode(e)}**\n\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_m, e) => latexToUnicode(e))
    .replace(/\$(?!\s)([^$\n]*[^$\s\n])\$(?!\d)/g, (_m, e) => latexToUnicode(e))
}

// ─── Splitting content into text and maths ───────────────────────────────────────
// Built per call: a shared /g regex keeps its lastIndex between .test() and .matchAll().
const blockRe  = () => /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g
const inlineRe = () => /\\\(([\s\S]+?)\\\)|\$(?!\s)([^$\n]*[^$\s\n])\$(?!\d)/g

type Segment = { type: 'text'; text: string } | { type: 'block'; expr: string }

export function splitBlocks(content: string): Segment[] {
  const out: Segment[] = []
  let last = 0
  for (const m of content.matchAll(blockRe())) {
    const i = m.index ?? 0
    if (i > last) out.push({ type: 'text', text: content.slice(last, i) })
    out.push({ type: 'block', expr: (m[1] ?? m[2]).trim() })
    last = i + m[0].length
  }
  if (last < content.length) out.push({ type: 'text', text: content.slice(last) })
  return out
}

type Part = { math: false; text: string } | { math: true; expr: string }

export function splitInline(line: string): Part[] {
  const out: Part[] = []
  let last = 0
  for (const m of line.matchAll(inlineRe())) {
    const i = m.index ?? 0
    if (i > last) out.push({ math: false, text: line.slice(last, i) })
    out.push({ math: true, expr: (m[1] ?? m[2]).trim() })
    last = i + m[0].length
  }
  if (last < line.length) out.push({ math: false, text: line.slice(last) })
  return out
}

const hasInlineMath = (line: string) => inlineRe().test(line)

// Light markdown (bold / italic / code) for lines that mix text with inline maths.
type Word = { text: string; bold: boolean; italic: boolean; code: boolean; gap: boolean }

function words(text: string, st: { bold: boolean; italic: boolean; code: boolean }, gapBefore: boolean): { list: Word[]; gap: boolean } {
  const list: Word[] = []
  let gap = gapBefore
  for (const tok of text.split(/(\*\*|\*|`)/)) {
    if (tok === '**') { st.bold = !st.bold; continue }
    if (tok === '*')  { st.italic = !st.italic; continue }
    if (tok === '`')  { st.code = !st.code; continue }
    for (const piece of tok.split(/(\s+)/)) {
      if (!piece) continue
      if (/^\s+$/.test(piece)) { gap = true; continue }
      list.push({ text: piece, bold: st.bold, italic: st.italic, code: st.code, gap })
      gap = false
    }
  }
  return { list, gap }
}

function InlineLine({ line, fontSize, color, codeBg }: { line: string; fontSize: number; color: string; codeBg: string }) {
  let body = line
  let prefix: string | null = null
  let heading = false
  const li = body.match(/^\s*(?:[-*+]|\d+[.)])\s+/)
  if (li) { prefix = /\d/.test(li[0]) ? li[0].trim() : '•'; body = body.slice(li[0].length) }
  const h = body.match(/^#{1,6}\s+/)
  if (h) { heading = true; body = body.slice(h[0].length) }

  const size = heading ? fontSize + 1 : fontSize
  const st = { bold: heading, italic: false, code: false }
  let gap = false
  const nodes: React.ReactNode[] = []
  splitInline(body).forEach((p, idx) => {
    if (p.math) {
      nodes.push(
        <View key={idx} style={{ marginLeft: gap ? 4 : 0, alignSelf: 'flex-start' }}>
          <MathView expr={p.expr} display={false} color={color} fontSize={size} fallback={latexToUnicode(p.expr)} />
        </View>,
      )
      gap = false
    } else {
      const r = words(p.text, st, gap)
      gap = r.gap
      r.list.forEach((w, j) => nodes.push(
        <RNText key={`${idx}-${j}`} style={{
          color, fontSize: size, marginLeft: w.gap ? 4 : 0,
          fontFamily: w.bold ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_400Regular',
          fontStyle: w.italic ? 'italic' : 'normal',
          ...(w.code ? { fontFamily: 'monospace', backgroundColor: codeBg } : null),
        }}>{w.text}</RNText>,
      ))
    }
  })

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
      {prefix && <RNText style={{ color, fontSize: size, marginRight: 8, fontFamily: 'PlusJakartaSans_400Regular' }}>{prefix}</RNText>}
      {nodes}
    </View>
  )
}

export function RichText({ content, fontSize: baseFontSize = 14 }: RichTextProps) {
  const C = useColors()
  const scale = useReaderFontStore((s) => s.scale)
  const fontSize = Math.round(baseFontSize * scale)

  const markdownStyles = {
    body:             { color: C.textPrimary, fontSize, fontFamily: 'PlusJakartaSans_400Regular' },
    strong:           { color: C.textPrimary, fontFamily: 'PlusJakartaSans_700Bold' },
    em:               { color: C.textSecondary, fontStyle: 'italic' as const },
    bullet_list_icon: { color: C.primary, marginTop: 4 },
    bullet_list:      { marginBottom: 4 },
    list_item:        { marginBottom: 4, color: C.textPrimary },
    heading1:         { fontSize: fontSize + 3, fontFamily: 'PlusJakartaSans_700Bold', color: C.textPrimary, marginTop: 4, marginBottom: 6 },
    heading2:         { fontSize: fontSize + 1, fontFamily: 'PlusJakartaSans_700Bold', color: C.textPrimary, marginTop: 8, marginBottom: 4 },
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

  // Walk the content: display maths becomes its own typeset block, lines with inline maths flow as
  // text + typeset pieces, and everything else stays regular markdown.
  const blocks: React.ReactNode[] = []
  let buffer: string[] = []
  const flush = (key: string) => {
    if (buffer.join('').trim()) blocks.push(<Markdown key={key} style={markdownStyles}>{buffer.join('\n')}</Markdown>)
    buffer = []
  }

  splitBlocks(content).forEach((seg, si) => {
    if (seg.type === 'block') {
      flush(`m${si}`)
      blocks.push(<MathView key={`b${si}`} expr={seg.expr} display color={C.textPrimary} fontSize={fontSize + 2} fallback={latexToUnicode(seg.expr)} />)
      return
    }
    let inFence = false
    seg.text.split('\n').forEach((line, li) => {
      if (/^\s*```/.test(line)) inFence = !inFence
      if (!inFence && hasInlineMath(line)) {
        flush(`m${si}-${li}`)
        blocks.push(<InlineLine key={`i${si}-${li}`} line={line} fontSize={fontSize} color={C.textPrimary} codeBg={C.bgMuted} />)
      } else {
        buffer.push(line)
      }
    })
    flush(`m${si}-end`)
  })

  return <View>{blocks}</View>
}
