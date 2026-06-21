import Query from "@specs-feup/lara/api/weaver/Query.js";
import { ClassNode, Instruction } from "@specs-feup/alpakka/api/Joinpoints.js";
import { defineMutator } from "../MutatorBase.js";
import { parseRegisters, prevInstruction } from "../utils/SmaliUtils.js";
import { lines } from "../utils/SmaliBuilders.js";

const INTENT_INIT = "Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V";
const CONST_CLASS_RE = /^const-class (v\d+|p\d+), (L[^;]+;)$/;

// Lazily built once per run: package → [class descriptor, ...]
let classCache: Map<string, string[]> | null = null;

function packageOf(descriptor: string): string {
    const inner = descriptor.slice(1, -1); // strip L and ;
    const lastSlash = inner.lastIndexOf("/");
    return lastSlash >= 0 ? inner.substring(0, lastSlash) : "";
}

function ensureCache(): Map<string, string[]> {
    if (classCache) return classCache;
    classCache = new Map();
    for (const cls of Query.search(ClassNode)) {
        const ct = cls.classDescriptor;
        const pkg = ct.packageName.replace(/\./g, "/");
        const desc = `L${pkg}/${ct.className};`;
        let list = classCache.get(pkg);
        if (!list) classCache.set(pkg, (list = []));
        list.push(desc);
    }
    return classCache;
}

/**
 * Replaces the target class in `new Intent(context, SomeActivity.class)`
 * with every other class found in the same package — one variant per alternative.
 *
 * Equivalent to Kadabra's IntentTargetReplacementOperatorMutator (which picks
 * one random alternative; we embed all alternatives in the schemata instead).
 */
export const IntentTargetReplacementMutator = defineMutator({
    name: "IntentTargetReplacementMutator",
    extraRegisters: 0,
    process: (instr) => {
        if (!instr.code.includes(INTENT_INIT)) return null;

        const regs = parseRegisters(instr.code);
        if (!regs || regs.length < 3) return null;
        const classReg = regs[2]; // regs[0]=Intent, regs[1]=Context, regs[2]=Class

        let cur: Instruction | null = prevInstruction(instr);
        let constClassInstr: Instruction | null = null;
        let originalClass: string | null = null;
        while (cur) {
            const m = cur.code.trim().match(CONST_CLASS_RE);
            if (m && m[1] === classReg) {
                constClassInstr = cur;
                originalClass = m[2];
                break;
            }
            cur = prevInstruction(cur);
        }
        if (!constClassInstr || !originalClass) return null;

        const pkg = packageOf(originalClass);
        const alternatives = (ensureCache().get(pkg) ?? []).filter(c => c !== originalClass);
        if (alternatives.length === 0) return null;

        // Kadabra picks one random alternative; we take the first to stay deterministic.
        const alt = alternatives[0];
        return {
            anchor: constClassInstr,
            originalCode: lines(constClassInstr.code, instr.code),
            variants: [lines(`const-class ${classReg}, ${alt}`, instr.code)],
            detach: [constClassInstr, instr],
        };
    },
});
