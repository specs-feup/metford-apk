import { Instruction } from "@specs-feup/alpakka/api/Joinpoints.js";
import { defineMutator } from "../MutatorBase.js";
import { parseRegisters, prevInstruction, prevInstructionWhere } from "../utils/SmaliUtils.js";
import { nullify } from "../utils/SmaliBuilders.js";

const INTENT_INIT = "Landroid/content/Intent;-><init>";

export const NullIntentMutator = defineMutator({
    name: "NullIntentMutator",
    process: (instr) => {
        if (instr.opCodeName !== "invoke-direct") return null;
        if (!instr.code.includes(INTENT_INIT)) return null;

        const regs = parseRegisters(instr.code);
        if (!regs) return null;
        const objReg = regs[0];

        const newInst = prevInstructionWhere(instr, i =>
            i.opCodeName === "new-instance" &&
            i.code.includes("Landroid/content/Intent;") &&
            i.code.includes(objReg)
        );
        if (!newInst) return null;

        const between: Instruction[] = [];
        let cur = prevInstruction(instr);
        while (cur && cur !== newInst) {
            between.unshift(cur);
            cur = prevInstruction(cur);
        }
        const allInstrs = [newInst, ...between, instr];

        return {
            originalCode: allInstrs.map(i => i.code).join("\n"),
            variants: [nullify(objReg)],
            detach: allInstrs,
        };
    },
});
