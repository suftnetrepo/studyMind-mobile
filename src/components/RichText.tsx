import React from 'react'
import Markdown from 'react-native-markdown-display'
import { useColors } from '../constants'
import { useReaderFontStore } from '../stores'

interface RichTextProps {
  content: string
  fontSize?: number
}

// Real LaTeX rendering needs a native module (react-native-math-view) that
// can't run under Expo Go, so math is converted to readable Unicode instead:
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

  return (
    <Markdown style={markdownStyles}>
      {preprocessMath(content)}
    </Markdown>
  )
}
