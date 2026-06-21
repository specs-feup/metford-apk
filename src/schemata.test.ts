import { describe, it, expect, afterEach } from "@jest/globals";
import JavaTypes from "@specs-feup/lara/api/lara/util/JavaTypes.js";
import Weaver from "@specs-feup/lara/api/weaver/Weaver.js";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import { MethodNode } from "@specs-feup/alpakka/api/Joinpoints.js";
import AlpakkaJavaTypes from "@specs-feup/alpakka/api/alpakka/AlpakkaJavaTypes.js";
import { Program } from "@specs-feup/alpakka/api/Joinpoints.js";
import { MutationEngine } from "./MutationEngine.js";
import { Mutator } from "./MutatorBase.js";
import { applyToMethod } from "./runner.js";
import { ArithmeticOperatorMutator } from "./mutators/ArithmeticOperatorMutator.js";
import { NullIntentMutator } from "./mutators/NullIntentMutator.js";
import { NullPutExtraValueMutator } from "./mutators/NullPutExtraValueMutator.js";
import { NullPutExtraKeyMutator } from "./mutators/NullPutExtraKeyMutator.js";
import { InvalidDateMutator } from "./mutators/InvalidDateMutator.js";
import { BuggyGUIListenerMutator } from "./mutators/BuggyGUIListenerMutator.js";
import { LengthyGUIListenerMutator } from "./mutators/LengthyGUIListenerMutator.js";
import { LengthyGUICreationMutator } from "./mutators/LengthyGUICreationMutator.js";
import { FindViewByIdReturnsNullMutator } from "./mutators/FindViewByIdReturnsNullMutator.js";
import { InvalidIDFindViewMutator } from "./mutators/InvalidIDFindViewMutator.js";
import { InvalidViewFocusMutator } from "./mutators/InvalidViewFocusMutator.js";
import { ViewComponentNotVisibleMutator } from "./mutators/ViewComponentNotVisibleMutator.js";
import fs from "fs";
import path from "path";

const SMALI_DIR = path.resolve("src/test/smali");
const OUTPUT_DIR = path.resolve("src/test/output");

function loadSmali(filename: string): void {
    const javaWeaver = Weaver.getWeaverEngine();
    const javaDatastore = javaWeaver.getData().get();
    javaDatastore.set(AlpakkaJavaTypes.AlpakkaOption.TARGET_SDK, 20);
    const file = new JavaTypes.File(path.join(SMALI_DIR, filename));
    const files = new JavaTypes.ArrayList();
    files.add(file);
    javaDatastore.set(JavaTypes.LaraiKeys.WORKSPACE_FOLDER, JavaTypes.FileList.newInstance(files));
    javaWeaver.run(javaDatastore);
}

afterEach(() => {
    const javaWeaver = Weaver.getWeaverEngine();
    const javaDatastore = javaWeaver.getData().get();
    javaDatastore.set(JavaTypes.LaraiKeys.WORKSPACE_FOLDER, JavaTypes.FileList.newInstance());
    javaWeaver.run(javaDatastore);
});

function runMutators(mutators: Mutator[], engine: MutationEngine) {
    for (const method of Query.search(MethodNode)) {
        applyToMethod(method, mutators, engine);
    }
}

const codes = (record: { variants: { code: string }[] }) => record.variants.map(v => v.code);
const operators = (record: { variants: { operator: string }[] }) => record.variants.map(v => v.operator);

describe("ArithmeticOperatorMutator", () => {
    it("wraps add-int in packed-switch schemata with correct mutants", () => {
        loadSmali("ArithmeticMutation.smali");

        const engine = new MutationEngine();
        runMutators([new ArithmeticOperatorMutator({ from: "add", to: ["sub", "mul"] })], engine);

        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(path.join(OUTPUT_DIR, "ArithmeticMutation.smali"), (Query.root() as Program).code);

        expect(engine.records).toHaveLength(1);
        const [record] = engine.records;
        expect(operators(record)).toEqual(["ArithmeticOperatorMutator", "ArithmeticOperatorMutator"]);
        expect(record.original).toBe("add-int v0, p0, p1");
        expect(codes(record)).toEqual(["sub-int v0, p0, p1", "mul-int v0, p0, p1"]);

        const code = (Query.root() as Program).code;
        expect(code).toContain("packed-switch");
        expect(code).toContain(".locals 2");
        expect(code).toContain("add-int v0, p0, p1");
        expect(code).toContain("sub-int v0, p0, p1");
        expect(code).toContain("mul-int v0, p0, p1");
    });
});

describe("NullIntentMutator", () => {
    it("replaces Intent constructor pair with const/4 null", () => {
        loadSmali("NullIntentMutation.smali");

        const engine = new MutationEngine();
        runMutators([new NullIntentMutator()], engine);

        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(path.join(OUTPUT_DIR, "NullIntentMutation.smali"), (Query.root() as Program).code);

        expect(engine.records).toHaveLength(1);
        const [record] = engine.records;
        expect(operators(record)).toEqual(["NullIntentMutator"]);
        expect(record.original).toContain("new-instance v0, Landroid/content/Intent;");
        expect(record.original).toContain("invoke-direct");
        expect(codes(record)[0]).toBe("const/4 v0, 0x0");

        const code = (Query.root() as Program).code;
        expect(code).toContain("packed-switch");
        expect(code).toContain("const/4 v0, 0x0");
        expect(code).toContain("new-instance v0, Landroid/content/Intent;");
    });
});

describe("NullPutExtraValueMutator", () => {
    it("nullifies the value argument of putExtra", () => {
        loadSmali("NullPutExtraMutation.smali");

        const engine = new MutationEngine();
        runMutators([new NullPutExtraValueMutator()], engine);

        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(path.join(OUTPUT_DIR, "NullPutExtraMutation.smali"), (Query.root() as Program).code);

        expect(engine.records).toHaveLength(1);
        const [record] = engine.records;
        expect(operators(record)).toEqual(["NullPutExtraValueMutator"]);
        expect(record.original).toContain("putExtra");
        expect(codes(record)[0]).toContain("const/4 p1, 0x0");
        expect(codes(record)[0]).toContain("putExtra");

        const code = (Query.root() as Program).code;
        expect(code).toContain("packed-switch");
        expect(code).toContain("const/4 p1, 0x0");
        expect(code).toContain("putExtra");
    });
});

describe("NullPutExtraKeyMutator", () => {
    it("replaces putExtra key with invalid string", () => {
        loadSmali("NullPutExtraMutation.smali");

        const engine = new MutationEngine();
        runMutators([new NullPutExtraKeyMutator()], engine);

        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(path.join(OUTPUT_DIR, "NullPutExtraKeyMutation.smali"), (Query.root() as Program).code);

        expect(engine.records).toHaveLength(1);
        const [record] = engine.records;
        expect(operators(record)).toEqual(["NullPutExtraKeyMutator"]);
        expect(codes(record)[0]).toContain("const-string v0, \"__metford_invalid_key__\"");
        expect(codes(record)[0]).toContain("putExtra");

        const code = (Query.root() as Program).code;
        expect(code).toContain("packed-switch");
        expect(code).toContain("__metford_invalid_key__");
    });
});

describe("InvalidDateMutator", () => {
    it("replaces no-arg Date constructor with timestamped Date", () => {
        loadSmali("InvalidDateMutation.smali");

        const engine = new MutationEngine();
        runMutators([new InvalidDateMutator()], engine);

        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(path.join(OUTPUT_DIR, "InvalidDateMutation.smali"), (Query.root() as Program).code);

        expect(engine.records).toHaveLength(1);
        const [record] = engine.records;
        expect(operators(record)).toEqual(["InvalidDateMutator"]);
        expect(record.original).toContain("new-instance v0, Ljava/util/Date;");
        expect(record.original).toContain("invoke-direct {v0}, Ljava/util/Date;-><init>()V");
        expect(codes(record)[0]).toContain("const-wide/16");
        expect(codes(record)[0]).toContain("Ljava/util/Date;-><init>(J)V");

        const code = (Query.root() as Program).code;
        expect(code).toContain("packed-switch");
        expect(code).toContain("const-wide/16");
        expect(code).toContain(".locals 3");
    });
});

describe("BuggyGUIListenerMutator", () => {
    it("nullifies the listener argument of setOnClickListener", () => {
        loadSmali("BuggyGUIListenerMutation.smali");

        const engine = new MutationEngine();
        runMutators([new BuggyGUIListenerMutator()], engine);

        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(path.join(OUTPUT_DIR, "BuggyGUIListenerMutation.smali"), (Query.root() as Program).code);

        expect(engine.records).toHaveLength(1);
        const [record] = engine.records;
        expect(operators(record)).toEqual(["BuggyGUIListenerMutator"]);
        expect(record.original).toContain("setOnClickListener");
        expect(codes(record)[0]).toContain("const/4 p1, 0x0");
        expect(codes(record)[0]).toContain("setOnClickListener");

        const code = (Query.root() as Program).code;
        expect(code).toContain("packed-switch");
        expect(code).toContain("const/4 p1, 0x0");
        expect(code).toContain("setOnClickListener");
    });
});

describe("LengthyGUIListenerMutator", () => {
    it("inserts Thread.sleep before return-void in onClick", () => {
        loadSmali("LengthyGUIListenerMutation.smali");

        const engine = new MutationEngine();
        runMutators([new LengthyGUIListenerMutator()], engine);

        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(path.join(OUTPUT_DIR, "LengthyGUIListenerMutation.smali"), (Query.root() as Program).code);

        expect(engine.records).toHaveLength(1);
        const [record] = engine.records;
        expect(operators(record)).toEqual(["LengthyGUIListenerMutator"]);
        expect(record.original).toContain("return-void");
        expect(codes(record)[0]).toContain("const-wide/16");
        expect(codes(record)[0]).toContain("Thread;->sleep(J)V");
        expect(codes(record)[0]).toContain("return-void");

        const code = (Query.root() as Program).code;
        expect(code).toContain("packed-switch");
        expect(code).toContain("Thread;->sleep");
    });
});

describe("LengthyGUICreationMutator", () => {
    it("inserts Thread.sleep after invoke-super onCreate", () => {
        loadSmali("LengthyGUICreationMutation.smali");

        const engine = new MutationEngine();
        runMutators([new LengthyGUICreationMutator()], engine);

        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(path.join(OUTPUT_DIR, "LengthyGUICreationMutation.smali"), (Query.root() as Program).code);

        expect(engine.records).toHaveLength(1);
        const [record] = engine.records;
        expect(operators(record)).toEqual(["LengthyGUICreationMutator"]);
        expect(record.original).toContain("invoke-super");
        expect(record.original).toContain("Activity;->onCreate(");
        expect(codes(record)[0]).toContain("invoke-super");
        expect(codes(record)[0]).toContain("const-wide/16");
        expect(codes(record)[0]).toContain("Thread;->sleep(J)V");

        const code = (Query.root() as Program).code;
        expect(code).toContain("packed-switch");
        expect(code).toContain("Thread;->sleep");
    });
});

describe("FindViewByIdReturnsNullMutator", () => {
    it("replaces findViewById result with null", () => {
        loadSmali("FindViewByIdMutation.smali");

        const engine = new MutationEngine();
        runMutators([new FindViewByIdReturnsNullMutator()], engine);

        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(path.join(OUTPUT_DIR, "FindViewByIdReturnsNullMutation.smali"), (Query.root() as Program).code);

        expect(engine.records).toHaveLength(1);
        const [record] = engine.records;
        expect(operators(record)).toEqual(["FindViewByIdReturnsNullMutator"]);
        expect(record.original).toContain("findViewById");
        expect(record.original).toContain("move-result-object");
        expect(codes(record)[0]).toBe("const/4 v0, 0x0");

        const code = (Query.root() as Program).code;
        expect(code).toContain("packed-switch");
        expect(code).toContain("const/4 v0, 0x0");
        expect(code).toContain("findViewById");
    });
});

describe("InvalidIDFindViewMutator", () => {
    it("replaces the ID argument of findViewById with an invalid value", () => {
        loadSmali("FindViewByIdMutation.smali");

        const engine = new MutationEngine();
        runMutators([new InvalidIDFindViewMutator()], engine);

        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(path.join(OUTPUT_DIR, "InvalidIDFindViewMutation.smali"), (Query.root() as Program).code);

        expect(engine.records).toHaveLength(1);
        const [record] = engine.records;
        expect(operators(record)).toEqual(["InvalidIDFindViewMutator"]);
        expect(record.original).toContain("findViewById");
        expect(codes(record)[0]).toContain("const v0, 0x7fffffff");
        expect(codes(record)[0]).toContain("findViewById");

        const code = (Query.root() as Program).code;
        expect(code).toContain("packed-switch");
        expect(code).toContain("0x7fffffff");
    });
});

describe("InvalidViewFocusMutator", () => {
    it("adds requestFocus call after findViewById", () => {
        loadSmali("FindViewByIdMutation.smali");

        const engine = new MutationEngine();
        runMutators([new InvalidViewFocusMutator()], engine);

        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(path.join(OUTPUT_DIR, "InvalidViewFocusMutation.smali"), (Query.root() as Program).code);

        expect(engine.records).toHaveLength(1);
        const [record] = engine.records;
        expect(operators(record)).toEqual(["InvalidViewFocusMutator"]);
        expect(record.original).toContain("findViewById");
        expect(record.original).toContain("move-result-object");
        expect(codes(record)[0]).toContain("requestFocus");

        const code = (Query.root() as Program).code;
        expect(code).toContain("packed-switch");
        expect(code).toContain("requestFocus");
    });
});

describe("ViewComponentNotVisibleMutator", () => {
    it("adds setVisibility(INVISIBLE) call after findViewById", () => {
        loadSmali("FindViewByIdMutation.smali");

        const engine = new MutationEngine();
        runMutators([new ViewComponentNotVisibleMutator()], engine);

        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(path.join(OUTPUT_DIR, "ViewComponentNotVisibleMutation.smali"), (Query.root() as Program).code);

        expect(engine.records).toHaveLength(1);
        const [record] = engine.records;
        expect(operators(record)).toEqual(["ViewComponentNotVisibleMutator"]);
        expect(record.original).toContain("findViewById");
        expect(record.original).toContain("move-result-object");
        expect(codes(record)[0]).toContain("setVisibility");
        expect(codes(record)[0]).toContain("0x4");

        const code = (Query.root() as Program).code;
        expect(code).toContain("packed-switch");
        expect(code).toContain("setVisibility");
    });
});

// Kadabra-style multi-operator merging: two operators target the same
// findViewById + move-result-object pair, and their variants land in one site.
describe("Kadabra-style multi-operator merging", () => {
    it("groups proposals from multiple operators at the same anchor", () => {
        loadSmali("FindViewByIdMutation.smali");

        const engine = new MutationEngine();
        runMutators(
            [new FindViewByIdReturnsNullMutator(), new InvalidIDFindViewMutator()],
            engine,
        );

        expect(engine.records).toHaveLength(1);
        const [record] = engine.records;
        expect(operators(record)).toEqual(["FindViewByIdReturnsNullMutator", "InvalidIDFindViewMutator"]);
        expect(codes(record)[0]).toBe("const/4 v0, 0x0");
        expect(codes(record)[1]).toContain("const v0, 0x7fffffff");
    });
});
