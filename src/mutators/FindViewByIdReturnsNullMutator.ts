import { Instruction } from "@specs-feup/alpakka/api/Joinpoints.js";
import { defineMutator } from "../MutatorBase.js";
import { nextInstruction, parseRegisters } from "../utils/SmaliUtils.js";
import { nullify } from "../utils/SmaliBuilders.js";

const FIND_VIEW_BY_ID = "->findViewById(I)Landroid/view/View;";

// Returns true when the result register is immediately used as receiver of another
// method call (possibly after a check-cast). Kadabra excludes these chained cases
// via ancestorImpl("call") != null — they always NPE at the chain point rather than
// simulating a missing view.
function isResultChained(moveResult: Instruction, reg: string): boolean {
    let cur = nextInstruction(moveResult);
    if (cur?.opCodeName === "check-cast") {
        const castReg = cur.code.trim().split(/\s+/)[1]?.replace(",", "");
        if (castReg === reg) cur = nextInstruction(cur);
    }
    if (!cur?.opCodeName?.startsWith("invoke-")) return false;
    const regs = parseRegisters(cur.code);
    return !!regs && regs[0] === reg;
}

export const FindViewByIdReturnsNullMutator = defineMutator({
    name: "FindViewByIdReturnsNullMutator",
    process: (instr) => {
        if (!instr.code.includes(FIND_VIEW_BY_ID)) return null;

        const next = nextInstruction(instr);
        if (!next || next.opCodeName !== "move-result-object") return null;

        const resultReg = next.code.match(/move-result-object\s+([vp]\d+)/)?.[1];
        if (!resultReg) return null;

        if (isResultChained(next, resultReg)) return null;

        return {
            originalCode: `${instr.code}\n${next.code}`,
            variants: [nullify(resultReg)],
            detach: [instr, next],
        };
    },
});
