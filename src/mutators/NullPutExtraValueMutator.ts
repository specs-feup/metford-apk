import { defineMutator } from "../MutatorBase.js";
import { parseRegisters, nextInstruction } from "../utils/SmaliUtils.js";
import { nullify, lines } from "../utils/SmaliBuilders.js";

const PUT_EXTRA = "Landroid/content/Intent;->putExtra(";

export const NullPutExtraValueMutator = defineMutator({
    name: "NullPutExtraValueMutator",
    process: (instr) => {
        if (instr.opCodeName !== "invoke-virtual") return null;
        if (!instr.code.includes(PUT_EXTRA)) return null;

        const regs = parseRegisters(instr.code);
        if (!regs || regs.length < 3) return null;
        const valueReg = regs[2];

        const next = nextInstruction(instr);
        const hasResult = next?.opCodeName === "move-result-object";
        const tail = hasResult ? `\n${next!.code}` : "";

        return {
            originalCode: instr.code + tail,
            variants: [lines(nullify(valueReg), instr.code) + tail],
            detach: hasResult ? [instr, next!] : [instr],
        };
    },
});
