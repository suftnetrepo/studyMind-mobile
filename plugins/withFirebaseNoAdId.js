// Installs RNFirebase Analytics without the IdentitySupport pod, so the app
// never reads the advertising identifier (IDFA). Survives `expo prebuild`
// because it re-applies to the generated Podfile each time.
const { withDangerousMod } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

const LINE = '$RNFirebaseAnalyticsWithoutAdIdSupport = true'

module.exports = (config) =>
  withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile')
      const contents = fs.readFileSync(podfile, 'utf8')
      if (!contents.includes(LINE)) {
        fs.writeFileSync(podfile, `${LINE}\n${contents}`)
      }
      return cfg
    },
  ])
