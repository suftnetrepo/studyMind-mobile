import { useAuthStore } from '../stores'

// ─── Change this to your server URL ─────────────────────────────────────────
// Local dev: 'http://localhost:8000'  (simulator)
// Physical device on same WiFi: 'http://192.168.x.x:8000'
// Production: 'https://your-domain.com'
export const API_BASE = 'http://localhost:8000'

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
  me:       () => api.get('/api/auth/me'),
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
  documents: (moduleId: string) => api.get<any[]>(`/api/modules/${moduleId}/documents`),
  uploadDocument: (moduleId: string, file: { uri: string; name: string; type: string }, visibility = 'class') => {
    const form = new FormData()
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as any)
    return api.postForm<any>(`/api/modules/${moduleId}/documents?visibility=${visibility}`, form)
  },
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chatService = {
  send: (message: string, moduleId?: string, sessionId?: string, scopeMode = 'everything') =>
    api.post<any>('/api/chat', {
      message,
      module_id:  moduleId || undefined,
      session_id: sessionId || undefined,
      scope_mode: scopeMode,
    }),
  sessions:   (moduleId?: string) =>
    api.get<any[]>(`/api/sessions${moduleId ? `?module_id=${moduleId}` : ''}`),
  getSession: (id: string) => api.get<any>(`/api/sessions/${id}`),
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────
export const quizService = {
  generate: (moduleId: string, questionCount = 5, questionType = 'mcq') =>
    api.post<any>('/api/quiz/generate', { module_id: moduleId, question_count: questionCount, question_type: questionType }),
  get:    (id: string) => api.get<any>(`/api/quiz/${id}`),
  submit: (id: string, answers: { question_id: string; answer: string }[]) =>
    api.post<any>(`/api/quiz/${id}/submit`, { answers }),
  history: (moduleId?: string) =>
    api.get<any[]>(`/api/quiz/history/list${moduleId ? `?module_id=${moduleId}` : ''}`),
}

// ─── Flashcards ───────────────────────────────────────────────────────────────
export const flashcardService = {
  generate:   (moduleId: string, maxCards = 20) =>
    api.post<any>('/api/flashcards/generate', { module_id: moduleId, max_cards: maxCards }),
  list:       (moduleId?: string) =>
    api.get<any[]>(`/api/flashcards${moduleId ? `?module_id=${moduleId}` : ''}`),
  getDeck:    (deckId: string) => api.get<any>(`/api/flashcards/${deckId}`),
  updateCard: (deckId: string, cardId: string, status: 'new' | 'learning' | 'mastered') =>
    api.patch<any>(`/api/flashcards/${deckId}/cards/${cardId}`, { status }),
}

// ─── Summary ──────────────────────────────────────────────────────────────────
export const summaryService = {
  generate: (moduleId: string, scope: 'document' | 'week' | 'module' = 'module') =>
    api.post<any>('/api/summarise', { module_id: moduleId, scope }),
  list:     (moduleId?: string) =>
    api.get<any[]>(`/api/summarise${moduleId ? `?module_id=${moduleId}` : ''}`),
  get:      (id: string) => api.get<any>(`/api/summarise/${id}`),
}
