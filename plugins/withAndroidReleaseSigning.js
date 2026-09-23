// Signs release builds with the real Revvo upload keystore instead of the
// debug key. The keystore and its passwords live in credentials/ (gitignored,
// never committed) — this plugin only injects Groovy that reads that file at
// build time, so no secret ever appears in this (committed) file. Falls back
// to the debug signing config if credentials/ isn't present (e.g. a fresh
// clone without the keystore), so the build never breaks for lack of it.
const { withAppBuildGradle } = require('@expo/config-plugins')

const MARKER = '// withAndroidReleaseSigning'
const LOADER = `
    ${MARKER}
    def revvoKeystoreProps = rootProject.file('../credentials/revvo-release-keystore.properties')
    def revvoKeystore = new Properties()
    if (revvoKeystoreProps.exists()) {
        revvoKeystore.load(new FileInputStream(revvoKeystoreProps))
    }
`

module.exports = (config) =>
  withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents
    if (src.includes(MARKER)) return cfg

    // Load the properties just before the android { block.
    src = src.replace(/\nandroid \{/, `${LOADER}\nandroid {`)

    // Add a release signingConfig, used only if the properties file was found.
    src = src.replace(
      /signingConfigs \{\n(\s*)debug \{/,
      `signingConfigs {\n$1release {\n$1    if (revvoKeystoreProps.exists()) {\n` +
      `$1        storeFile rootProject.file('../credentials/' + revvoKeystore['storeFile'])\n` +
      `$1        storePassword revvoKeystore['storePassword']\n` +
      `$1        keyAlias revvoKeystore['keyAlias']\n` +
      `$1        keyPassword revvoKeystore['keyPassword']\n` +
      `$1    }\n$1}\n$1debug {`,
    )

    // Point the release build type (and only that one — there's an identically-worded
    // "release {" inside signingConfigs above, so this must be scoped to buildTypes,
    // found via the comment that's unique to the release build type block) at the real
    // key. Falls back to debug's own config if the properties file wasn't present.
    src = src.replace(
      /(\/\/ Caution! In production, you need to generate your own keystore file\.\n(?:.*\n)*?\s*)signingConfig signingConfigs\.debug/,
      '$1signingConfig revvoKeystoreProps.exists() ? signingConfigs.release : signingConfigs.debug',
    )

    cfg.modResults.contents = src
    return cfg
  })
