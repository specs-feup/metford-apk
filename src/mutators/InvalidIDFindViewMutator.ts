import { defineMutator } from "../MutatorBase.js";
import { parseRegisters, nextInstruction } from "../utils/SmaliUtils.js";
import { constInt, lines } from "../utils/SmaliBuilders.js";

const FIND_VIEW_BY_ID = "->findViewById(I)Landroid/view/View;";
const INVALID_ID = "0x7fffffff";

export const InvalidIDFindViewMutator = defineMutator({
    name: "InvalidIDFindViewMutator",
    process: (instr) => {
        if (!instr.code.includes(FIND_VIEW_BY_ID)) return null;

        const regs = parseRegisters(instr.code);
        if (!regs || regs.length < 2) return null;
        const idReg = regs[1];

        const next = nextInstruction(instr);
        const hasResult = next?.opCodeName === "move-result-object";
        const tail = hasResult ? `\n${next!.code}` : "";

        return {
            originalCode: instr.code + tail,
            variants: [lines(constInt(idReg, INVALID_ID), instr.code) + tail],
            detach: hasResult ? [instr, next!] : [instr],
        };
    },
});
