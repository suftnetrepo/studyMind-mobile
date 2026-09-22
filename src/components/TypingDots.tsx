import React, { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'

// Three dots pulsing in sequence, like iMessage/WhatsApp's "typing" indicator.
export function TypingDots({ color, size = 7, gap = 6 }: { color: string; size?: number; gap?: number }) {
  const values = useRef([0, 1, 2].map(() => new Animated.Value(0.4))).current

  useEffect(() => {
    const loops = values.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(v, { toValue: 1, duration: 320, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.4, duration: 320, easing: Easing.ease, useNativeDriver: true }),
          Animated.delay((2 - i) * 160),
        ])
      )
    )
    loops.forEach((l) => l.start())
    return () => loops.forEach((l) => l.stop())
  }, [values])

  return (
    <Animated.View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {values.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: size, height: size, borderRadius: size / 2, backgroundColor: color,
            marginLeft: i === 0 ? 0 : gap,
            opacity: v,
            transform: [{ scale: v.interpolate({ inputRange: [0.4, 1], outputRange: [0.85, 1.15] }) }],
          }}
        />
      ))}
    </Animated.View>
  )
}
