import { defineMutator } from "../MutatorBase.js";
import { parseRegisters } from "../utils/SmaliUtils.js";
import { nullify, lines } from "../utils/SmaliBuilders.js";

const SET_ON_CLICK_LISTENER = "->setOnClickListener(Landroid/view/View$OnClickListener;)V";

export const BuggyGUIListenerMutator = defineMutator({
    name: "BuggyGUIListenerMutator",
    process: (instr) => {
        if (instr.opCodeName !== "invoke-virtual") return null;
        if (!instr.code.includes(SET_ON_CLICK_LISTENER)) return null;

        const regs = parseRegisters(instr.code);
        if (!regs || regs.length < 2) return null;
        const listenerReg = regs[1];

        return {
            originalCode: instr.code,
            variants: [lines(nullify(listenerReg), instr.code)],
            detach: [instr],
        };
    },
});
