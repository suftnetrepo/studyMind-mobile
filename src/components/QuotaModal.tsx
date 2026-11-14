/**
 * QuotaModal — shown when the backend returns 429 (server-side quota exhausted).
 *
 * Flow:
 *   1. User hits quota limit on an AI feature.
 *   2. This modal appears explaining they need Plus.
 *   3. "Upgrade to Plus" button calls POST /api/auth/magic-link (JWT-authenticated),
 *      then opens the web billing page at:
 *      https://studymind-web.onrender.com/auth/magic?token=<raw>&redirect=/billing
 *   4. The web page signs the user in seamlessly and shows the billing/upgrade page.
 */
import React, { useState } from 'react'
import { Modal, View, StyleSheet, Linking, ActivityIndicator } from 'react-native'
import { Text } from './Text'
import { authService } from '../services/api'
import { useColors } from '../constants'

const WEB_BASE = 'https://studymind-web.onrender.com'

interface QuotaModalProps {
  visible: boolean
  onClose: () => void
}

export function QuotaModal({ visible, onClose }: QuotaModalProps) {
  const C = useColors()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async () => {
    setError(null)
    setLoading(true)
    try {
      const { token } = await authService.magicLink()
      const url = `${WEB_BASE}/auth/magic?token=${encodeURIComponent(token)}&redirect=/billing`
      await Linking.openURL(url)
      onClose()
    } catch (e: any) {
      setError('Could not open the upgrade page. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card ?? '#fff' }]}>
          {/* Icon */}
          <Text style={styles.icon}>🚀</Text>

          {/* Title */}
          <Text style={[styles.title, { color: C.text }]}>
            Usage limit reached
          </Text>

          {/* Body */}
          <Text style={[styles.body, { color: C.subText ?? C.text }]}>
            You've used all your free AI credits. Upgrade to StudyMind Plus to unlock unlimited access to chat, quizzes, flashcards and summaries.
          </Text>

          {error && (
            <Text style={styles.error}>{error}</Text>
          )}

          {/* CTA */}
          <View
            style={[styles.button, { backgroundColor: C.primary ?? '#4f46e5' }, loading && styles.buttonDisabled]}
            // @ts-ignore — pressable via TouchableOpacity wrapper below
          >
            {/* We render a pressable manually to keep styles simple */}
          </View>

          <View style={styles.actions}>
            <PressableButton
              label={loading ? '' : 'Upgrade to Plus'}
              onPress={handleUpgrade}
              disabled={loading}
              primary
              colors={C}
            >
              {loading && <ActivityIndicator color="#fff" size="small" />}
            </PressableButton>

            <PressableButton
              label="Maybe later"
              onPress={onClose}
              disabled={loading}
              colors={C}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── minimal inline pressable so we have no extra dep ────────────────────────
import { Pressable } from 'react-native'

function PressableButton({
  label, onPress, disabled, primary, colors, children,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  primary?: boolean
  colors: any
  children?: React.ReactNode
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        primary
          ? { backgroundColor: colors.primary ?? '#4f46e5' }
          : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border ?? '#e5e7eb' },
        pressed && { opacity: 0.75 },
        disabled && { opacity: 0.5 },
      ]}
    >
      {children}
      {label ? (
        <Text style={[styles.btnText, primary ? { color: '#fff' } : { color: colors.text }]}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  icon: { fontSize: 44, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 20 },
  error: { color: '#dc2626', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  button: { display: 'none' },   // unused — kept to avoid unused-var lint
  buttonDisabled: {},
  actions: { width: '100%', gap: 10 },
  btn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
  },
  btnText: { fontSize: 15, fontWeight: '600' },
})
