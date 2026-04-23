import { defineMutator } from "../MutatorBase.js";
import { const16 } from "../utils/SmaliBuilders.js";

const CONST_RE = /(v\d+|p\d+),\s+(-?(?:0x[\da-fA-F]+|\d+))/;

export const ConstantReplacementMutator = defineMutator({
    name: "ConstantReplacementMutator",
    process: (instr) => {
        if (!instr.opCodeName.startsWith("const")) return null;

        const match = instr.code.match(CONST_RE);
        if (!match) return null;
        const [, destReg, literal] = match;
        if (Number(literal) === 0) return null;

        return {
            originalCode: instr.code,
            variants: [const16(destReg, "0x0"), const16(destReg, "0x1")],
            detach: [instr],
        };
    },
});
