import { BinaryOp } from "@specs-feup/alpakka/api/Joinpoints.js";
import { defineMutator } from "../MutatorBase.js";

/**
 * Args (one config entry per source operator):
 *   from — source operator base ("add", "sub", "mul", "div", "rem")
 *   to   — list of target operator bases; each produces one variant
 *
 * Example operators entry: { "name": "Arithmetic", "from": "add", "to": ["sub", "mul"] }
 */
export const ArithmeticOperatorMutator = defineMutator<BinaryOp>({
    name: "ArithmeticOperatorMutator",
    nodeType: "binaryOp",
    process: (op, { args }) => {
        const from = args.from as string | undefined;
        const to = args.to as string[] | undefined;
        if (!from || !to || to.length === 0) return null;
        if (op.operator !== from) return null;

        const originalOp = op.operator;
        const originalCode = op.code;
        const variants = to.map(newOp => {
            op.setOperator(newOp);
            return op.code;
        });
        op.setOperator(originalOp);   // restore so other proposers see the AST un-mutated

        return { originalCode, variants, detach: [op] };
    },
});
