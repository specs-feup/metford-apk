import { BinaryOp } from "@specs-feup/alpakka/api/Joinpoints.js";
import { defineMutator } from "../MutatorBase.js";

const REPLACEMENTS: Record<string, string[]> = {
    add: ["sub", "mul"],
    sub: ["add", "mul"],
    mul: ["add", "sub"],
    div: ["mul", "rem"],
    rem: ["div", "mul"],
};

export const ArithmeticOperatorMutator = defineMutator<BinaryOp>({
    name: "ArithmeticOperatorMutator",
    nodeType: "binaryOp",
    process: (op) => {
        const replacements = REPLACEMENTS[op.operator];
        if (!replacements) return null;

        const originalCode = op.code;
        const variants = replacements.map(newOp => {
            op.setOperator(newOp);
            return op.code;
        });

        return { originalCode, variants, detach: [op] };
    },
});
