import { defineMutator } from "../MutatorBase.js";
import { parseRegisters, captureObjectConstruction } from "../utils/SmaliUtils.js";
import { nullify } from "../utils/SmaliBuilders.js";

const INTENT_INIT = "Landroid/content/Intent;-><init>";
const INTENT_TYPE = "Landroid/content/Intent;";

export const NullIntentMutator = defineMutator({
    name: "NullIntentMutator",
    process: (instr) => {
        if (instr.opCodeName !== "invoke-direct") return null;
        if (!instr.code.includes(INTENT_INIT)) return null;

        const regs = parseRegisters(instr.code);
        if (!regs) return null;
        const objReg = regs[0];

        const allInstrs = captureObjectConstruction(instr, objReg, regs.slice(1), INTENT_TYPE);
        if (!allInstrs) return null;

        return {
            originalCode: allInstrs.map(i => i.code).join("\n"),
            variants: [nullify(objReg)],
            detach: allInstrs,
        };
    },
});
