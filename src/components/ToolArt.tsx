import React from 'react'
import Svg, { Defs, LinearGradient, Stop, Path, Rect, Circle, G } from 'react-native-svg'

export type ToolArtKind = 'chat' | 'quiz' | 'flashcards' | 'summary'

interface ToolArtProps { kind: ToolArtKind; color: string; id: string; width?: number; height?: number }

// Decorative background artwork for the AI tool cards.
export function ToolArt({ kind, color, id, width = 96, height = 64 }: ToolArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 66">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.4" />
          <Stop offset="1" stopColor={color} stopOpacity="0.08" />
        </LinearGradient>
      </Defs>

      {kind === 'chat' && (
        <>
          <Path d="M0 66 C14 66 22 40 40 44 C56 48 62 18 78 22 C88 24 94 12 100 6 L100 66 Z"
            fill={`url(#${id})`} />
          <Path d="M28 66 C42 66 52 46 66 50 C80 54 88 36 100 30 L100 66 Z"
            fill={color} fillOpacity="0.16" />
        </>
      )}

      {kind === 'quiz' && [18, 30, 44, 60].map((h, i) => (
        <Rect key={i} x={12 + i * 22} y={66 - h} width={14} height={h} rx={5}
          fill={`url(#${id})`} opacity={0.5 + i * 0.16} />
      ))}

      {kind === 'flashcards' && (
        <>
          <G rotation={-14} origin="60, 40">
            <Rect x={34} y={14} width={44} height={38} rx={8} fill={color} fillOpacity="0.16" />
          </G>
          <G rotation={10} origin="72, 44">
            <Rect x={48} y={20} width={44} height={38} rx={8} fill={`url(#${id})`} />
          </G>
        </>
      )}

      {kind === 'summary' && (
        <G rotation={12} origin="70, 40">
          <Rect x={44} y={14} width={44} height={50} rx={8} fill={`url(#${id})`} />
          <Rect x={52} y={26} width={28} height={4} rx={2} fill={color} fillOpacity="0.45" />
          <Rect x={52} y={36} width={22} height={4} rx={2} fill={color} fillOpacity="0.45" />
          <Rect x={52} y={46} width={26} height={4} rx={2} fill={color} fillOpacity="0.45" />
        </G>
      )}
    </Svg>
  )
}

// Laptop-with-code illustration for the module hero card.
export function LaptopArt({ accent, width = 130, height = 96 }: { accent: string; width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 130 96">
      <Defs>
        <LinearGradient id="laptop-screen" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2A2F55" />
          <Stop offset="1" stopColor="#171A33" />
        </LinearGradient>
      </Defs>
      <Rect x={16} y={8} width={92} height={62} rx={9} fill="url(#laptop-screen)" stroke={accent} strokeWidth={3} />
      {[0, 1, 2].map((i) => (
        <G key={i}>
          <Circle cx={30} cy={24 + i * 13} r={2.2} fill="#7FE3D2" />
          <Rect x={38} y={22 + i * 13} width={i === 1 ? 44 : 34} height={4} rx={2} fill="#B9C6FF" />
        </G>
      ))}
      <Path d="M6 76 L118 76 L112 84 Q111 86 108 86 L16 86 Q13 86 12 84 Z" fill={accent} fillOpacity="0.55" />
      <Circle cx={100} cy={62} r={20} fill="#FFFFFF" />
      <Path d="M93 55 L86 62 L93 69 M107 55 L114 62 L107 69 M103 53 L97 71"
        stroke={accent} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  )
}
