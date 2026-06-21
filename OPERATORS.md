# Mutation operators — Java vs Smali walkthrough

A study companion for each operator: the Java source it targets, the
mutation as Kadabra would express it at Java source level, the original
Dalvik/Smali bytecode it actually transforms, and the Smali bytecode it
produces.

---

## Background

**Kadabra** (the Java source-level system this builds on) parses Java
source into an AST, mutates AST nodes, and writes Java back out. It has
two run modes:

- **Traditional**: one mutation per APK; recompile and re-test per
  variant.
- **Schemata** (`mutationType: MUTANTSCHEMATA`): all mutants embedded in
  one APK, switched at runtime via a static `MUTANT_ID` field.

**metford-apk** implements the same schemata technique, but at the
Smali (Dalvik bytecode) level. Operators are split exactly the same way
Kadabra does — one operator per conceptual mutation — and the runner
merges variants from different operators when they target the same
site.

### How a site becomes a packed-switch

Every mutation site is wrapped in a Dalvik `packed-switch` whose
selector is `MUTANT_ID − base_id`:

```smali
sget v_tmp, Lpt/up/fe/specs/metford/MutationController;->MUTANT_ID:I
add-int/lit16 v_tmp, v_tmp, -<base_id>
packed-switch v_tmp, :data_label
goto :default_label

:case_0
    <variant 0 body>
    goto :end_label
:case_1
    <variant 1 body>
    goto :end_label
…
:default_label
    <original body>

:data_label
.packed-switch 0x0
    :case_0
    :case_1
.end packed-switch

:end_label
```

`MUTANT_ID = 0` → default case (original). `MUTANT_ID = base_id + k` →
case `k`.

### How multiple operators share a site

Each operator runs in a **propose** pass that doesn't touch the AST —
it returns a `MutationProposal { anchor, detach, originalCode, variants }`
per match. The runner then groups proposals by their anchor instruction
(fingerprinted by the surrounding code), merges their variants into a
single `packed-switch`, and detaches the original instructions once.

So when `NullIntent` and `RandomIntentAction` both target the same
`new Intent(...)`, their variants become cases 0/1/2 of one switch.
Each variant in `mutation-report.json` is attributed to its originating
operator.

The sections below omit the packed-switch wrapper and only show the
**original** and **mutant** bodies — the wrapper is identical for
every site.

---

## 1. ArithmeticOperatorMutator

Replace one arithmetic operator with another from the same family
(`+ - * / %`).

### Java source

```java
public static int add(int a, int b) {
    return a + b;
}
```

### Java-level mutant (Kadabra)

```java
public static int add(int a, int b) {
    return a - b;        // variant 0
}
// or
public static int add(int a, int b) {
    return a * b;        // variant 1
}
```

### Smali original

```smali
add-int v0, p0, p1
```

### Smali mutants

```smali
sub-int v0, p0, p1       # variant 0
mul-int v0, p0, p1       # variant 1
```

### Test that kills it

```java
assertEquals(5, MainActivity.add(2, 3));   // sub→-1, mul→6
```

---

## 2. ConditionalOperatorMutator

Flip a conditional jump to its logical opposite.

### Java source

```java
if (count == 0) handleEmpty();
```

### Java-level mutant (Kadabra)

```java
if (count != 0) handleEmpty();
```

### Smali original

```smali
if-eqz v0, :cond_a
```

### Smali mutant

```smali
if-nez v0, :cond_a
```

### Test that kills it

Any test where both branches matter (one expects state after the true
branch, the other after the false branch).

---

## 3. ConstantReplacementMutator

Replace a non-zero numeric literal with `0` or `1`.

### Java source

```java
int retries = 3;
```

### Java-level mutants (Kadabra)

```java
int retries = 0;         // variant 0
int retries = 1;         // variant 1
```

### Smali original

```smali
const/4 v0, 0x3
```

### Smali mutants

```smali
const/16 v0, 0x0         # variant 0
const/16 v0, 0x1         # variant 1
```

### Test that kills it

Loops, retry counts, sentinel values — any assertion on the downstream
effect of the constant.

---

## 4. InvalidDateMutator

Replace `new Date()` (returns "now") with `new Date(10000L)` (returns
Jan 1 1970 + 10 s).

### Java source

```java
Date d = new Date();
```

### Java-level mutant (Kadabra)

```java
Date d = new Date(10000L);
```

### Smali original

```smali
new-instance v0, Ljava/util/Date;
invoke-direct {v0}, Ljava/util/Date;-><init>()V
```

### Smali mutant

```smali
new-instance v0, Ljava/util/Date;
const-wide/16 v1, 0x2710                              # 10000L
invoke-direct {v0, v1, v2}, Ljava/util/Date;-><init>(J)V
```

### Smali-level specifics

Dalvik has no 64-bit registers. A `long` argument occupies a **register
pair** — two consecutive 32-bit registers. `const-wide/16 v1, 0x2710`
writes the low half to `v1` and the high half to `v2`. The
`invoke-direct` for `(J)V` therefore needs three registers in its
argument list: the object plus both halves of the long.

This is why this mutator declares `extraRegisters: 2` — the runner
reserves both `tmpReg` and `tmpReg+1` by bumping `.locals` by 2.

### Test that kills it

```java
long before = System.currentTimeMillis();
Date d = MainActivity.getCurrentDate();
long after = System.currentTimeMillis();
assertTrue(d.getTime() >= before && d.getTime() <= after);
```

---

## 5. NullIntentMutator

Replace an `Intent` allocation with `null`.

### Java source

```java
Intent intent = new Intent(context, MainActivity.class);
```

### Java-level mutant (Kadabra)

```java
Intent intent = null;
```

### Smali original

```smali
new-instance v0, Landroid/content/Intent;
const-class v1, Lcom/example/myapplication/MainActivity;
invoke-direct {v0, p0, v1}, Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V
```

### Smali mutant

```smali
const/4 v0, 0x0
```

### Smali-level specifics

`new Intent(context, MainActivity.class)` is **one expression** at Java
level but **three Smali instructions**: `new-instance` (allocate),
`const-class` (load the `Class` literal into a register), and
`invoke-direct` (call the constructor). The mutator finds the
`invoke-direct ... Intent;-><init>`, then walks backward through
intermediate instructions (the `const-class` here) to find the
`new-instance`. All three are detached and replaced by the schemata.

### Test that kills it

```java
Intent intent = MainActivity.buildIntent(ctx, "myKey", "myValue");
assertNotNull(intent);
```

---

## 6. RandomIntentActionMutator

Replace an explicit `Intent(context, Class)` constructor with an
implicit `Intent(action)` constructor — two variants, one per action
constant.

### Java source

```java
Intent intent = new Intent(context, MainActivity.class);
```

### Java-level mutants (Kadabra)

```java
Intent intent = new Intent(Intent.ACTION_VIEW);   // variant 0
Intent intent = new Intent(Intent.ACTION_SEND);   // variant 1
```

### Smali original

```smali
new-instance v0, Landroid/content/Intent;
const-class v1, Lcom/example/myapplication/MainActivity;
invoke-direct {v0, p0, v1}, Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V
```

### Smali mutants

```smali
# variant 0 — new Intent(ACTION_VIEW)
new-instance v0, Landroid/content/Intent;
sget-object v_tmp, Landroid/content/Intent;->ACTION_VIEW:Ljava/lang/String;
invoke-direct {v0, v_tmp}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V

# variant 1 — new Intent(ACTION_SEND)
new-instance v0, Landroid/content/Intent;
sget-object v_tmp, Landroid/content/Intent;->ACTION_SEND:Ljava/lang/String;
invoke-direct {v0, v_tmp}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V
```

### Smali-level specifics

Same backward-search-for-`new-instance` story as `NullIntentMutator`.
The `sget-object` for `ACTION_VIEW`/`ACTION_SEND` reuses the
schemata's `tmpReg` — after `packed-switch` jumps into a case body the
temp register is free to repurpose.

### Note: same site as `NullIntentMutator`

Because both operators target the same Intent constructor, the runner
groups their proposals into one site with three combined variants
(null + ACTION_VIEW + ACTION_SEND). The report records each variant's
originating operator.

### Test that kills it

```java
// kills both action variants (they construct an Intent with no target component)
assertEquals("myValue", intent.getStringExtra("myKey"));
```

---

## 7. NullPutExtraValueMutator

Replace the value argument of `intent.putExtra(key, value)` with null.

### Java source

```java
intent.putExtra("myKey", "myValue");
```

### Java-level mutant (Kadabra)

```java
intent.putExtra("myKey", null);
```

### Smali original

```smali
invoke-virtual {v0, p1, p2}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;
```

### Smali mutant

```smali
const/4 p2, 0x0
invoke-virtual {v0, p1, p2}, Landroid/content/Intent;->putExtra(...)Landroid/content/Intent;
```

### Smali-level specifics

At Java level, "swap the second argument for null" rewrites one AST
node. At Smali level, arguments are passed via registers — we
overwrite the value register **before** the call. The call itself is
unchanged.

`putExtra` returns `Intent` (builder pattern). If a `move-result-object`
follows the original call, it's included in both the original code and
the variant so the result register stays valid.

### Test that kills it

```java
assertEquals("myValue", intent.getStringExtra("myKey"));   // null
```

---

## 8. NullPutExtraKeyMutator

Replace the key argument of `intent.putExtra(key, value)` with a
sentinel that won't match the receiver's `getStringExtra(...)`.

### Java source

```java
intent.putExtra("myKey", "myValue");
```

### Java-level mutant (Kadabra)

```java
intent.putExtra("__metford_invalid_key__", "myValue");
```

### Smali original

```smali
invoke-virtual {v0, p1, p2}, Landroid/content/Intent;->putExtra(...)Landroid/content/Intent;
```

### Smali mutant

```smali
const-string p1, "__metford_invalid_key__"
invoke-virtual {v0, p1, p2}, Landroid/content/Intent;->putExtra(...)Landroid/content/Intent;
```

### Note: same site as `NullPutExtraValueMutator`

The runner groups both putExtra operators into one site (two variants):
null value + invalid key.

### Test that kills it

```java
assertEquals("myValue", intent.getStringExtra("myKey"));
// returns null because the key was stored under "__metford_invalid_key__"
```

---

## 9. BuggyGUIListenerMutator

Set the listener argument of `setOnClickListener` to null.

### Java source

```java
button.setOnClickListener(new View.OnClickListener() {
    @Override public void onClick(View v) { result.setText("clicked"); }
});
```

### Java-level mutant (Kadabra)

```java
button.setOnClickListener(null);
```

### Smali original

```smali
# (anonymous class allocation — kept in the mutant too)
new-instance v2, Lcom/example/myapplication/MainActivity$1;
invoke-direct {v2, p0, v1}, Lcom/example/myapplication/MainActivity$1;-><init>(...)V

invoke-virtual {v0, v2}, Landroid/view/View;->setOnClickListener(Landroid/view/View$OnClickListener;)V
```

### Smali mutant

```smali
new-instance v2, Lcom/example/myapplication/MainActivity$1;
invoke-direct {v2, p0, v1}, Lcom/example/myapplication/MainActivity$1;-><init>(...)V

const/4 v2, 0x0
invoke-virtual {v0, v2}, Landroid/view/View;->setOnClickListener(Landroid/view/View$OnClickListener;)V
```

### Smali-level specifics

The anonymous `OnClickListener` compiles to a separate class
`MainActivity$1` with its own `.smali` file. The instantiation
(`new-instance` + `invoke-direct`) happens before `setOnClickListener`.
The mutator doesn't touch those — it overwrites the listener register
right before the call.

The matcher uses `->setOnClickListener(Landroid/view/View$OnClickListener;)V`
without a class prefix so it works whether the variable's static type
is `Button`, `View`, etc. (d8 emits the invoke against the declared
type).

### Test that kills it

```java
onView(withId(R.id.button_action)).perform(click());
onView(withId(R.id.text_result)).check(matches(withText("clicked")));
```

---

## 10. LengthyGUIListenerMutator

Insert `Thread.sleep(10000)` before the return of an `onClick` method.

### Java source

```java
@Override public void onClick(View v) {
    result.setText("clicked");
}
```

### Java-level mutant (Kadabra)

```java
@Override public void onClick(View v) {
    result.setText("clicked");
    try { Thread.sleep(10000); } catch (InterruptedException e) {}
}
```

### Smali original

```smali
return-void
```

### Smali mutant

```smali
const-wide/16 v_tmp, 0x2710
invoke-static {v_tmp, v_tmp+1}, Ljava/lang/Thread;->sleep(J)V
return-void
```

### Smali-level specifics

`MethodNode.name` returns the full Smali reference like
`Lcom/example/myapplication/MainActivity$1;->onClick(Landroid/view/View;)V`.
The mutator filters by `method.name.includes("onClick(Landroid/view/View;)V")`
so it catches any class's `onClick`.

`Thread.sleep(J)V` takes a wide argument → register pair →
`extraRegisters: 2`.

**Checked exceptions don't exist at bytecode level.** Java forces a
try/catch for `InterruptedException`. Dalvik bytecode doesn't enforce
checked exceptions at verification — only javac does — so the mutator
can drop a raw `Thread.sleep` call into any method.

### Test that kills it

```java
long start = System.currentTimeMillis();
onView(withId(R.id.button_action)).perform(click());
long elapsed = System.currentTimeMillis() - start;
assertTrue(elapsed < 5000);
```

---

## 11. LengthyGUICreationMutator

Insert `Thread.sleep(10000)` right after `super.onCreate()` in an
Activity.

### Java source

```java
@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);
}
```

### Java-level mutant (Kadabra)

```java
@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    try { Thread.sleep(10000); } catch (InterruptedException e) {}
    setContentView(R.layout.activity_main);
}
```

### Smali original

```smali
invoke-super {p0, p1}, Landroidx/appcompat/app/AppCompatActivity;->onCreate(Landroid/os/Bundle;)V
```

### Smali mutant

```smali
invoke-super {p0, p1}, Landroidx/appcompat/app/AppCompatActivity;->onCreate(Landroid/os/Bundle;)V
const-wide/16 v_tmp, 0x2710
invoke-static {v_tmp, v_tmp+1}, Ljava/lang/Thread;->sleep(J)V
```

### Smali-level specifics

`invoke-super` names the super class explicitly. The matcher uses
`->onCreate(Landroid/os/Bundle;)V` without a class prefix so it works
for both `Activity` and `AppCompatActivity` subclasses.

### Test that kills it

```java
long start = System.currentTimeMillis();
try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
    scenario.onActivity(activity -> {});
}
long elapsed = System.currentTimeMillis() - start;
assertTrue(elapsed < 5000);
```

---

## 12. FindViewByIdReturnsNullMutator

Replace `findViewById` + capture-result with a null-result. The call
is skipped entirely.

### Java source

```java
Button button = findViewById(R.id.button_action);
```

### Java-level mutant (Kadabra)

```java
Button button = null;
```

### Smali original

```smali
invoke-virtual {p0, v0}, Lcom/example/myapplication/MainActivity;->findViewById(I)Landroid/view/View;
move-result-object v0
```

### Smali mutant

```smali
const/4 v0, 0x0
```

### Smali-level specifics

A Java method invocation with a return value is **two instructions** at
Smali level: `invoke-virtual` to call, then `move-result-object` to
capture the return. The pair must stay adjacent — nothing else may go
between them.

This mutant skips both instructions and writes the result register to
null directly.

### Test that kills it

Any test that calls a method on `button` — NPE.

---

## 13. InvalidIDFindViewMutator

Overwrite the ID argument of `findViewById` with an invalid resource
ID. The call runs and returns null at runtime.

### Java source

```java
Button button = findViewById(R.id.button_action);
```

### Java-level mutant (Kadabra)

```java
Button button = findViewById(0x7fffffff);   // no resource has this ID
```

### Smali original

```smali
invoke-virtual {p0, v0}, ...->findViewById(I)Landroid/view/View;
move-result-object v0
```

### Smali mutant

```smali
const v0, 0x7fffffff
invoke-virtual {p0, v0}, ...->findViewById(I)Landroid/view/View;
move-result-object v0
```

### Note: same site as the other findViewById operators

Operators 12, 13, 14, 15 all target the same `findViewById` +
`move-result-object` pair. The runner groups them into one site with
four variants per `findViewById` call.

### Test that kills it

Same as `FindViewByIdReturnsNullMutator`: `findViewById` returns null
at runtime, so any later use of `button` NPEs.

---

## 14. InvalidViewFocusMutator

Keep the `findViewById` call but call `requestFocus()` on the returned
view — it steals keyboard/input focus.

### Java source

```java
Button button = findViewById(R.id.button_action);
```

### Java-level mutant (Kadabra)

```java
Button button = findViewById(R.id.button_action);
button.requestFocus();
```

### Smali original

```smali
invoke-virtual {p0, v0}, ...->findViewById(I)Landroid/view/View;
move-result-object v0
```

### Smali mutant

```smali
invoke-virtual {p0, v0}, ...->findViewById(I)Landroid/view/View;
move-result-object v0
invoke-virtual {v0}, Landroid/view/View;->requestFocus()Z
```

### Test that kills it

```java
onView(withId(R.id.button_action))
    .check(matches(not(hasFocus())));
```

---

## 15. ViewComponentNotVisibleMutator

Keep the `findViewById` call but call `setVisibility(INVISIBLE)` on
the returned view — it's still in the layout but isn't drawn or
clickable.

### Java source

```java
Button button = findViewById(R.id.button_action);
```

### Java-level mutant (Kadabra)

```java
Button button = findViewById(R.id.button_action);
button.setVisibility(View.INVISIBLE);
```

### Smali original

```smali
invoke-virtual {p0, v0}, ...->findViewById(I)Landroid/view/View;
move-result-object v0
```

### Smali mutant

```smali
invoke-virtual {p0, v0}, ...->findViewById(I)Landroid/view/View;
move-result-object v0
const/4 v_tmp, 0x4                                          # View.INVISIBLE
invoke-virtual {v0, v_tmp}, Landroid/view/View;->setVisibility(I)V
```

### Test that kills it

```java
onView(withId(R.id.button_action))
    .check(matches(isDisplayed()));
```
