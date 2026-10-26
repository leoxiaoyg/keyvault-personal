const fs = require('fs')
const path = require('path')

const pluginSource = path.join(__dirname, '../android-plugin')
const androidJavaRoot = path.join(__dirname, '../android/app/src/main/java/com/keyvault/personal/vault')
const mainActivityPath = path.join(
  __dirname,
  '../android/app/src/main/java/com/keyvault/personal/MainActivity.java'
)

const mainActivityTemplate = `package com.keyvault.personal;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.keyvault.personal.vault.VaultPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VaultPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else if (entry.name.endsWith('.kt')) {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

if (!fs.existsSync(path.join(__dirname, '../android'))) {
  console.error('Android project not found. Run `npx cap add android` in mobile/ first.')
  process.exit(1)
}

copyDir(pluginSource, androidJavaRoot)
console.log(`Installed Vault plugin: ${pluginSource} -> ${androidJavaRoot}`)

if (fs.existsSync(mainActivityPath)) {
  const content = fs.readFileSync(mainActivityPath, 'utf8')
  if (!content.includes('registerPlugin(VaultPlugin.class)')) {
    fs.writeFileSync(mainActivityPath, mainActivityTemplate)
    console.log('Rewrote MainActivity.java with VaultPlugin registration')
  } else {
    console.log('MainActivity.java already registers VaultPlugin')
  }
} else {
  console.warn('MainActivity.java not found — register VaultPlugin manually')
}
