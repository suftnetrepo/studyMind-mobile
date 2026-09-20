import React from 'react'
import Svg, { Defs, LinearGradient, Stop, Path, Rect } from 'react-native-svg'

interface MiniChartProps {
  id:     string   // unique per instance — SVG gradient ids are global
  color:  string
  width?:  number
  height?: number
}

export function AreaChart({ id, color, width = 60, height = 36 }: MiniChartProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 60">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.45" />
          <Stop offset="1" stopColor={color} stopOpacity="0.08" />
        </LinearGradient>
      </Defs>
      <Path
        d="M0 50 C14 50 18 38 32 40 C46 42 52 50 66 34 C80 18 88 14 100 4 L100 60 L0 60 Z"
        fill={`url(#${id})`}
      />
      <Path
        d="M0 50 C14 50 18 38 32 40 C46 42 52 50 66 34 C80 18 88 14 100 4"
        fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.7"
      />
    </Svg>
  )
}

const BAR_HEIGHTS = [22, 34, 44, 58]

export function BarChart({ id, color, width = 60, height = 36 }: MiniChartProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 60">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.95" />
          <Stop offset="1" stopColor={color} stopOpacity="0.55" />
        </LinearGradient>
      </Defs>
      {BAR_HEIGHTS.map((h, i) => (
        <Rect
          key={i}
          x={i * 26} y={60 - h} width={18} height={h} rx={5}
          fill={`url(#${id})`}
          opacity={0.35 + i * 0.22}
        />
      ))}
    </Svg>
  )
}
