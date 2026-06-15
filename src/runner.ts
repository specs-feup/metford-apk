import fs from "fs";
import Query from "@specs-feup/lara/api/weaver/Query.js";
import { Program, MethodNode, Instruction } from "@specs-feup/alpakka/api/Joinpoints.js";
import { MutationEngine, VariantRecord } from "./MutationEngine.js";
import { Mutator, MutationProposal } from "./MutatorBase.js";
import { buildSchemata } from "./SchemaBuilder.js";
import { REGISTRY } from "./registry.js";

/** One entry per operator instance. Bare string = no args; object = name + args. */
export type OperatorEntry = string | { name: string; [key: string]: unknown };

export interface RunOptions {
    operators: OperatorEntry[];
    projectName?: string;
    outputApk?: string;
    reportPath?: string;
    verbose?: boolean;
    excludeClasses?: string[];
}

/**
 * Per-method orchestration: collect proposals from every operator without
 * touching the AST, group them by anchor (so two operators targeting the same
 * instructions share a single schemata site), then build the schemata and
 * detach originals once per group.
 */
export function applyToMethod(method: MethodNode, mutators: Mutator[], engine: MutationEngine): void {
    const regsDir = method.registersDirective;
    if (!regsDir || regsDir.type !== "I_LOCALS") return;
    const locals = regsDir.value;
    const tmpReg = `v${locals}`;

    // How many extra local registers we can safely add before parameter registers
    // exceed v15 (format35c limit). Adding a local shifts all param registers up by 1.
    // Wide types (J=long, D=double) occupy 2 register slots each.
    const paramSlots = ((method.prototype as any)?.parameters ?? [])
        .reduce((sum: number, p: any) => sum + (/^[JD]$/.test(p.getCode?.() ?? p.code ?? "") ? 2 : 1), 0);
    const numParams = (method.isStatic ? 0 : 1) + paramSlots;
    const safeExtraSlots = Math.max(0, 15 - locals - numParams + 1);

    // Phase 1: collect every operator's proposals against the un-modified AST.
    const items: { proposal: MutationProposal; operator: string; extraRegisters: number }[] = [];
    for (const m of mutators) {
        if (m.extraRegisters > safeExtraSlots) continue;
        for (const p of m.propose(method, tmpReg)) {
            items.push({ proposal: p, operator: m.name, extraRegisters: m.extraRegisters });
        }
    }
    if (items.length === 0) return;

    // Phase 2: group by anchor. Operators that propose the same anchor share
    // a schemata site; their variants get merged in one packed-switch.
    // We key by a string fingerprint of the anchor + detach sequence because
    // joinpoint wrappers don't share JS identity across `Query.searchFrom`
    // calls — within a single method the (anchor.code + detached codes)
    // tuple is unique per site.
    const fingerprint = (p: MutationProposal) =>
        p.anchor!.code + "\0" + p.detach.map(d => d.code).join("\0");
    const groups = new Map<string, typeof items>();
    const anchorByKey = new Map<string, Instruction>();
    for (const item of items) {
        const key = fingerprint(item.proposal);
        let bucket = groups.get(key);
        if (!bucket) {
            groups.set(key, (bucket = []));
            anchorByKey.set(key, item.proposal.anchor!);
        }
        bucket.push(item);
    }

    // Phase 3: for each group, build one schemata + detach the originals once.
    let maxExtra = 0;
    for (const [key, group] of groups) {
        const anchor = anchorByKey.get(key)!;
        const originalCode = group[0].proposal.originalCode;
        const detachSet = group[0].proposal.detach;

        const variants: VariantRecord[] = [];
        for (const item of group) {
            for (const code of item.proposal.variants) {
                variants.push({ code, operator: item.operator });
            }
            maxExtra = Math.max(maxExtra, item.extraRegisters);
        }

        const { baseId, siteTag } = engine.allocate(variants.length);
        const lineNumber = (anchor.line as any)?.value ?? null;
        anchor.insertBefore(buildSchemata(originalCode, variants.map(v => v.code), tmpReg, baseId, siteTag));
        for (const node of detachSet) node.detach();

        engine.record(siteTag, method.name, lineNumber, originalCode, variants);
    }

    if (maxExtra > 0) regsDir.setValue(locals + maxExtra);
}

export function runMutators(opts: RunOptions): void {
    const outputApk = opts.outputApk ?? "mutated-app.apk";
    const reportPath = opts.reportPath ?? "mutation-report.json";
    const verbose = opts.verbose ?? true;

    const engine = new MutationEngine();
    const mutators = opts.operators.map(entry => {
        const name = typeof entry === "string" ? entry : entry.name;
        const Ctor = REGISTRY[name];
        if (!Ctor) throw new Error(`Unknown operator: "${name}". Known: ${Object.keys(REGISTRY).join(", ")}`);
        if (typeof entry === "string") return new Ctor();
        const { name: _, ...args } = entry;
        return new Ctor(args);
    });

    const excludeClasses = opts.excludeClasses ?? [];

    const methods = (Query.search(MethodNode) as any).get() as MethodNode[];
    const total = methods.length;
    let t = Date.now();
    for (let i = 0; i < methods.length; i++) {
        const method = methods[i];
        if (excludeClasses.some(ex => method.name.includes(ex))) continue;
        applyToMethod(method, mutators, engine);

        const sites = engine.records.length;
        const pct = Math.round((i + 1) / total * 100);
        const bar = "=".repeat(Math.floor(pct / 5)) + " ".repeat(20 - Math.floor(pct / 5));
        process.stderr.write(`\r  [${bar}] ${pct}%  ${i + 1}/${total} methods  ${sites} sites`);
    }
    process.stderr.write("\n");

    const totalMutants = engine.records.reduce((s, r) => s + r.variants.length, 0);
    console.log(`[schemata] mutations applied in ${Date.now() - t}ms`);
    console.log(`[schemata] ${engine.records.length} sites, ${totalMutants} total mutants`);

    fs.writeFileSync(reportPath, JSON.stringify({
        projectName: opts.projectName ?? null,
        totalMutants,
        sites: engine.records.map(r => ({
            siteTag: r.siteTag,
            method: r.method,
            line: r.line,
            original: r.original,
            variants: r.variants,
        })),
    }, null, 2));
    console.log(`[schemata] ${reportPath} written`);

    const MUTATION_CONTROLLER_SMALI = [
        ".class public Lpt/up/fe/specs/metford/MutationController;",
        ".super Ljava/lang/Object;",
        "",
        ".field public static MUTANT_ID:I",
    ].join("\n");
    const mcDir = "output/smali/pt/up/fe/specs/metford";
    fs.mkdirSync(mcDir, { recursive: true });
    fs.writeFileSync(`${mcDir}/MutationController.smali`, MUTATION_CONTROLLER_SMALI);

    t = Date.now();
    const program = Query.root() as Program;
    program.buildApk(outputApk);
    console.log(`[schemata] ${outputApk} built in ${Date.now() - t}ms`);
}
