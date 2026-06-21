# metford-apk

Mutation testing framework for Android binaries using [Alpakka](https://github.com/specs-feup/alpakka).

All mutants are embedded in a single APK via the **schemata** technique — a static `MutationController.MUTANT_ID` field selects which mutant runs at startup. The operator set and decomposition matches Kadabra-schemata; metford-apk applies it at the Smali bytecode level instead of Java source.

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

## Configuration

Edit `metford.config.json` to control the run:

```json
{
    "projectName": "MyApplication",
    "inputApk": "InputSources/",
    "outputApk": "mutated-app.apk",
    "reportPath": "mutation-report.json",
    "packageFilter": "com/example/myapplication",
    "verbose": true,
    "operators": [ "Arithmetic", "Conditional", "Constant",
                   "InvalidDate",
                   "NullIntent", "RandomIntentAction",
                   "NullPutExtraValue", "NullPutExtraKey",
                   "BuggyGUIListener", "LengthyGUIListener", "LengthyGUICreation",
                   "FindViewByIdReturnsNull", "InvalidIDFindView",
                   "InvalidViewFocus", "ViewComponentNotVisible" ]
}
```

The full operator list and what each one does is in [OPERATORS.md](OPERATORS.md).

## Running a mutation

Compile the TypeScript source and run Alpakka on the input APK:

```bash
npm run build
npm run run
```

The input APK is read from `inputApk` and the mutated APK is written to `outputApk`. A per-site report goes to `reportPath`.

## Running tests against the mutated APK

### Prerequisites

These only need to be done once.

**Build and install the test APK:**

```bash
cd apps/MyApplication
./gradlew assembleDebugAndroidTest
adb install app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
```

### Installing the mutated APK

```bash
zipalign -p -f 4 mutated-app.apk mutated-app-aligned.apk

apksigner sign --ks ~/.android/debug.keystore --ks-pass pass:android mutated-app-aligned.apk

adb install -r mutated-app-aligned.apk
```

### Selecting which mutant runs

Every `siteTag` / mutant has an ID in `mutation-report.json`. `MUTANT_ID = 0` runs the original (every site's default case). Setting it to a value in `[1, totalMutants]` activates exactly one mutant — all other sites fall through to their defaults.

The simplest way to set it from an instrumented test is to write the static field directly before exercising the code:

```java
import pt.up.fe.specs.metford.MutationController;

@Before
public void selectMutant() {
    MutationController.MUTANT_ID = 5;   // run mutant #5
}
```

For a study run that iterates over every mutant, read the ID from an instrumentation argument so the test code stays unchanged:

```java
@Before
public void selectMutant() {
    String id = InstrumentationRegistry.getArguments().getString("mutantId", "0");
    MutationController.MUTANT_ID = Integer.parseInt(id);
}
```

Then loop in your shell — `MUTANT_ID = 0` is the original, IDs `1..totalMutants` activate each individual mutant:

```bash
total=$(jq -r '.totalMutants' mutation-report.json)
for id in $(seq 0 "$total"); do
    echo "=== mutant $id ==="
    adb shell am instrument -w \
      -e mutantId $id \
      -e class com.example.myapplication.MainActivityInstrumentedTest \
      com.example.myapplication.test/androidx.test.runner.AndroidJUnitRunner
done
```

### Running the tests

```bash
adb shell am instrument -w \
  -e class com.example.myapplication.MainActivityInstrumentedTest \
  com.example.myapplication.test/androidx.test.runner.AndroidJUnitRunner
```

A mutant is **killed** if at least one test fails for that `MUTANT_ID`. The fraction of mutants killed across the whole run is the **mutation score** — your test suite's quality metric.
