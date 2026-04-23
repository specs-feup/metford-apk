import { defineMutator } from "../MutatorBase.js";
import { sleep, lines } from "../utils/SmaliBuilders.js";

export const LengthyGUIListenerMutator = defineMutator({
    name: "LengthyGUIListenerMutator",
    extraRegisters: 2,
    methodFilter: m => m.name.includes("onClick(Landroid/view/View;)V"),
    oncePerMethod: true,
    process: (instr, { tmpReg }) => {
        if (instr.opCodeName !== "return-void") return null;

        return {
            originalCode: instr.code,
            variants: [lines(sleep(tmpReg, 10000), instr.code)],
            detach: [instr],
        };
    },
});
