# KeyVault Personal — Android 打包指南

本文说明如何将 KeyVault Personal 手机 App 打包为 APK/AAB，适用于 Windows 开发环境。

---

## 打包前：同步最新 Web 代码

每次修改 UI 或业务逻辑后，需先重新构建并同步到 Android 工程：

```powershell
cd path\to\keyvault-personal
npm install --legacy-peer-deps
npm run build
cd mobile
npm run android:prepare
```

`android:prepare` 会依次完成：构建 Web 资源 → `cap sync` → 安装 Kotlin 插件。

> **说明**：若已存在 `mobile/android` 目录，跳过下面的 `cap add android`。出现 `android platform already exists` 表示工程已在，不是报错。

**仅当 `mobile/android` 不存在时**（首次）：

```powershell
cd mobile
npx cap add android
npm run android:prepare
```

**日常打包/同步**（android 已存在时）：

```powershell
cd mobile
npm run android:prepare
```

---

## 方式一：调试 APK（最快，适合自测）

不需要自己的签名证书，Gradle 使用默认 debug 密钥。

```powershell
cd mobile\android
.\gradlew.bat assembleDebug
```

成功后 APK 位于：

```
mobile\android\app\build\outputs\apk\debug\app-debug.apk
```

安装到手机：

```powershell
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

也可将 `app-debug.apk` 拷贝到手机，在文件管理器中点击安装（需允许「未知来源」）。

---

## 方式二：Android Studio 打正式包（推荐）

适合生成**签名 Release APK**（侧载分发）或 **AAB**（Google Play 上架）。

### 1. 打开工程

```powershell
cd mobile
npx cap open android
```

### 2. 创建签名密钥（仅首次）

菜单：**Build → Generate Signed App Bundle / APK**

- 选择 **APK**（侧载安装）或 **Android App Bundle (.aab)**（上架 Play 商店）
- 点击 **Create new...** 创建 keystore，例如：
  - 路径：放在仓库外，例如 `%USERPROFILE%\keystores\keyvault-release.jks`
  - Alias：`keyvault`
  - 密码：自行设置并**妥善保管**（丢失后无法更新同一 App）

### 3. 选择构建类型

- 选择 **release**（正式包，体积更小、已优化）
- 勾选 **V1 + V2** 签名
- 完成构建

输出位置（以 Android Studio 完成对话框为准）：

| 类型 | 典型路径 |
|------|----------|
| Release APK | `mobile\android\app\release\app-release.apk` |
| AAB | `mobile\android\app\release\app-release.aab` |

---

## 方式三：命令行打 Release 包

需先在 `mobile/android/app/build.gradle` 的 `android { }` 块中配置签名，例如：

```gradle
signingConfigs {
    release {
        storeFile file(System.getenv("KEYVAULT_KEYSTORE"))
        storePassword "你的密码"
        keyAlias "keyvault"
        keyPassword "你的密码"
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

然后执行：

```powershell
cd mobile\android
.\gradlew.bat assembleRelease
```

APK 输出路径：

```
mobile\android\app\build\outputs\apk\release\app-release.apk
```

> **安全提示**：不要将 keystore 或密码提交到 Git。更稳妥的做法是使用 `keystore.properties` 并在 `.gitignore` 中忽略。

---

## 两种包怎么选

| 场景 | 推荐方式 |
|------|----------|
| 自己手机试用 | `assembleDebug` 或 Android Studio **Run** |
| 发给朋友侧载安装 | 签名 **Release APK** |
| 上架 Google Play | 签名 **AAB** |

---

## 最短路径（自测装一台手机）

```powershell
cd path\to\keyvault-personal
npm run build
cd mobile
npm run android:prepare
cd android
.\gradlew.bat assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

---

## 常见问题

### `SDK location not found` / 找不到 Android SDK

在 `mobile/android/` 下创建 `local.properties`（已 gitignore，每台机器一份）：

```properties
sdk.dir=C\:\\Users\\你的用户名\\AppData\\Local\\Android\\Sdk
```

可参考 `mobile/android/local.properties.example`。或在 Android Studio 中打开工程，IDE 通常会自动生成该文件。

### `gradlew` 下载失败 / `Connection reset` / 网络超时

**原因**：命令行首次运行需从境外下载 `gradle-8.11.1-all.zip`，国内网络常不稳定。

**方案 A（已配置）**：项目已将 Gradle 下载源改为华为云镜像。在 `mobile/android` 重试：

```powershell
.\gradlew.bat assembleDebug
```

**方案 B**：用 Android Studio 打开 `mobile/android`，菜单 **File → Sync Project with Gradle Files**，由 IDE 拉取依赖后再 **Build → Build APK(s)**。

**方案 C**：浏览器手动下载 [gradle-8.11.1-all.zip](https://mirrors.huaweicloud.com/gradle/gradle-8.11.1-all.zip)，解压到：

```
%USERPROFILE%\.gradle\wrapper\dists\gradle-8.11.1-all\<随机哈希目录>\
```

（先运行一次 `.\gradlew.bat` 生成哈希目录，再把 zip 放入该文件夹，无需解压 zip，Gradle 会自动解压。）

**备用镜像**（可改 `gradle/wrapper/gradle-wrapper.properties` 中的 `distributionUrl`）：

- `https://mirrors.cloud.tencent.com/gradle/gradle-8.11.1-all.zip`
- `https://mirrors.huaweicloud.com/gradle/gradle-8.11.1-all.zip`

### 改了代码但手机仍是旧界面

重新执行：

```powershell
cd mobile
npm run android:prepare
```

然后再打包。

### `cap sync` 后 App 崩溃

重新安装 Vault 插件：

```powershell
node mobile/scripts/install-plugin.js
```

或使用 `npm run android:prepare`（已包含该步骤）。

### `npx cap` 报 `astral-regex` 缺失

```powershell
npm install astral-regex --legacy-peer-deps -w @keyvault/mobile
```

### 首次打包前检查清单

- [ ] 已安装 Android Studio + SDK 35
- [ ] `mobile/android/local.properties` 已配置 SDK 路径（运行 `node mobile/scripts/setup-android-env.js` 可自动生成）
- [ ] 或设置 `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`
- [ ] PATH 包含 `%ANDROID_HOME%\platform-tools`（用于 `adb`）
- [ ] 真机已开启 USB 调试（真机安装时）

---

## 相关文档

- [移动端开发总览](./MOBILE.md)
- [项目 README](../README.md)
