import { defineMutator } from "../MutatorBase.js";
import { const16, lines } from "../utils/SmaliBuilders.js";

// Matches iput / iput-boolean / iput-byte / iput-char / iput-short / iput-object
// and the sput equivalents. Skips *-wide (needs const-wide, different treatment).
const PUT_RE = /^[is]put(?:-boolean|-byte|-char|-short|-object)?$/;

// First register in the instruction (the value being stored).
const FIRST_REG_RE = /\s(v\d+|p\d+)\s*,/;

/**
 * Replaces the value stored into a field with a fixed constant.
 *
 * Targets iput / sput (and typed variants except -wide).
 * For numeric fields defaults to ["0x0", "0x1"]; for -object fields defaults to ["0x0"] (null).
 *
 * No extra registers are consumed — the value register is reused as the scratch.
 */
export const ConstantReplacementMutator = defineMutator({
    name: "ConstantReplacementMutator",
    process: (instr, { args }) => {
        if (!PUT_RE.test(instr.opCodeName)) return null;

        const match = instr.code.match(FIRST_REG_RE);
        if (!match) return null;
        const valReg = match[1];

        const isObject = instr.opCodeName.endsWith("-object");
        const to = (args.to as string[] | undefined)
            ?? (isObject ? ["0x0"] : ["0x0", "0x1"]);

        return {
            originalCode: instr.code,
            variants: to.map(v => lines(const16(valReg, v), instr.code)),
            detach: [instr],
        };
    },
});
