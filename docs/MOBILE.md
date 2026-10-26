# KeyVault Personal — Android 移动端

## 当前进度

| 阶段 | 状态 |
|------|------|
| 抽离 `vault-core`、Capacitor 骨架 | 已完成 |
| Kotlin 加密插件、界面自动切换、Android 工程 | 已完成 |
| 真机调试、桌面与手机 vault 互通 | 未做 |

## 目录结构

```
packages/vault-core/              # 共享核心
src/renderer/src/services/
  vault-client.ts                 # 自动识别 Electron / Capacitor
  capacitor-vault-client.ts       # 移动端桥接
mobile/
  android-plugin/                 # Kotlin 源码（权威副本）
    VaultCrypto.kt
    VaultRepository.kt
    VaultPlugin.kt
  android/                        # Capacitor 生成的 Android 工程
  scripts/
    sync-web.js                   # 同步 Web 构建到 www
    install-plugin.js             # 复制插件并注册 MainActivity
  www/                            # 构建产物（gitignore）
docs/MOBILE.md
```

## Windows 环境准备

1. 安装 [Android Studio](https://developer.android.com/studio)（SDK 35、Build-Tools）
2. 环境变量：
   - `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`
   - PATH 加入 `%ANDROID_HOME%\platform-tools`
3. 真机 USB 调试或 AVD 模拟器

## 一键准备 Android 工程

> **说明**：若 `mobile/android` 目录已存在，**不要**再执行 `npx cap add android`，否则会提示 `android platform already exists`。直接跳到 `npm run android:prepare` 即可。

```powershell
# 仓库根目录
npm install --legacy-peer-deps
npm run build

cd mobile
npm run android:prepare      # 构建 Web + sync + 安装 Vault 插件
npx cap open android         # 打开 Android Studio
```

**仅当 `mobile/android` 目录不存在时**（全新克隆仓库后）才需要：

```powershell
cd mobile
npx cap add android
npm run android:prepare
```

或在 `mobile/` 目录：

```powershell
npm run android:prepare
npx cap open android
```

Android Studio 中：**Run** 运行到设备。

**打包 APK/AAB** 详见 [Android 打包指南](./ANDROID-PACKAGING.md)。

## 已实现能力

- **加密**：`PBKDF2WithHmacSHA512`（100k 次）+ `AES/GCM/NoPadding`，与桌面 `vault.dat` 格式一致
- **存储**：`context.filesDir/vault.dat`
- **剪贴板**：复制后 30 秒自动清空
- **导入/导出**：Android SAF 文件选择器（`.kvault`）
- **UI**：与桌面共用 React 构建，`vault-client` 在原生环境自动走 Capacitor 插件

## 跨平台兼容性测试

1. Windows 桌面创建 vault 并添加条目
2. 导出 `.kvault`，或在手机上通过 adb 推送：
   ```powershell
   adb push "%APPDATA%\keyvault-personal\vault.dat" /data/data/com.keyvault.personal/files/vault.dat
   ```
   （需 root 或先用应用内导入功能）
3. 推荐：桌面 **导出备份** → 手机 **导入备份**，用相同主密码验证
4. 反向：手机导出 → 桌面导入

## 加密参数（不可修改）

| 参数 | 值 |
|------|-----|
| KDF | PBKDF2-HMAC-SHA512 |
| 迭代次数 | 100,000 |
| 密钥长度 | 32 字节 |
| 对称加密 | AES-256-GCM |
| IV | 12 字节 |
| Salt | 16 字节 |
| 文件头 | `[Salt 16][IV 12][AuthTag 16][密文]` |

## 常见问题

**`npx cap add android` 提示 `android platform already exists`**

说明 `mobile/android` 已存在，不是失败。跳过该命令，直接：

```powershell
npm run android:prepare
```

**`npx cap` 报 `astral-regex` 缺失**

```powershell
npm install astral-regex --legacy-peer-deps -w @keyvault/mobile
```

**`cap sync` 后插件丢失**

每次 sync 后执行：

```powershell
node mobile/scripts/install-plugin.js
```

或使用 `npm run android:prepare`（已包含该步骤）。
