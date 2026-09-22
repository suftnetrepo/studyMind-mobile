import { useAuthStore } from '../stores'

// ─── Server URL ───────────────────────────────────────────────────────────
// Production default below. Override for local dev without editing code:
// EXPO_PUBLIC_API_URL=http://192.168.x.x:8000
export const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.aismartlearner.com'

class ApiClient {
  private base: string
  // Dedupes concurrent 401s (e.g. Promise.all'd requests) into a single
  // refresh call — the backend rotates refresh tokens, so firing more than
  // one refresh at once would invalidate the second caller's token and log
  // the user out even though the first refresh succeeded.
  private refreshPromise: Promise<boolean> | null = null

  constructor(base: string) {
    this.base = base
  }

  private getHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const token = useAuthStore.getState().accessToken
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    }
  }

  private refreshTokens(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.doRefresh().finally(() => {
        this.refreshPromise = null
      })
    }
    return this.refreshPromise
  }

  private async doRefresh(): Promise<boolean> {
    const { refreshToken, setTokens, logout } = useAuthStore.getState()
    if (!refreshToken) { logout(); return false }
    try {
      const res = await fetch(`${this.base}/api/auth/refresh`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refresh_token: refreshToken }),
      })
      if (!res.ok) { logout(); return false }
      const data = await res.json()
      setTokens(data.access_token, data.refresh_token)
      return true
    } catch {
      logout()
      return false
    }
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      headers: this.getHeaders(),
    })
    if (res.status === 401) {
      const refreshed = await this.refreshTokens()
      if (!refreshed) throw new Error('Session expired. Please sign in again.')
      const retry = await fetch(`${this.base}${path}`, {
        headers: this.getHeaders(),
      })
      if (!retry.ok) throw new Error(`GET ${path} → ${retry.status}`)
      return retry.json()
    }
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
    return res.json()
  }

  async post<T>(path: string, body?: object): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method:  'POST',
      headers: this.getHeaders(),
      body:    body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 401) {
      const refreshed = await this.refreshTokens()
      if (!refreshed) throw new Error('Session expired. Please sign in again.')
      const retry = await fetch(`${this.base}${path}`, {
        method:  'POST',
        headers: this.getHeaders(),
        body:    body ? JSON.stringify(body) : undefined,
      })
      if (!retry.ok) {
        const err = await retry.json().catch(() => ({}))
        throw new Error(err?.detail || `POST ${path} → ${retry.status}`)
      }
      return retry.json()
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.detail || `POST ${path} → ${res.status}`)
    }
    return res.json()
  }

  async postForm<T>(path: string, form: FormData): Promise<T> {
    const token = useAuthStore.getState().accessToken
    const res = await fetch(`${this.base}${path}`, {
      method:  'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    form,
    })
    if (res.status === 401) {
      const refreshed = await this.refreshTokens()
      if (!refreshed) throw new Error('Session expired. Please sign in again.')
      const newToken = useAuthStore.getState().accessToken
      const retry = await fetch(`${this.base}${path}`, {
        method:  'POST',
        headers: newToken ? { Authorization: `Bearer ${newToken}` } : {},
        body:    form,
      })
      if (!retry.ok) {
        const err = await retry.json().catch(() => ({}))
        throw new Error(err?.detail || `POST ${path} → ${retry.status}`)
      }
      return retry.json()
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.detail || `POST ${path} → ${res.status}`)
    }
    return res.json()
  }

  async patch<T>(path: string, body?: object): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method:  'PATCH',
      headers: this.getHeaders(),
      body:    body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 401) {
      const refreshed = await this.refreshTokens()
      if (!refreshed) throw new Error('Session expired. Please sign in again.')
      const retry = await fetch(`${this.base}${path}`, {
        method:  'PATCH',
        headers: this.getHeaders(),
        body:    body ? JSON.stringify(body) : undefined,
      })
      if (!retry.ok) throw new Error(`PATCH ${path} → ${retry.status}`)
      return retry.json()
    }
    if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`)
    return res.json()
  }

  async delete(path: string): Promise<void> {
    const res = await fetch(`${this.base}${path}`, {
      method:  'DELETE',
      headers: this.getHeaders(),
    })
    if (res.status === 401) {
      const refreshed = await this.refreshTokens()
      if (!refreshed) throw new Error('Session expired. Please sign in again.')
      const retry = await fetch(`${this.base}${path}`, {
        method:  'DELETE',
        headers: this.getHeaders(),
      })
      if (!retry.ok) throw new Error(`DELETE ${path} → ${retry.status}`)
      return
    }
    if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}`)
  }
}

export const api = new ApiClient(API_BASE)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authService = {
  login:    (email: string, password: string) =>
    api.post<{ access_token: string; refresh_token: string; expires_in: number }>('/api/auth/login', { email, password }),
  register: (email: string, password: string, full_name: string, role: string) =>
    api.post('/api/auth/register', { email, password, full_name, role }),
  forgotPassword: (email: string, new_password: string) =>
    api.post<{ ok: boolean }>('/api/auth/forgot-password', { email: email.trim().toLowerCase(), new_password }),
  config:   () => api.get<{ enabled_roles: string[] }>('/api/auth/config'),
  me:       () => api.get('/api/auth/me'),
  deleteMe: () => api.delete('/api/auth/me'),
  updateMe: (full_name: string) => api.patch<any>('/api/auth/me', { full_name }),
  logout:   (refresh_token: string) => api.post('/api/auth/logout', { refresh_token }),
}

// ─── Modules ──────────────────────────────────────────────────────────────────
// The server resolves the module from `enrolment_code` (via the code's stored
// metadata) whenever one is provided, ignoring the `:moduleId` path segment —
// verified against the live endpoint. PLACEHOLDER_MODULE_ID is only there to
// satisfy the route's UUID-shaped path param when enrolling by code alone.
const PLACEHOLDER_MODULE_ID = '00000000-0000-0000-0000-000000000000'

export const moduleService = {
  list:   () => api.get<any[]>('/api/modules'),
  get:    (id: string) => api.get<any>(`/api/modules/${id}`),
  create: (body: any) => api.post<any>('/api/modules', body),
  enrol:  (moduleId: string, enrolmentCode?: string) =>
    api.post<any>(`/api/modules/${moduleId}/enrol`,
      enrolmentCode ? { enrolment_code: enrolmentCode } : { module_id: moduleId },
    ),
  enrolByCode: (enrolmentCode: string) =>
    api.post<any>(`/api/modules/${PLACEHOLDER_MODULE_ID}/enrol`, { enrolment_code: enrolmentCode }),
  deleteModule: (moduleId: string) => api.delete(`/api/modules/${moduleId}`),
  archive: (moduleId: string) => api.post<any>(`/api/modules/${moduleId}/archive`),
  restore: (moduleId: string) => api.post<any>(`/api/modules/${moduleId}/restore`),
  joinInstitution: (code: string) =>
    api.post<any>('/api/institutions/join', { code }),
  createModule: (title: string, courseCode: string, emoji?: string, accessType: 'personal' | 'class' = 'personal') =>
    api.post<any>('/api/modules', {
      title, course_code: courseCode || undefined, emoji, access_type: accessType,
    }),
  createEnrolmentCode: (moduleId: string) =>
    api.post<{ code: string; module_id: string }>(`/api/modules/${moduleId}/enrolment-code`),
  pasteText: (moduleId: string, title: string, content: string, visibility: 'class' | 'personal' = 'class') =>
    api.post<any>(`/api/modules/${moduleId}/documents/paste`, { title, content, visibility }),
  generateMaterial: (moduleId: string, topic: string, level = 'intermediate', visibility: 'class' | 'personal' = 'class') =>
    api.post<any>(`/api/modules/${moduleId}/documents/generate`, { topic, level, visibility }),
  documents: (moduleId: string) => api.get<any[]>(`/api/modules/${moduleId}/documents`),
  uploadDocument: (moduleId: string, file: { uri: string; name: string; type: string }, visibility = 'class') => {
    const form = new FormData()
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as any)
    return api.postForm<any>(`/api/modules/${moduleId}/documents?visibility=${visibility}`, form)
  },
  deleteDocument: (moduleId: string, documentId: string) =>
    api.delete(`/api/modules/${moduleId}/documents/${documentId}`),
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chatService = {
  send: (
    message: string, moduleId?: string, sessionId?: string,
    scopeMode = 'everything', complexity = 'normal',
  ) =>
    api.post<any>('/api/chat', {
      message,
      module_id:  moduleId || undefined,
      session_id: sessionId || undefined,
      scope_mode: scopeMode,
      complexity,
    }),
  sendGeneral: (message: string, sessionId?: string, complexity = 'normal') =>
    api.post<any>('/api/chat/general', {
      message,
      session_id: sessionId || undefined,
      complexity,
    }),
  extractFromImage: (base64: string, mimeType: string) =>
    api.post<{ text: string }>('/api/chat/extract-image', {
      image_base64: base64,
      mime_type:    mimeType,
    }),
  transcribeAudio: (base64Audio: string) =>
    api.post<{ text: string }>('/api/chat/transcribe', {
      audio_base64: base64Audio,
    }),
  sessions:   (moduleId?: string) =>
    api.get<any[]>(`/api/sessions${moduleId ? `?module_id=${moduleId}` : ''}`),
  getSession: (id: string) => api.get<any>(`/api/sessions/${id}`),
  deleteSession: (id: string) => api.delete(`/api/sessions/${id}`),
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────
export const quizService = {
  generate: (moduleId: string, questionCount = 5, questionType = 'mcq', title?: string, topic?: string) =>
    api.post<any>('/api/quiz/generate', {
      module_id:      moduleId,
      question_count: questionCount,
      question_type:  questionType,
      title,
      topic,
    }),
  get:    (id: string) => api.get<any>(`/api/quiz/${id}`),
  submit: (id: string, answers: { question_id: string; answer: string }[]) =>
    api.post<any>(`/api/quiz/${id}/submit`, { answers }),
  history: (moduleId?: string) =>
    api.get<any[]>(`/api/quiz/history/list${moduleId ? `?module_id=${moduleId}` : ''}`),
  saveProgress: (id: string, answers: { question_id: string; answer: string }[]) =>
    api.patch<any>(`/api/quiz/${id}/progress`, { answers }),
  remove: (id: string) => api.delete(`/api/quiz/${id}`),
}

// ─── Flashcards ───────────────────────────────────────────────────────────────
export const flashcardService = {
  generate:   (moduleId: string, maxCards = 20, topic?: string) =>
    api.post<any>('/api/flashcards/generate', { module_id: moduleId, max_cards: maxCards, topic }),
  list:       (moduleId?: string) =>
    api.get<any[]>(`/api/flashcards${moduleId ? `?module_id=${moduleId}` : ''}`),
  getDeck:    (deckId: string) => api.get<any>(`/api/flashcards/${deckId}`),
  updateCard: (deckId: string, cardId: string, status: 'new' | 'learning' | 'mastered') =>
    api.patch<any>(`/api/flashcards/${deckId}/cards/${cardId}`, { status }),
  remove:     (deckId: string) => api.delete(`/api/flashcards/${deckId}`),
}

// ─── Summary ──────────────────────────────────────────────────────────────────
export const summaryService = {
  generate: (moduleId: string, scope: 'document' | 'week' | 'module' = 'module', topic?: string) =>
    api.post<any>('/api/summarise', { module_id: moduleId, scope, topic }),
  list:     (moduleId?: string) =>
    api.get<any[]>(`/api/summarise${moduleId ? `?module_id=${moduleId}` : ''}`),
  get:      (id: string) => api.get<any>(`/api/summarise/${id}`),
  remove:   (id: string) => api.delete(`/api/summarise/${id}`),
}

// ─── Writing assistant ────────────────────────────────────────────────────────
export const writingService = {
  generate: (params: {
    mode:         string
    input:        string
    format?:      string
    tone?:        string
    essay_type?:  string
    level?:       string
    length?:      string
    paragraphs?:  string
    modify_type?: string
  }) => api.post<{ content: string }>('/api/writing/generate', params),
}

// ─── Activity / streaks ───────────────────────────────────────────────────────
export interface StreakData {
  streak_days:      number
  active_dates:     string[]
  week_active:      string[]
  week_start:       string
  weekly_count:     number
  weekly_target:    number
  weekly_progress:  number
  breakdown:        Record<string, number>
  total_activities: number
  recent_activities: {
    id: string; type: string; module_id: string | null
    course_code: string | null; module_title: string | null
    date: string; created_at: string
  }[]
}

export const activityService = {
  streak: () => api.get<StreakData>('/api/activity/streak'),
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
export const onboardingService = {
  status: () => api.get<{ complete: boolean; role: string; module_count?: number }>('/api/onboarding/status'),
}

// ─── Quota ────────────────────────────────────────────────────────────────────
// Free-tier quotas are tracked on the device (src/utils/quota.ts); this only reports account context.
export const quotaService = {
  status: () => api.get<{
    is_pro:              boolean
    is_institution_user: boolean
    role:                string
  }>('/api/quota/status'),
}
