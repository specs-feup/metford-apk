import { defineMutator } from "../MutatorBase.js";
import { prevInstruction } from "../utils/SmaliUtils.js";
import { const16, invokeVirtual, lines } from "../utils/SmaliBuilders.js";

const FIND_VIEW_BY_ID = "->findViewById(I)Landroid/view/View;";
const SET_VISIBILITY = "Landroid/view/View;->setVisibility(I)V";
const INVISIBLE = "0x4";

export const ViewComponentNotVisibleMutator = defineMutator({
    name: "ViewComponentNotVisibleMutator",
    process: (instr, { tmpReg }) => {
        if (instr.opCodeName !== "move-result-object") return null;

        const prev = prevInstruction(instr);
        if (!prev || !prev.code.includes(FIND_VIEW_BY_ID)) return null;

        const viewReg = instr.code.match(/move-result-object\s+([vp]\d+)/)?.[1];
        if (!viewReg) return null;
        const originalCode = lines(prev.code, instr.code);

        return {
            originalCode,
            variants: [lines(
                prev.code,
                instr.code,
                const16(tmpReg, INVISIBLE),
                invokeVirtual([viewReg, tmpReg], SET_VISIBILITY),
            )],
            detach: [prev, instr],
        };
    },
});
