const fs = require('fs')
const path = require('path')
const os = require('os')

const androidDir = path.join(__dirname, '../android')
const localPropsPath = path.join(androidDir, 'local.properties')

function detectSdkDir() {
  if (process.env.ANDROID_HOME) {
    return process.env.ANDROID_HOME
  }
  if (process.env.ANDROID_SDK_ROOT) {
    return process.env.ANDROID_SDK_ROOT
  }
  return path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk')
}

const sdkDir = detectSdkDir()
if (!fs.existsSync(sdkDir)) {
  console.error(`Android SDK not found at: ${sdkDir}`)
  console.error('Install Android Studio or set ANDROID_HOME, then retry.')
  process.exit(1)
}

const escaped = sdkDir.replace(/\\/g, '\\\\')
const content = `sdk.dir=${escaped}\n`
fs.writeFileSync(localPropsPath, content)
console.log(`Wrote ${localPropsPath}`)
console.log(`sdk.dir=${sdkDir}`)
