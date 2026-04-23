import { defineMutator } from "../MutatorBase.js";
import { sleep, lines } from "../utils/SmaliBuilders.js";

const ACTIVITY_ON_CREATE = "->onCreate(Landroid/os/Bundle;)V";

export const LengthyGUICreationMutator = defineMutator({
    name: "LengthyGUICreationMutator",
    extraRegisters: 2,
    methodFilter: m => m.name.includes("onCreate("),
    oncePerMethod: true,
    process: (instr, { tmpReg }) => {
        if (instr.opCodeName !== "invoke-super") return null;
        if (!instr.code.includes(ACTIVITY_ON_CREATE)) return null;

        return {
            originalCode: instr.code,
            variants: [lines(instr.code, sleep(tmpReg, 10000))],
            detach: [instr],
        };
    },
});
