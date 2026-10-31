// Wraps app.json so Firebase is wired in only when its config files exist.
// Builds without them (CI, a fresh clone) still work; analytics stays inert.
//
// Files live in firebase/<APP_ENV>/ (APP_ENV defaults to "production") and are
// gitignored: GoogleService-Info.plist (iOS) and google-services.json (Android).
const fs = require('fs')
const path = require('path')

module.exports = ({ config }) => {
  const env = process.env.APP_ENV || 'production'
  const dir = (file) => path.join('firebase', env, file)
  const iosFile = dir('GoogleService-Info.plist')
  const androidFile = dir('google-services.json')
  const hasIos = fs.existsSync(path.join(__dirname, iosFile))
  const hasAndroid = fs.existsSync(path.join(__dirname, androidFile))

  const plugins = [...(config.plugins || [])]
  if (hasIos || hasAndroid) {
    plugins.push('@react-native-firebase/app', './plugins/withFirebaseNoAdId')
    // RNFirebase's iOS pods need static frameworks.
    const i = plugins.findIndex((p) => Array.isArray(p) && p[0] === 'expo-build-properties')
    if (i >= 0) {
      plugins[i] = ['expo-build-properties', { ...plugins[i][1], ios: { ...plugins[i][1].ios, useFrameworks: 'static' } }]
    }
  }

  return {
    ...config,
    ios: { ...config.ios, ...(hasIos && { googleServicesFile: `./${iosFile}` }) },
    android: { ...config.android, ...(hasAndroid && { googleServicesFile: `./${androidFile}` }) },
    plugins,
  }
}
