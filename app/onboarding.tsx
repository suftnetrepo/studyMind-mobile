import React, { useRef, useState } from 'react'
import { Platform, ScrollView, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { StyledPage, Stack, StyledPressable, StyledButton } from 'fluent-styles'
import { Text } from '../src/components/Text'
import { useColors, useIsDark } from '../src/constants'
import { setOnboardingSeen } from '../src/stores'

const SLIDES: { icon: keyof typeof Feather.glyphMap; title: string; desc: string }[] = [
  {
    icon:  'message-circle',
    title: 'Ask your AI tutor anything',
    desc:  'Get instant, grounded answers from your own course materials — with sources cited, every time.',
  },
  {
    icon:  'help-circle',
    title: 'Test yourself before the exam',
    desc:  'Turn any module into a quiz or a flashcard deck in seconds, generated straight from what you’ve uploaded.',
  },
  {
    icon:  'edit-3',
    title: 'Notes that work with you',
    desc:  'Write notes your way, then make them searchable by AI so every study session builds on the last.',
  },
]

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
            padding={36} style={{ width }}
          >
            <Stack
              width={140} height={140} borderRadius={40}
              backgroundColor={C.primaryBg} alignItems="center" justifyContent="center"
              marginBottom={36}
            >
              <Feather name={slide.icon} size={56} color={C.primary} />
            </Stack>
            <Text variant="header" color={C.textPrimary} fontWeight="800" textAlign="center"
              style={{ marginBottom: 12 }}
            >
              {slide.title}
            </Text>
            <Text variant="body" color={C.textSecondary} textAlign="center" style={{ lineHeight: 23 }}>
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
            />
          ))}
        </Stack>

        <StyledButton
          backgroundColor={C.primary} borderRadius={16} paddingVertical={16}
          onPress={goNext}
          style={{
            shadowColor: C.primary, shadowOpacity: 0.35,
            shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8,
          }}
        >
          <Stack horizontal alignItems="center" justifyContent="center" gap={8}>
            <Text variant="button" color={C.white}>{isLast ? 'Get Started' : 'Next'}</Text>
            <Feather name={isLast ? 'check-circle' : 'arrow-right'} size={17} color={C.white} />
          </Stack>
        </StyledButton>
      </Stack>
    </StyledPage>
  )
}
