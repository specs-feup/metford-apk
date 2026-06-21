import { defineMutator } from "../MutatorBase.js";
import { parseRegisters, nextInstruction } from "../utils/SmaliUtils.js";
import { constString, lines } from "../utils/SmaliBuilders.js";

const PUT_EXTRA = "Landroid/content/Intent;->putExtra(";
const INVALID_KEY = "__metford_invalid_key__";

export const NullPutExtraKeyMutator = defineMutator({
    name: "NullPutExtraKeyMutator",
    process: (instr) => {
        if (instr.opCodeName !== "invoke-virtual") return null;
        if (!instr.code.includes(PUT_EXTRA)) return null;

        const regs = parseRegisters(instr.code);
        if (!regs || regs.length < 2) return null;
        const keyReg = regs[1];

        const next = nextInstruction(instr);
        const hasResult = next?.opCodeName === "move-result-object";
        const tail = hasResult ? `\n${next!.code}` : "";

        return {
            originalCode: instr.code + tail,
            variants: [lines(constString(keyReg, INVALID_KEY), instr.code) + tail],
            detach: hasResult ? [instr, next!] : [instr],
        };
    },
});
