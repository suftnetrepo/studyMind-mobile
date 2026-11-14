import React, { useMemo, useRef, useState, useEffect } from 'react'
import { View, Text as RNText, StyleSheet } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'

// Typeset maths with KaTeX inside a tiny WebView. The Unicode `fallback` is shown while KaTeX
// loads and stays if KaTeX can't render (bad LaTeX, or no network for the CDN).
const KATEX = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist'
const GIVE_UP_MS = 8000

interface MathViewProps {
  expr: string
  display?: boolean
  color?: string
  fontSize?: number
  /** Plain-text version shown while loading and on error. */
  fallback: string
}

// Embed a string in an inline <script> without letting it close the tag or break the literal.
const jsString = (s: string) =>
  JSON.stringify(s).replace(/</g, '\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029')

function buildHtml(expr: string, display: boolean, color: string, fontSize: number) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="${KATEX}/katex.min.css">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  body { color: ${color}; font-size: ${fontSize}px; overflow-x: ${display ? 'auto' : 'hidden'}; overflow-y: hidden; }
  #m { display: ${display ? 'block' : 'inline-block'}; padding: ${display ? '2px 0' : '0'}; white-space: nowrap; ${display ? 'text-align: center;' : ''} }
  .katex { font-size: 1em; }
  .katex-display { margin: 0; }
</style>
<script src="${KATEX}/katex.min.js"></script></head>
<body><span id="m"></span>
<script>
  function post(o) { window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  try {
    var el = document.getElementById('m');
    katex.render(${jsString(expr)}, el, { displayMode: ${display ? 'true' : 'false'}, throwOnError: true, strict: 'ignore', trust: false, output: 'html' });
    var send = function () {
      var r = el.getBoundingClientRect();
      post({ t: 'size', w: Math.ceil(r.width), h: Math.ceil(r.height) + ${display ? 4 : 2} });
    };
    send();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(send);
    setTimeout(send, 400);
  } catch (e) { post({ t: 'error' }); }
</script></body></html>`
}

export function MathView({ expr, display = false, color = '#000', fontSize = 16, fallback }: MathViewProps) {
  const [size, setSize]   = useState<{ w: number; h: number } | null>(null)
  const [failed, setFail] = useState(false)
  const html = useMemo(() => buildHtml(expr, display, color, fontSize), [expr, display, color, fontSize])
  const done = useRef(false)

  // No answer in time (offline, CDN blocked): keep the readable fallback.
  useEffect(() => {
    done.current = false
    const id = setTimeout(() => { if (!done.current) setFail(true) }, GIVE_UP_MS)
    return () => clearTimeout(id)
  }, [html])

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const m = JSON.parse(e.nativeEvent.data)
      if (m.t === 'size' && m.h > 0) { done.current = true; setFail(false); setSize({ w: m.w, h: m.h }) }
      else if (m.t === 'error') { done.current = true; setFail(true) }
    } catch { /* ignore malformed messages */ }
  }

  const fallbackText = (
    <RNText style={[styles.fallback, { color, fontSize }, display && styles.center]}>{fallback}</RNText>
  )
  if (failed) return display ? <View style={styles.block}>{fallbackText}</View> : fallbackText

  const ready = size !== null
  return (
    <View style={display ? styles.block : styles.inline}>
      {!ready && fallbackText}
      <View
        pointerEvents={display ? 'auto' : 'none'}
        style={ready
          ? { height: size!.h, width: display ? '100%' : size!.w }
          : styles.hidden}
      >
        <WebView
          originWhitelist={['*']}
          source={{ html, baseUrl: 'https://cdn.jsdelivr.net/' }}
          onMessage={onMessage}
          onError={() => setFail(true)}
          onHttpError={() => setFail(true)}
          onShouldStartLoadWithRequest={(req) =>
            req.url === 'about:blank' || req.url.startsWith('https://cdn.jsdelivr.net/')}
          javaScriptEnabled
          domStorageEnabled={false}
          scrollEnabled={display}
          bounces={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          androidLayerType="hardware"
          setSupportMultipleWindows={false}
          style={styles.web}
          containerStyle={styles.web}
          opaque={false}
          backgroundColor="transparent"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  block:    { width: '100%', marginVertical: 6, alignItems: 'center' },
  inline:   { alignSelf: 'flex-start' },
  // Off-screen but with a real size: a 0x0 WebView may never run its script on iOS.
  hidden:   { height: 48, width: 320, opacity: 0, position: 'absolute', left: 0, top: 0 },
  web:      { backgroundColor: 'transparent', flex: 1 },
  fallback: { fontFamily: 'PlusJakartaSans_600SemiBold' },
  center:   { textAlign: 'center' },
})
