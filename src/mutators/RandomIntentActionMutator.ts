import { defineMutator } from "../MutatorBase.js";
import { parseRegisters, captureObjectConstruction } from "../utils/SmaliUtils.js";
import { newInstance, sgetObject, invokeDirect, lines } from "../utils/SmaliBuilders.js";

const INTENT_INIT = "Landroid/content/Intent;-><init>";
const INTENT_TYPE = "Landroid/content/Intent;";
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

        const allInstrs = captureObjectConstruction(instr, objReg, regs.slice(1), INTENT_TYPE);
        if (!allInstrs) return null;

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
