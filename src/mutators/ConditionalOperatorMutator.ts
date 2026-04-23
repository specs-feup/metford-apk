import { defineMutator } from "../MutatorBase.js";

const NEGATIONS: Record<string, string> = {
    "if-eq": "if-ne",
    "if-ne": "if-eq",
    "if-lt": "if-ge",
    "if-ge": "if-lt",
    "if-gt": "if-le",
    "if-le": "if-gt",
};

export const ConditionalOperatorMutator = defineMutator({
    name: "ConditionalOperatorMutator",
    process: (instr) => {
        const replacement = NEGATIONS[instr.opCodeName];
        if (!replacement) return null;

        const originalCode = instr.code;
        const variant = originalCode.replace(instr.opCodeName, replacement);

        return { originalCode, variants: [variant], detach: [instr] };
    },
});
