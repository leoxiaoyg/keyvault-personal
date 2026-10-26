const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '../..')
const rendererOut = path.join(root, 'out/renderer')
const mobileWww = path.join(__dirname, '../www')

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

if (!fs.existsSync(rendererOut)) {
  console.error('Renderer build not found. Run `npm run build` from repo root first.')
  process.exit(1)
}

if (fs.existsSync(mobileWww)) {
  fs.rmSync(mobileWww, { recursive: true, force: true })
}

copyDir(rendererOut, mobileWww)
console.log(`Synced web assets: ${rendererOut} -> ${mobileWww}`)
