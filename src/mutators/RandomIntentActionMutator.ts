import { Instruction } from "@specs-feup/alpakka/api/Joinpoints.js";
import { defineMutator } from "../MutatorBase.js";
import { parseRegisters, prevInstruction, prevInstructionWhere } from "../utils/SmaliUtils.js";
import { newInstance, sgetObject, invokeDirect, lines } from "../utils/SmaliBuilders.js";

const INTENT_INIT = "Landroid/content/Intent;-><init>";
const ACTION_VIEW = "Landroid/content/Intent;->ACTION_VIEW:Ljava/lang/String;";
const ACTION_SEND = "Landroid/content/Intent;->ACTION_SEND:Ljava/lang/String;";
const INTENT_INIT_STRING = "Landroid/content/Intent;-><init>(Ljava/lang/String;)V";

export const RandomIntentActionMutator = defineMutator({
    name: "RandomIntentActionMutator",
    process: (instr, { tmpReg }) => {
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

        const buildAction = (action: string) => lines(
            newInstance(objReg, "Landroid/content/Intent;"),
            sgetObject(tmpReg, action),
            invokeDirect([objReg, tmpReg], INTENT_INIT_STRING),
        );

        return {
            originalCode: allInstrs.map(i => i.code).join("\n"),
            variants: [buildAction(ACTION_VIEW), buildAction(ACTION_SEND)],
            detach: allInstrs,
        };
    },
});
