import { defineMutator } from "../MutatorBase.js";
import { prevInstruction } from "../utils/SmaliUtils.js";
import { invokeVirtual, lines } from "../utils/SmaliBuilders.js";

const FIND_VIEW_BY_ID = "->findViewById(I)Landroid/view/View;";
const REQUEST_FOCUS = "Landroid/view/View;->requestFocus()Z";

export const InvalidViewFocusMutator = defineMutator({
    name: "InvalidViewFocusMutator",
    process: (instr) => {
        if (instr.opCodeName !== "move-result-object") return null;

        const prev = prevInstruction(instr);
        if (!prev || !prev.code.includes(FIND_VIEW_BY_ID)) return null;

        const viewReg = instr.code.split(/\s+/)[1];
        const originalCode = lines(prev.code, instr.code);

        return {
            originalCode,
            variants: [lines(originalCode, invokeVirtual([viewReg], REQUEST_FOCUS))],
            detach: [prev, instr],
        };
    },
});
