import { defineMutator } from "../MutatorBase.js";
import { const16 } from "../utils/SmaliBuilders.js";

const CONST_RE = /(v\d+|p\d+),\s+(-?(?:0x[\da-fA-F]+|\d+))/;

/**
 * Args:
 *   to — list of Smali literals to substitute (e.g. "0x0", "0x1", "0x7fffffff").
 *        Defaults to ["0x0", "0x1"] when omitted.
 *
 * Example operators entry: { "name": "Constant", "to": ["0x0", "0x1"] }
 * Or just: "Constant"  (uses defaults)
 */
export const ConstantReplacementMutator = defineMutator({
    name: "ConstantReplacementMutator",
    process: (instr, { args }) => {
        if (!instr.opCodeName.startsWith("const")) return null;

        const match = instr.code.match(CONST_RE);
        if (!match) return null;
        const [, destReg, literal] = match;

        const to = (args.to as string[] | undefined) ?? ["0x0", "0x1"];

        // Don't emit a variant identical to the original literal.
        const filtered = to.filter(v => Number(v) !== Number(literal));
        if (filtered.length === 0) return null;

        return {
            originalCode: instr.code,
            variants: filtered.map(v => const16(destReg, v)),
            detach: [instr],
        };
    },
});
