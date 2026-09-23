import React, { useRef, useState } from 'react'
import { Platform, ScrollView, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg'
import { StyledPage, Stack, StyledPressable } from 'fluent-styles'
import { Text } from '../src/components/Text'
import { useColors, useIsDark } from '../src/constants'
import { setOnboardingSeen } from '../src/stores'
import { GradientButton } from '../src/components/AuthUI'

type Accent = 'chat' | 'quiz' | 'flash'
type HeroKind = 'chat' | 'quiz' | 'notes'
const SLIDES: { icon: keyof typeof Feather.glyphMap; title: string; desc: string; accent: Accent; hero: HeroKind }[] = [
  {
    icon:  'message-circle',
    accent: 'chat', hero: 'chat',
    title: 'Ask your AI tutor anything',
    desc:  'Get instant answers grounded in your own notes and study material, with the sources cited every time.',
  },
  {
    icon:  'help-circle',
    accent: 'quiz', hero: 'quiz',
    title: 'Test yourself before the exam',
    desc:  'Turn anything you study into a quiz or a flashcard deck in seconds, generated straight from what you’ve added.',
  },
  {
    icon:  'edit-3',
    accent: 'flash', hero: 'notes',
    title: 'Notes that work with you',
    desc:  'Write notes your way, then make them searchable by AI so every study session builds on the last.',
  },
]

// Glassy app-tile hero: soft glow blobs, an orbit ring with a bright dot, and the slide's icon.
function ChatHero({ icon, accent }: { icon: keyof typeof Feather.glyphMap; accent: Accent }) {
  const C = useColors()
  const fg = { chat: C.chatColor, quiz: C.quizColor, flash: C.flashColor }[accent]
  const SIZE = 300
  return (
    <Stack width={SIZE} height={SIZE} alignItems="center" justifyContent="center" marginBottom={28}>
      <Stack position="absolute" top={6} left={0} width={190} height={190} borderRadius={95}
        backgroundColor={fg} style={{ opacity: 0.1 }} />
      <Stack position="absolute" bottom={0} left={20} width={150} height={150} borderRadius={75}
        backgroundColor={C.primary} style={{ opacity: 0.08 }} />

      {/* Orbit ring and its dot */}
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={128} stroke={fg} strokeOpacity={0.28} strokeWidth={1.2} fill="none" />
        <Circle cx={SIZE / 2 + 91} cy={SIZE / 2 - 90} r={14} fill={fg} fillOpacity={0.18} />
        <Circle cx={SIZE / 2 + 91} cy={SIZE / 2 - 90} r={6.5} fill={fg} />
      </Svg>

      {/* Tile */}
      <Stack width={172} height={172} borderRadius={52} alignItems="center" justifyContent="center"
        style={{
          overflow: 'hidden', borderWidth: 1, borderColor: `${fg}40`,
          shadowColor: fg, shadowOpacity: 0.4, shadowRadius: 30, shadowOffset: { width: 0, height: 14 }, elevation: 12,
        }}
      >
        <Svg width={172} height={172} style={{ position: 'absolute' }}>
          <Defs>
            <LinearGradient id="onb-tile" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={C.bgCard} />
              <Stop offset="1" stopColor={fg} stopOpacity={0.35} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="172" height="172" fill="url(#onb-tile)" />
        </Svg>
        <Feather name={icon} size={76} color={fg} />
      </Stack>
    </Stack>
  )
}

const SIZE = 300

// Shared backdrop: glow blob plus an orbit arc with a bright dot.
function Backdrop({ fg }: { fg: string }) {
  const C = useColors()
  return (
    <>
      <Stack position="absolute" top={20} left={30} width={240} height={240} borderRadius={120}
        backgroundColor={fg} style={{ opacity: 0.1 }} />
      <Stack position="absolute" bottom={0} right={10} width={140} height={140} borderRadius={70}
        backgroundColor={C.primary} style={{ opacity: 0.08 }} />
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={136} stroke={fg} strokeOpacity={0.3} strokeWidth={1.2} fill="none" />
        <Circle cx={SIZE / 2 + 96} cy={SIZE / 2 - 96} r={14} fill={fg} fillOpacity={0.2} />
        <Circle cx={SIZE / 2 + 96} cy={SIZE / 2 - 96} r={6.5} fill={fg} />
      </Svg>
    </>
  )
}

const glass = (fg: string, C: any) => ({
  backgroundColor: C.bgCard, borderWidth: 1, borderColor: `${fg}45`,
  shadowColor: fg, shadowOpacity: 0.32, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 10,
})

function QuizHero() {
  const C = useColors()
  const fg = C.primary
  return (
    <Stack width={SIZE} height={SIZE} alignItems="center" justifyContent="center" marginBottom={28}>
      <Backdrop fg={fg} />

      {/* Stacked cards behind */}
      <Stack width={170} height={220} borderRadius={26} style={{ ...glass(fg, C), position: 'absolute', opacity: 0.45, transform: [{ rotate: '-11deg' }, { translateX: -22 }] }} />
      <Stack width={170} height={220} borderRadius={26} style={{ ...glass(fg, C), position: 'absolute', opacity: 0.55, transform: [{ rotate: '9deg' }, { translateX: 26 }] }} />

      {/* Main quiz card */}
      <Stack width={186} height={236} borderRadius={28} padding={16} alignItems="center" gap={10}
        style={{ ...glass(fg, C), transform: [{ rotate: '-5deg' }] }}
      >
        <Stack width={46} height={46} borderRadius={23} alignItems="center" justifyContent="center"
          style={{ borderWidth: 2, borderColor: fg }}
        >
          <Feather name="help-circle" size={26} color={fg} />
        </Stack>
        {[true, false, false].map((on, i) => (
          <Stack key={i} horizontal alignItems="center" justifyContent="space-between" alignSelf="stretch"
            height={38} borderRadius={19} paddingHorizontal={12}
            backgroundColor={on ? fg : C.bgMuted}
            style={on ? { shadowColor: fg, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } } : undefined}
          >
            <Stack width={i === 0 ? 46 : 60} height={6} borderRadius={3}
              backgroundColor={on ? 'rgba(255,255,255,0.55)' : C.border} />
            {on
              ? <Feather name="check-circle" size={18} color="#FFFFFF" />
              : <Stack width={18} height={18} borderRadius={9} style={{ borderWidth: 1.5, borderColor: C.textMuted }} />}
          </Stack>
        ))}
      </Stack>

      {/* Floating tiles */}
      <Stack position="absolute" left={2} top={96} width={62} height={62} borderRadius={20} alignItems="center" justifyContent="center"
        style={{ ...glass(fg, C), transform: [{ rotate: '-12deg' }] }}
      >
        <Feather name="bar-chart-2" size={28} color={fg} />
      </Stack>
      <Stack position="absolute" right={0} top={152} width={62} height={62} borderRadius={20} alignItems="center" justifyContent="center"
        style={{ ...glass(C.quizColor, C), transform: [{ rotate: '12deg' }] }}
      >
        <Feather name="zap" size={28} color={C.quizColor} />
      </Stack>
    </Stack>
  )
}

function NotesHero() {
  const C = useColors()
  const fg = C.flashColor
  const chip = (label: string, icon: keyof typeof Feather.glyphMap, rotate: string, pos: any) => (
    <Stack horizontal alignItems="center" gap={8} borderRadius={16} paddingHorizontal={14} paddingVertical={10}
      style={{ ...glass(fg, C), position: 'absolute', ...pos, transform: [{ rotate }] }}
    >
      <Feather name={icon} size={16} color={fg} />
      <Text variant="caption" color={C.textPrimary} fontWeight="700">{label}</Text>
    </Stack>
  )
  return (
    <Stack width={SIZE} height={SIZE} alignItems="center" justifyContent="center" marginBottom={28}>
      <Backdrop fg={fg} />

      {/* Document */}
      <Stack width={176} height={222} borderRadius={26} padding={20} gap={11}
        style={{ ...glass(fg, C), transform: [{ rotate: '-7deg' }, { translateX: -8 }, { translateY: 8 }] }}
      >
        <Stack width={82} height={10} borderRadius={5} backgroundColor={fg} />
        {[124, 128, 116, 124, 84].map((w, i) => (
          <Stack key={i} width={w} height={8} borderRadius={4} backgroundColor={C.bgMuted} />
        ))}
      </Stack>

      {/* Pencil */}
      <Stack position="absolute" right={26} bottom={44} style={{ transform: [{ rotate: '4deg' }] }}>
        <Feather name="edit-2" size={78} color={fg} />
      </Stack>

      {chip('Summarise', 'star', '-8deg', { left: 0, top: 34 })}
      {chip('Improve', 'zap', '5deg', { right: -4, top: 116 })}
      {chip('Make it concise', 'minimize-2', '-6deg', { left: -4, bottom: 34 })}
    </Stack>
  )
}

function Hero({ kind, icon, accent }: { kind: HeroKind; icon: keyof typeof Feather.glyphMap; accent: Accent }) {
  if (kind === 'quiz')  return <QuizHero />
  if (kind === 'notes') return <NotesHero />
  return <ChatHero icon={icon} accent={accent} />
}

export default function OnboardingScreen() {
  const C       = useColors()
  const isDark  = useIsDark()
  const { width } = useWindowDimensions()
  const scrollRef = useRef<ScrollView>(null)
  const [index, setIndex] = useState(0)

  const isLast = index === SLIDES.length - 1

  const finish = async () => {
    await setOnboardingSeen()
    router.replace('/auth/login')
  }

  const goNext = () => {
    if (isLast) {
      finish()
      return
    }
    const next = index + 1
    scrollRef.current?.scrollTo({ x: next * width, animated: true })
    setIndex(next)
  }

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width)
    if (next !== index) setIndex(next)
  }

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <Stack horizontal justifyContent="flex-end" paddingHorizontal={20} paddingTop={12}>
        <StyledPressable onPress={finish}>
          <Text variant="bodySmall" color={C.textSecondary} fontWeight="600">Skip</Text>
        </StyledPressable>
      </Stack>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide) => (
          <Stack
            key={slide.title} alignItems="center" justifyContent="center"
            paddingHorizontal={32} style={{ width }}
          >
            <Hero kind={slide.hero} icon={slide.icon} accent={slide.accent} />
            <Text variant="header" color={C.textPrimary} fontWeight="800" textAlign="center"
              style={{ marginBottom: 12, marginHorizontal: 24, fontSize: 28, lineHeight: 34 }}
            >
              {slide.title}
            </Text>
            <Text variant="body" color={C.textSecondary} textAlign="center" style={{ lineHeight: 24, maxWidth: 330 }}>
              {slide.desc}
            </Text>
          </Stack>
        ))}
      </ScrollView>

      <Stack paddingHorizontal={24} paddingBottom={Platform.OS === 'ios' ? 20 : 28} gap={24}>
        {/* Dots */}
        <Stack horizontal alignItems="center" justifyContent="center" gap={7}>
          {SLIDES.map((slide, i) => (
            <Stack
              key={slide.title}
              width={i === index ? 22 : 7} height={7} borderRadius={4}
              backgroundColor={i === index ? C.primary : C.bgMuted}
              style={i === index ? { shadowColor: C.primary, shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } } : undefined}
            />
          ))}
        </Stack>

        <GradientButton label={isLast ? 'Get started' : 'Next'} onPress={goNext} />
      </Stack>
    </StyledPage>
  )
}
