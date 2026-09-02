# MemoPear — Android app

MemoPear ships to Android using [Capacitor](https://capacitorjs.com). Capacitor
wraps the existing Vite/React web build in a native Android shell (a real
`.apk`/`.aab` you can publish to Google Play). The camera-based card capture,
Firebase, and Gemini features all run from the same web codebase — there is no
separate native rewrite.

## What lives where

- `capacitor.config.ts` — app id (`com.memopear.app`), app name, and the web
  build directory (`dist`).
- `android/` — the generated native Android Studio project. It is committed to
  the repo. Regenerate the web assets inside it with `npx cap sync android`.

## Prerequisites (one-time, on your machine)

1. **Android Studio** — https://developer.android.com/studio (installs the
   Android SDK, platform tools, and an emulator).
2. **JDK 21** — bundled with recent Android Studio; otherwise install Temurin 21.
3. Node 20+ and run `npm install` in the repo root.

## Everyday workflow

```bash
# 1. Build the web app and copy it into the native project
npm run android:sync

# 2a. Open the project in Android Studio (to run on a device/emulator, or build APK/AAB)
npm run android:open

# 2b. …or build + launch directly on a connected device/emulator
npm run android:run
```

`android:sync` = `vite build` + `cap sync android`. Run it after **every** web
change, otherwise the app in the WebView is stale.

## Build a shareable APK (debug)

In Android Studio: **Build ▸ Build Bundle(s) / APK(s) ▸ Build APK(s)**.
The debug APK lands in `android/app/build/outputs/apk/debug/app-debug.apk`.
You can side-load it onto any Android phone (enable "Install unknown apps").

Or from the CLI:

```bash
cd android && ./gradlew assembleDebug
```

## Build a release AAB for Google Play

1. Create an upload keystore (one time):
   ```bash
   keytool -genkey -v -keystore memopear-upload.jks \
     -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
   Keep this file and its passwords safe — Play requires the same key for every
   update. Do **not** commit it.
2. In Android Studio: **Build ▸ Generate Signed Bundle / APK ▸ Android App
   Bundle**, point it at the keystore, and produce `app-release.aab`.
3. Upload the `.aab` in the [Google Play Console](https://play.google.com/console)
   (a one-time \$25 developer registration is required).

## Notes

- **Camera:** card capture uses the web `<input capture="environment">`, which
  opens the native camera through the WebView. `CAMERA` permission is declared
  in `android/app/src/main/AndroidManifest.xml`.
- **Firebase Auth:** popup/redirect sign-in behaves differently inside a
  WebView. If Google sign-in misbehaves in the app, switch that flow to
  `signInWithRedirect` or the Capacitor Firebase Authentication plugin, and add
  the app's SHA-1/SHA-256 fingerprints in the Firebase console.
- **App icon / splash:** replace the assets under
  `android/app/src/main/res/mipmap-*` (icons) — the `@capacitor/assets` tool can
  generate all densities from a single source image.
- **App id:** change `appId` in `capacitor.config.ts` before first publish if
  `com.memopear.app` is not the desired package name.
