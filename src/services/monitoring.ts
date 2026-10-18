import * as Sentry from '@sentry/react-native'

type MonitoringUser = {
  id?: string | number | null
  role?: string | null
} | null

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN

export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
})

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: __DEV__ ? 'development' : 'production',
  sendDefaultPii: false,
  tracesSampleRate: __DEV__ ? 1 : 0.15,
  attachScreenshot: false,
  integrations: [navigationIntegration],
  beforeBreadcrumb(breadcrumb) {
    // Console output can contain AI responses or study material, so it is not
    // suitable diagnostic context. URLs are useful, but query strings may
    // contain resource identifiers and are removed before transmission.
    if (breadcrumb.category === 'console') return null
    const url = breadcrumb.data?.url
    if (typeof url === 'string') {
      breadcrumb.data = {
        ...breadcrumb.data,
        url: url.split('?')[0],
      }
    }
    return breadcrumb
  },
  beforeSend(event) {
    // Study content and account details must never leave the device through
    // monitoring. Keep only the opaque app user id set below.
    if (event.user) {
      delete event.user.email
      delete event.user.username
      delete event.user.ip_address
    }
    if (event.request) {
      delete event.request.data
      delete event.request.cookies
      delete event.request.headers
    }
    return event
  },
})

export function setMonitoringUser(user: MonitoringUser) {
  if (!user?.id) {
    Sentry.setUser(null)
    Sentry.setTag('user.role', 'anonymous')
    return
  }

  Sentry.setUser({ id: String(user.id) })
  Sentry.setTag('user.role', user.role || 'unknown')
}

export function captureHandledError(
  error: unknown,
  operation: string,
  tags?: Record<string, string>,
) {
  Sentry.withScope((scope) => {
    scope.setTag('operation', operation)
    if (tags) scope.setTags(tags)
    Sentry.captureException(error)
  })
}

export function addMonitoringBreadcrumb(
  message: string,
  data?: Record<string, string | number | boolean | null>,
) {
  Sentry.addBreadcrumb({
    category: 'product',
    level: 'info',
    message,
    data,
  })
}

export { Sentry }
