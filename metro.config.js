const { getSentryExpoConfig } = require('@sentry/react-native/metro')

// Adds debug IDs to production bundles so Sentry can match errors to uploaded
// source maps. Replay is intentionally disabled for the initial rollout.
module.exports = getSentryExpoConfig(__dirname, {
  includeWebReplay: false,
  annotateReactComponents: false,
})
