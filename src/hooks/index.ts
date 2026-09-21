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
import { useAuthStore, useModuleStore, usePremiumStore } from '../stores'
import { identifyUser } from '../services/premiumService'
import { quotaGate, incrementQuota } from '../utils/quota'
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
    identifyUser(null).catch(() => {})
    usePremiumStore.getState().setEntitlement(false, null)
    router.replace('/auth/login')
  }

  const deleteAccount = async () => {
    const ok = await dialogue.confirm({
      title:        'Delete your account?',
      message:      'This permanently deletes your account, courses, documents, chats, quizzes, flashcards and notes progress. This cannot be undone.',
      icon:         '⚠️',
      confirmLabel: 'Delete account',
      cancelLabel:  'Cancel',
      destructive:  true,
    })
    if (!ok) return
    try {
      await authService.deleteMe()
    } catch (e: any) {
      toast.error('Could not delete account', e.message || 'Please try again.')
      return
    }
    storeLogout()
    identifyUser(null).catch(() => {})
    usePremiumStore.getState().setEntitlement(false, null)
    toast.success('Account deleted', 'Your data has been removed.')
    router.replace('/auth/login')
  }

  return { login, register, logout, deleteAccount, loading }
}

// ─── useModules ───────────────────────────────────────────────────────────────
export function useModules() {
  const [data,    setData]    = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const toast = useToast()

  // `silent` skips the loading skeleton so focus/pull refreshes don't flicker.
  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
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
      await fetch(true)
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
  const [sessions,  setSessions]  = useState<any[]>([])
  const [loading,   setLoading]   = useState(false)
  const toast    = useToast()
  const dialogue = useDialogue()
  const loader   = useLoader()
  const notification = useNotification()

  const fetch = useCallback(async () => {
    if (!moduleId) return
    setLoading(true)
    try {
      const [mod, docs, sessionList] = await Promise.all([
        moduleService.get(moduleId),
        moduleService.documents(moduleId),
        chatService.sessions(moduleId),
      ])
      setModule(mod)
      setDocuments(docs)
      setSessions(sessionList)
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

  const deleteDocument = async (documentId: string, filename: string) => {
    if (!moduleId) return false
    const ok = await dialogue.confirm({
      title:        'Delete document?',
      message:      `"${filename}" and its indexed content will be permanently removed. The AI will no longer use it.`,
      icon:         '🗑️',
      confirmLabel: 'Delete',
      cancelLabel:  'Cancel',
      destructive:  true,
    })
    if (!ok) return false
    try {
      await moduleService.deleteDocument(moduleId, documentId)
      toast.success('Deleted', 'The document has been removed.')
      await fetch()
      return true
    } catch (e: any) {
      toast.error('Could not delete', e.message)
      return false
    }
  }

  const deleteSession = async (sessionId: string, title: string) => {
    const ok = await dialogue.confirm({
      title:        'Delete conversation?',
      message:      `"${title || 'This conversation'}" and all its messages will be permanently removed.`,
      icon:         '🗑️',
      confirmLabel: 'Delete',
      cancelLabel:  'Cancel',
      destructive:  true,
    })
    if (!ok) return false
    try {
      await chatService.deleteSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      toast.success('Deleted', 'The conversation has been removed.')
      return true
    } catch (e: any) {
      toast.error('Could not delete', e.message)
      return false
    }
  }

  return { module, documents, sessions, loading, error: null, refetch: fetch, uploadDocument, deleteDocument, deleteSession }
}

// ─── useChat ──────────────────────────────────────────────────────────────────
export type ScopeMode = 'everything' | 'class_only' | 'personal_only'
export type ComplexityLevel = 'simple' | 'normal' | 'expert'

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
  const [complexity, setComplexity] = useState<ComplexityLevel>('normal')
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
    if (!(await quotaGate('chat'))) return
    setSending(true)

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text }
    const loadingMsg: ChatMessage = { id: 'loading', role: 'assistant', content: '', loading: true }
    setMessages((prev) => [...prev, userMsg, loadingMsg])

    try {
      const res = await chatService.send(
        text, moduleId || undefined, sessionId || undefined, scopeMode, complexity,
      )
      if (!sessionId) setSessionId(res.session_id)
      await incrementQuota('chat')
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

  const loadSession = useCallback(async (id: string) => {
    try {
      const session = await chatService.getSession(id)
      setSessionId(id)
      const loaded: ChatMessage[] = session.messages.map((m: any) => ({
        id:      m.id,
        role:    m.role as 'user' | 'assistant',
        content: m.content,
        sources: m.sources || [],
      }))
      setMessages(loaded)
    } catch {}
  }, [])

  return {
    messages, sending, scopeMode, setScopeMode, complexity, setComplexity,
    sessions, send, clearMessages, loadSession,
  }
}

// ─── useGeneralChat ───────────────────────────────────────────────────────────
export function useGeneralChat() {
  const [messages,  setMessages]  = useState<ChatMessage[]>([])
  const [sending,   setSending]   = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [complexity, setComplexity] = useState<ComplexityLevel>('normal')
  const toast = useToast()

  const send = async (text: string) => {
    if (!text.trim() || sending) return
    if (!(await quotaGate('general_chat'))) return
    setSending(true)
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text }
    const loadingMsg: ChatMessage = { id: 'loading', role: 'assistant', content: '', loading: true }
    setMessages((prev) => [...prev, userMsg, loadingMsg])
    try {
      const res = await chatService.sendGeneral(text, sessionId || undefined, complexity)
      await incrementQuota('general_chat')
      if (!sessionId) setSessionId(res.session_id)
      const botMsg: ChatMessage = { id: res.message_id, role: 'assistant', content: res.answer }
      setMessages((prev) => [...prev.filter((m) => m.id !== 'loading'), botMsg])
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== 'loading'))
      toast.error('Message failed', e.message || 'Could not reach the AI. Try again.')
    } finally {
      setSending(false)
    }
  }

  return { messages, sending, complexity, setComplexity, send }
}

// ─── useQuiz ──────────────────────────────────────────────────────────────────
export type QuizPhase = 'list' | 'taking' | 'results'
export type QType = 'mcq' | 'true_false'

export function useQuiz(moduleId?: string | null) {
  const [phase,      setPhase]      = useState<QuizPhase>('list')
  const [attempt,    setAttempt]    = useState<any>(null)
  const [answers,    setAnswers]    = useState<Record<string, string>>({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [results,    setResults]    = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [history,    setHistory]    = useState<any[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)

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
    setHistoryLoaded(true)
  }, [moduleId])

  useEffect(() => { loadHistory() }, [loadHistory])

  const generate = async (questionCount: number, questionType: QType, topic?: string) => {
    if (!moduleId) {
      toast.warning('No module selected', 'Open a module before generating a quiz.')
      return false
    }
    if (!(await quotaGate('quiz'))) return false
    let ok = false
    setGenerating(true)
    const loadId = loader.show({ label: 'Generating quiz…', variant: 'dots' })
    try {
      const title = topic ? `${topic} Quiz` : 'Module Quiz'
      const res = await quizService.generate(moduleId, questionCount, questionType, title, topic)
      await incrementQuota('quiz')
      setAttempt(res)
      setAnswers({})
      setCurrentIdx(0)
      setResults(null)
      setPhase('taking')
      loadHistory()
      ok = true
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
    return ok
  }

  const answer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    // Save as you go so the quiz can be resumed after leaving the screen.
    if (attempt) quizService.saveProgress(attempt.id, [{ question_id: questionId, answer: value }]).catch(() => {})
  }

  const openAttempt = async (item: any) => {
    const loadId = loader.show({ label: 'Opening quiz…', variant: 'dots' })
    try {
      const res = await quizService.get(item.id)
      setAttempt(res)
      if (res.status === 'submitted') {
        setResults({
          attempt_id: res.id, score: res.score ?? 0, total: res.questions.length,
          correct: res.questions.filter((q: any) => q.is_correct).length, questions: res.questions,
        })
        setPhase('results')
      } else {
        const restored: Record<string, string> = {}
        res.questions.forEach((q: any) => { if (q.student_answer) restored[q.id] = q.student_answer })
        const firstOpen = res.questions.findIndex((q: any) => !restored[q.id])
        setAnswers(restored)
        setCurrentIdx(firstOpen >= 0 ? firstOpen : 0)
        setResults(null)
        setPhase('taking')
      }
    } catch (e: any) {
      toast.error('Could not open quiz', e.message)
    } finally {
      loader.hide(loadId)
    }
  }

  const deleteAttempt = async (item: any) => {
    const ok = await dialogue.confirm({
      title:        'Delete quiz?',
      message:      `"${item.title}" and your answers will be permanently removed.`,
      icon:         '🗑️',
      confirmLabel: 'Delete',
      cancelLabel:  'Cancel',
      destructive:  true,
    })
    if (!ok) return
    try {
      await quizService.remove(item.id)
      setHistory((prev) => prev.filter((h) => h.id !== item.id))
      toast.success('Deleted', 'The quiz has been removed.')
    } catch (e: any) {
      toast.error('Could not delete', e.message)
    }
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

  // Back to the quiz list. In-progress answers are already saved, so nothing is lost.
  const reset = async () => {
    if (phase === 'taking' && Object.keys(answers).length > 0) {
      toast.info('Progress saved', 'Continue this quiz any time from your list.')
    }
    setPhase('list')
    setAttempt(null)
    setAnswers({})
    setCurrentIdx(0)
    setResults(null)
    loadHistory()
  }

  const currentQuestion = attempt?.questions?.[currentIdx] ?? null
  const totalQuestions  = attempt?.questions?.length ?? 0
  const progress        = totalQuestions ? (currentIdx + 1) / totalQuestions : 0
  const answered        = Object.keys(answers).length

  return {
    phase, attempt, answers, currentQuestion, currentIdx,
    totalQuestions, progress, answered,
    results, generating, submitting, history, historyLoaded, refreshHistory: loadHistory,
    generate, answer, next, prev, submit, reset, openAttempt, deleteAttempt,
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
  const [decksLoaded, setDecksLoaded] = useState(false)
  const dialogue = useDialogue()

  const toast        = useToast()
  const loader       = useLoader()
  const notification = useNotification()

  const loadDecks = useCallback(async () => {
    if (!moduleId) return
    try {
      const res = await flashcardService.list(moduleId)
      setDecks(res)
    } catch {}
    setDecksLoaded(true)
  }, [moduleId])

  useEffect(() => { loadDecks() }, [loadDecks])

  const generate = async (maxCards: number, topic?: string) => {
    if (!moduleId) {
      toast.warning('No module selected', 'Open a module first.')
      return
    }
    if (!(await quotaGate('flashcard'))) return
    setGenerating(true)
    const loadId = loader.show({ label: 'Generating flashcards…', variant: 'dots' })
    try {
      const res = await flashcardService.generate(moduleId, maxCards, topic)
      await incrementQuota('flashcard')
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

  const prevCard = () => {
    if (cardIdx > 0) {
      setCardIdx((n) => n - 1)
      setFlipped(false)
    }
  }

  const nextCard = () => {
    if (deck && cardIdx < deck.cards.length - 1) {
      setCardIdx((n) => n + 1)
      setFlipped(false)
    }
  }

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
      const firstOpen = res.cards.findIndex((c: any) => c.status !== 'mastered')
      setCardIdx(firstOpen >= 0 ? firstOpen : 0)
      setFlipped(false)
    } catch (e: any) {
      toast.error('Could not load deck', e.message)
    } finally {
      loader.hide(loadId)
    }
  }

  const closeDeck = () => { setDeck(null); setCardIdx(0); setFlipped(false); loadDecks() }

  const deleteDeck = async (d: any) => {
    const ok = await dialogue.confirm({
      title:        'Delete flashcards?',
      message:      `"${d.title}" and your progress will be permanently removed.`,
      icon:         '🗑️',
      confirmLabel: 'Delete',
      cancelLabel:  'Cancel',
      destructive:  true,
    })
    if (!ok) return
    try {
      await flashcardService.remove(d.id)
      setDecks((prev) => prev.filter((x) => x.id !== d.id))
      toast.success('Deleted', 'The deck has been removed.')
    } catch (e: any) {
      toast.error('Could not delete', e.message)
    }
  }

  const currentCard   = deck?.cards?.[cardIdx] ?? null
  const masteredCount = deck?.mastered_count ?? 0
  const totalCards    = deck?.card_count ?? 0
  const progressPct   = totalCards ? Math.round((masteredCount / totalCards) * 100) : 0

  return {
    deck, decks, cardIdx, flipped, currentCard,
    masteredCount, totalCards, progressPct,
    generating, updating, decksLoaded, refreshDecks: loadDecks,
    generate, flip, prevCard, nextCard, updateCard, openDeck, closeDeck, deleteDeck,
  }
}

// ─── useSummary ───────────────────────────────────────────────────────────────
export type SummaryScope = 'module' | 'week' | 'document'

export function useSummary(moduleId?: string | null) {
  const [summary,    setSummary]    = useState<any>(null)
  const [summaries,  setSummaries]  = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const [loaded,     setLoaded]     = useState(false)
  const dialogue = useDialogue()

  const toast        = useToast()
  const loader       = useLoader()
  const notification = useNotification()

  const loadSummaries = useCallback(async () => {
    if (!moduleId) return
    try {
      const res = await summaryService.list(moduleId)
      setSummaries(res)
    } catch {}
    setLoaded(true)
  }, [moduleId])

  useEffect(() => { loadSummaries() }, [loadSummaries])

  const generate = async (scope: SummaryScope, topic?: string) => {
    if (!moduleId) {
      toast.warning('No module selected', 'Open a module first.')
      return
    }
    if (!(await quotaGate('summary'))) return
    setGenerating(true)
    const loadId = loader.show({ label: 'Generating summary…', variant: 'dots' })
    try {
      const res = await summaryService.generate(moduleId, scope, topic)
      await incrementQuota('summary')
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

  const closeSummary = () => { setSummary(null); loadSummaries() }

  const deleteSummary = async (item: any, title: string) => {
    const ok = await dialogue.confirm({
      title:        'Delete summary?',
      message:      `"${title}" will be permanently removed.`,
      icon:         '🗑️',
      confirmLabel: 'Delete',
      cancelLabel:  'Cancel',
      destructive:  true,
    })
    if (!ok) return
    try {
      await summaryService.remove(item.id)
      setSummaries((prev) => prev.filter((x) => x.id !== item.id))
      toast.success('Deleted', 'The summary has been removed.')
    } catch (e: any) {
      toast.error('Could not delete', e.message)
    }
  }

  return {
    summary, summaries, generating, loaded, refreshSummaries: loadSummaries,
    generate, openSummary, closeSummary, deleteSummary,
  }
}

export { usePremium } from './usePremium'
