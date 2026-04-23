import { defineMutator } from "../MutatorBase.js";
import { nextInstruction } from "../utils/SmaliUtils.js";
import { nullify } from "../utils/SmaliBuilders.js";

const FIND_VIEW_BY_ID = "->findViewById(I)Landroid/view/View;";

export const FindViewByIdReturnsNullMutator = defineMutator({
    name: "FindViewByIdReturnsNullMutator",
    process: (instr) => {
        if (!instr.code.includes(FIND_VIEW_BY_ID)) return null;

        const next = nextInstruction(instr);
        if (!next || next.opCodeName !== "move-result-object") return null;

        const resultReg = next.code.split(/\s+/)[1];

        return {
            originalCode: `${instr.code}\n${next.code}`,
            variants: [nullify(resultReg)],
            detach: [instr, next],
        };
    },
});
