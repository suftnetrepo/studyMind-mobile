// Xcode 26's clang rejects fmt's consteval format strings (the "fmt/format-inl.h ... is not a
// constant expression" build error with React Native 0.79). fmt's base.h hard-codes
// FMT_USE_CONSTEVAL (a -D override is ignored), so the pod header itself is patched to turn it off. Safe to delete once React Native ships a newer fmt.
const { withDangerousMod } = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

const MARKER = '# withFmtXcode26Fix'
const PATCH = `
    ${MARKER}
    fmt_base = File.join(installer.sandbox.pod_dir('fmt'), 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      src = File.read(fmt_base)
      patched = src.sub("#if !defined(__cpp_lib_is_constant_evaluated)\\n#  define FMT_USE_CONSTEVAL 0", "#if 1\\n#  define FMT_USE_CONSTEVAL 0")
      File.write(fmt_base, patched) unless patched == src
    end
`

module.exports = (config) =>
  withDangerousMod(config, ['ios', (cfg) => {
    const file = path.join(cfg.modRequest.platformProjectRoot, 'Podfile')
    let podfile = fs.readFileSync(file, 'utf8')
    if (!podfile.includes(MARKER)) {
      podfile = podfile.replace(/(react_native_post_install\([\s\S]*?\n    \)\n)/, `$1${PATCH}`)
      fs.writeFileSync(file, podfile)
    }
    return cfg
  }])
