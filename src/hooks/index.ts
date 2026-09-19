// ─── StudyMind AI — Custom Hooks ─────────────────────────────────────────────
// Architecture: Service → Hook → UI
// No Alert, no native feedback. All feedback goes through:
//   useToast      → success / error / warning / info banners
//   useDialogue   → confirm / alert / destructive confirmations
//   useNotification → rich notification banners (upload complete, etc.)
//   useLoader     → fullscreen loading overlays during async ops

import { useState, useEffect, useCallback } from 'react'
import { router } from 'expo-router'
import {
  useToast, useDialogue, useNotification, useLoader,
} from 'fluent-styles'
import { useAuthStore, useModuleStore } from '../stores'
import {
  authService, moduleService, chatService,
  quizService, flashcardService, summaryService,
} from '../services/api'

// ─── useAuth ──────────────────────────────────────────────────────────────────
export function useAuth() {
  const { setTokens, setUser, logout: storeLogout } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const toast    = useToast()
  const dialogue = useDialogue()

  const login = async (email: string, password: string) => {
    if (!email || !password) {
      toast.warning('Missing fields', 'Enter your email and password.')
      return false
    }
    setLoading(true)
    try {
      const res = await authService.login(email.trim().toLowerCase(), password)
      setTokens(res.access_token, res.refresh_token)
      const me = await authService.me() as any
      setUser(me)
      const stored = useAuthStore.getState().accessToken
      console.log('Token stored:', !!stored)
      toast.success('Welcome back!', `Signed in as ${me.full_name}`)
      router.replace('/(tabs)')
      return true
    } catch (e: any) {
      toast.error('Sign in failed', e.message || 'Check your credentials and try again.')
      return false
    } finally {
      setLoading(false)
    }
  }

  const register = async (
    email: string, password: string,
    fullName: string, role: string,
  ) => {
    if (!email || !password || !fullName) {
      toast.warning('Missing fields', 'Fill in all fields to continue.')
      return false
    }
    setLoading(true)
    try {
      await authService.register(email.trim().toLowerCase(), password, fullName, role)
      const res = await authService.login(email.trim().toLowerCase(), password)
      setTokens(res.access_token, res.refresh_token)
      const me = await authService.me() as any
      setUser(me)
      toast.success('Account created!', `Welcome, ${me.full_name}`)
      router.replace('/(tabs)')
      return true
    } catch (e: any) {
      toast.error('Registration failed', e.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    const ok = await dialogue.confirm({
      title:        'Sign out?',
      message:      'You will need to sign in again to access your modules.',
      icon:         '👋',
      confirmLabel: 'Sign out',
      cancelLabel:  'Cancel',
      destructive:  true,
    })
    if (!ok) return

    const { refreshToken } = useAuthStore.getState()
    if (refreshToken) {
      try { await authService.logout(refreshToken) } catch {}
    }
    storeLogout()
    router.replace('/auth/login')
  }

  return { login, register, logout, loading }
}

// ─── useModules ───────────────────────────────────────────────────────────────
export function useModules() {
  const [data,    setData]    = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const toast = useToast()

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await moduleService.list()
      setData(res)
    } catch (e: any) {
      setError(e.message)
      toast.error('Could not load modules', e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const enrol = async (moduleId: string) => {
    try {
      await moduleService.enrol(moduleId)
      await fetch()
      toast.success('Enrolled!', 'You now have access to this module.')
      return true
    } catch (e: any) {
      toast.error('Enrolment failed', e.message)
      return false
    }
  }

  return { data, loading, error, refetch: fetch, enrol }
}

// ─── useModuleDetail ──────────────────────────────────────────────────────────
export function useModuleDetail(moduleId: string | null) {
  const [module,    setModule]    = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [loading,   setLoading]   = useState(false)
  const toast    = useToast()
  const loader   = useLoader()
  const notification = useNotification()

  const fetch = useCallback(async () => {
    if (!moduleId) return
    setLoading(true)
    try {
      const [mod, docs] = await Promise.all([
        moduleService.get(moduleId),
        moduleService.documents(moduleId),
      ])
      setModule(mod)
      setDocuments(docs)
    } catch (e: any) {
      toast.error('Could not load module', e.message)
    } finally {
      setLoading(false)
    }
  }, [moduleId])

  useEffect(() => { fetch() }, [fetch])

  const uploadDocument = async (
    file: { uri: string; name: string; type: string },
    visibility: 'class' | 'personal' = 'class',
  ) => {
    if (!moduleId) return false
    const loadId = loader.show({ label: 'Uploading…', variant: 'dots' })
    try {
      await moduleService.uploadDocument(moduleId, file, visibility)
      loader.hide(loadId)
      notification.show({
        title:  'Document indexed',
        body:   `${file.name} was uploaded and indexed successfully.`,
        source: 'StudyMind',
        initials: '📄',
        timestamp: 'now',
        theme: 'dark',
      })
      await fetch()
      return true
    } catch (e: any) {
      loader.hide(loadId)
      toast.error('Upload failed', e.message)
      return false
    }
  }

  return { module, documents, loading, error: null, refetch: fetch, uploadDocument }
}

// ─── useChat ──────────────────────────────────────────────────────────────────
export type ScopeMode = 'everything' | 'class_only' | 'personal_only'

export interface ChatMessage {
  id:       string
  role:     'user' | 'assistant'
  content:  string
  sources?: any[]
  scope?:   any
  loading?: boolean
}

export function useChat(moduleId?: string | null) {
  const [messages,  setMessages]  = useState<ChatMessage[]>([])
  const [sending,   setSending]   = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [scopeMode, setScopeMode] = useState<ScopeMode>('everything')
  const [sessions,  setSessions]  = useState<any[]>([])
  const toast = useToast()

  const loadSessions = useCallback(async () => {
    try {
      const res = await chatService.sessions(moduleId || undefined)
      setSessions(res)
    } catch {}
  }, [moduleId])

  useEffect(() => { loadSessions() }, [loadSessions])

  const send = async (text: string) => {
    if (!text.trim() || sending) return
    setSending(true)

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text }
    const loadingMsg: ChatMessage = { id: 'loading', role: 'assistant', content: '', loading: true }
    setMessages((prev) => [...prev, userMsg, loadingMsg])

    try {
      const res = await chatService.send(
        text, moduleId || undefined, sessionId || undefined, scopeMode,
      )
      if (!sessionId) setSessionId(res.session_id)
      const botMsg: ChatMessage = {
        id:      res.message_id,
        role:    'assistant',
        content: res.answer,
        sources: res.sources,
        scope:   res.scope,
      }
      setMessages((prev) => [...prev.filter((m) => m.id !== 'loading'), botMsg])
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== 'loading'))
      toast.error('Message failed', e.message || 'Could not reach the AI. Try again.')
    } finally {
      setSending(false)
    }
  }

  const clearMessages = () => { setMessages([]); setSessionId(null) }

  return { messages, sending, scopeMode, setScopeMode, sessions, send, clearMessages }
}

// ─── useQuiz ──────────────────────────────────────────────────────────────────
export type QuizPhase = 'setup' | 'taking' | 'results'
export type QType = 'mcq' | 'true_false'

export function useQuiz(moduleId?: string | null) {
  const [phase,      setPhase]      = useState<QuizPhase>('setup')
  const [attempt,    setAttempt]    = useState<any>(null)
  const [answers,    setAnswers]    = useState<Record<string, string>>({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [results,    setResults]    = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [history,    setHistory]    = useState<any[]>([])

  const toast        = useToast()
  const dialogue     = useDialogue()
  const notification = useNotification()
  const loader       = useLoader()

  const loadHistory = useCallback(async () => {
    if (!moduleId) return
    try {
      const res = await quizService.history(moduleId)
      setHistory(res)
    } catch {}
  }, [moduleId])

  useEffect(() => { loadHistory() }, [loadHistory])

  const generate = async (questionCount: number, questionType: QType) => {
    if (!moduleId) {
      toast.warning('No module selected', 'Open a module before generating a quiz.')
      return
    }
    setGenerating(true)
    const loadId = loader.show({ label: 'Generating quiz…', variant: 'dots' })
    try {
      const res = await quizService.generate(moduleId, questionCount, questionType)
      setAttempt(res)
      setAnswers({})
      setCurrentIdx(0)
      setResults(null)
      setPhase('taking')
      notification.show({
        title:    'Quiz ready!',
        body:     `${res.questions.length} questions generated from your materials.`,
        source:   'StudyMind',
        initials: '📝',
        timestamp: 'now',
        theme:    'dark',
      })
    } catch (e: any) {
      toast.error('Generation failed', e.message)
    } finally {
      loader.hide(loadId)
      setGenerating(false)
    }
  }

  const answer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const next = () => {
    if (attempt && currentIdx < attempt.questions.length - 1) {
      setCurrentIdx((n) => n + 1)
    }
  }

  const prev = () => setCurrentIdx((n) => Math.max(0, n - 1))

  const submit = async () => {
    if (!attempt) return
    const total       = attempt.questions.length
    const answeredCnt = Object.keys(answers).length
    if (answeredCnt < total) {
      const remaining = total - answeredCnt
      toast.warning(
        `${remaining} question${remaining > 1 ? 's' : ''} unanswered`,
        'Answer all questions before submitting.',
      )
      return
    }
    setSubmitting(true)
    const loadId = loader.show({ label: 'Submitting…', variant: 'spinner' })
    try {
      const answersArr = Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }))
      const res = await quizService.submit(attempt.id, answersArr)
      setResults(res)
      setPhase('results')
      await loadHistory()
      const pct = Math.round(res.score)
      if (pct >= 70) {
        notification.show({
          title:    `Great score — ${pct}%!`,
          body:     `${res.correct} of ${res.total} correct. Well done!`,
          source:   'StudyMind Quiz',
          initials: '🎉',
          timestamp: 'now',
          theme:    'dark',
        })
      } else {
        toast.info(`Score: ${pct}%`, `${res.correct}/${res.total} correct — review the explanations below.`)
      }
    } catch (e: any) {
      toast.error('Submission failed', e.message)
    } finally {
      loader.hide(loadId)
      setSubmitting(false)
    }
  }

  const reset = async () => {
    if (phase === 'taking' && Object.keys(answers).length > 0) {
      const ok = await dialogue.confirm({
        title:        'Abandon quiz?',
        message:      'Your answers will be lost.',
        icon:         '⚠️',
        confirmLabel: 'Abandon',
        cancelLabel:  'Keep going',
        destructive:  true,
      })
      if (!ok) return
    }
    setPhase('setup')
    setAttempt(null)
    setAnswers({})
    setCurrentIdx(0)
    setResults(null)
  }

  const currentQuestion = attempt?.questions?.[currentIdx] ?? null
  const totalQuestions  = attempt?.questions?.length ?? 0
  const progress        = totalQuestions ? (currentIdx + 1) / totalQuestions : 0
  const answered        = Object.keys(answers).length

  return {
    phase, attempt, answers, currentQuestion, currentIdx,
    totalQuestions, progress, answered,
    results, generating, submitting, history,
    generate, answer, next, prev, submit, reset,
  }
}

// ─── useFlashcards ────────────────────────────────────────────────────────────
export function useFlashcards(moduleId?: string | null) {
  const [deck,       setDeck]       = useState<any>(null)
  const [decks,      setDecks]      = useState<any[]>([])
  const [cardIdx,    setCardIdx]    = useState(0)
  const [flipped,    setFlipped]    = useState(false)
  const [generating, setGenerating] = useState(false)
  const [updating,   setUpdating]   = useState(false)

  const toast        = useToast()
  const loader       = useLoader()
  const notification = useNotification()

  const loadDecks = useCallback(async () => {
    if (!moduleId) return
    try {
      const res = await flashcardService.list(moduleId)
      setDecks(res)
    } catch {}
  }, [moduleId])

  useEffect(() => { loadDecks() }, [loadDecks])

  const generate = async (maxCards: number) => {
    if (!moduleId) {
      toast.warning('No module selected', 'Open a module first.')
      return
    }
    setGenerating(true)
    const loadId = loader.show({ label: 'Generating flashcards…', variant: 'dots' })
    try {
      const res = await flashcardService.generate(moduleId, maxCards)
      setDeck(res)
      setCardIdx(0)
      setFlipped(false)
      await loadDecks()
      notification.show({
        title:    'Flashcards ready!',
        body:     `${res.card_count} cards generated from your materials.`,
        source:   'StudyMind',
        initials: '🃏',
        timestamp: 'now',
        theme:    'dark',
      })
    } catch (e: any) {
      toast.error('Generation failed', e.message)
    } finally {
      loader.hide(loadId)
      setGenerating(false)
    }
  }

  const flip = () => setFlipped((f) => !f)

  const updateCard = async (status: 'new' | 'learning' | 'mastered') => {
    if (!deck || updating) return
    const card = deck.cards[cardIdx]
    if (!card) return
    setUpdating(true)
    try {
      await flashcardService.updateCard(deck.id, card.id, status)
      const updatedCards  = deck.cards.map((c: any) =>
        c.id === card.id ? { ...c, status } : c,
      )
      const masteredCount = updatedCards.filter((c: any) => c.status === 'mastered').length
      setDeck({ ...deck, cards: updatedCards, mastered_count: masteredCount })

      if (cardIdx < deck.cards.length - 1) {
        setCardIdx((n) => n + 1)
        setFlipped(false)
      } else {
        // Deck complete
        notification.show({
          title:    'Deck complete! 🎉',
          body:     `You've reviewed all ${deck.card_count} cards. ${masteredCount} mastered.`,
          source:   'StudyMind',
          initials: '🃏',
          timestamp: 'now',
          theme:    'dark',
        })
      }
    } catch (e: any) {
      toast.error('Update failed', e.message)
    } finally {
      setUpdating(false)
    }
  }

  const openDeck = async (deckId: string) => {
    const loadId = loader.show({ label: 'Loading deck…', variant: 'spinner' })
    try {
      const res = await flashcardService.getDeck(deckId)
      setDeck(res)
      setCardIdx(0)
      setFlipped(false)
    } catch (e: any) {
      toast.error('Could not load deck', e.message)
    } finally {
      loader.hide(loadId)
    }
  }

  const closeDeck = () => { setDeck(null); setCardIdx(0); setFlipped(false) }

  const currentCard   = deck?.cards?.[cardIdx] ?? null
  const masteredCount = deck?.mastered_count ?? 0
  const totalCards    = deck?.card_count ?? 0
  const progressPct   = totalCards ? Math.round((masteredCount / totalCards) * 100) : 0

  return {
    deck, decks, cardIdx, flipped, currentCard,
    masteredCount, totalCards, progressPct,
    generating, updating,
    generate, flip, updateCard, openDeck, closeDeck,
  }
}

// ─── useSummary ───────────────────────────────────────────────────────────────
export type SummaryScope = 'module' | 'week' | 'document'

export function useSummary(moduleId?: string | null) {
  const [summary,    setSummary]    = useState<any>(null)
  const [summaries,  setSummaries]  = useState<any[]>([])
  const [generating, setGenerating] = useState(false)

  const toast        = useToast()
  const loader       = useLoader()
  const notification = useNotification()

  const loadSummaries = useCallback(async () => {
    if (!moduleId) return
    try {
      const res = await summaryService.list(moduleId)
      setSummaries(res)
    } catch {}
  }, [moduleId])

  useEffect(() => { loadSummaries() }, [loadSummaries])

  const generate = async (scope: SummaryScope) => {
    if (!moduleId) {
      toast.warning('No module selected', 'Open a module first.')
      return
    }
    setGenerating(true)
    const loadId = loader.show({ label: 'Generating summary…', variant: 'dots' })
    try {
      const res = await summaryService.generate(moduleId, scope)
      setSummary(res)
      await loadSummaries()
      notification.show({
        title:    'Summary ready!',
        body:     `AI summary generated from ${res.source_doc_count} documents.`,
        source:   'StudyMind',
        initials: '📋',
        timestamp: 'now',
        theme:    'dark',
      })
    } catch (e: any) {
      toast.error('Generation failed', e.message)
    } finally {
      loader.hide(loadId)
      setGenerating(false)
    }
  }

  const openSummary = async (summaryId: string) => {
    const loadId = loader.show({ label: 'Loading…', variant: 'spinner' })
    try {
      const res = await summaryService.get(summaryId)
      setSummary(res)
    } catch (e: any) {
      toast.error('Could not load summary', e.message)
    } finally {
      loader.hide(loadId)
    }
  }

  const closeSummary = () => setSummary(null)

  return { summary, summaries, generating, generate, openSummary, closeSummary }
}
