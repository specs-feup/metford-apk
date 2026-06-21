import { defineMutator } from "../MutatorBase.js";
import { parseRegisters, prevInstruction } from "../utils/SmaliUtils.js";
import { newInstance, constWide16, invokeDirect, pairWith, lines } from "../utils/SmaliBuilders.js";

const DATE_INIT_NO_ARGS = "Ljava/util/Date;-><init>()V";
const DATE_INIT_LONG = "Ljava/util/Date;-><init>(J)V";

export const InvalidDateMutator = defineMutator({
    name: "InvalidDateMutator",
    extraRegisters: 2,
    process: (instr, { tmpReg }) => {
        if (instr.opCodeName !== "invoke-direct") return null;
        if (!instr.code.includes(DATE_INIT_NO_ARGS)) return null;

        const regs = parseRegisters(instr.code);
        if (!regs) return null;
        const objReg = regs[0];

        const prev = prevInstruction(instr);
        if (!prev || prev.opCodeName !== "new-instance") return null;
        if (!prev.code.includes("Ljava/util/Date;")) return null;

        const variant = lines(
            newInstance(objReg, "Ljava/util/Date;"),
            constWide16(tmpReg, "0x2710"),
            invokeDirect([objReg, tmpReg, pairWith(tmpReg)], DATE_INIT_LONG),
        );

        return {
            originalCode: lines(prev.code, instr.code),
            variants: [variant],
            detach: [prev, instr],
        };
    },
});
