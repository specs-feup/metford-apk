# metford-apk

Mutation testing framework for Android binaries using [Alpakka](https://github.com/specs-feup/alpakka).

## Building the original APK

```bash
cd apps/MyApplication
./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk ../../InputSources/app-debug.apk
```

## Setup

Install dependencies:

```bash
npm install
```

## Running a mutation

Compile the TypeScript source and run Alpakka on the input APK:

```bash
npm run build
npm run run
```

The input APK is read from `InputSources/` and the mutated APK is written to `mutated-app.apk`.

## Running tests against the mutated APK

### Prerequisites

These only need to be done once.

**Build and install the test APK:**

```bash
cd apps/MyApplication
./gradlew assembleDebugAndroidTest
adb install app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
```

### For each mutation

Sign and install the mutated APK, then run the tests:

```bash
zipalign -p -f 4 mutated-app.apk mutated-app-aligned.apk

apksigner sign --ks ~/.android/debug.keystore --ks-pass pass:android mutated-app-aligned.apk

adb install -r mutated-app-aligned.apk

adb shell am instrument -w \
  -e class com.example.myapplication.MainActivityInstrumentedTest \
  com.example.myapplication.test/androidx.test.runner.AndroidJUnitRunner
```
