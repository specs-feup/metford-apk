import { defineMutator } from "../MutatorBase.js";

/**
 * Args (one config entry per source opcode):
 *   from — source conditional opcode ("if-eq", "if-ne", "if-lt", "if-ge", "if-gt", "if-le")
 *   to   — list of target opcodes; each produces one variant
 *
 * Example operators entry: { "name": "Conditional", "from": "if-eq", "to": ["if-ne"] }
 */
export const ConditionalOperatorMutator = defineMutator({
    name: "ConditionalOperatorMutator",
    process: (instr, { args }) => {
        const from = args.from as string | undefined;
        const to = args.to as string[] | undefined;
        if (!from || !to || to.length === 0) return null;
        if (instr.opCodeName !== from) return null;

        const originalCode = instr.code;
        const variants = to.map(replacement => originalCode.replace(from, replacement));

        return { originalCode, variants, detach: [instr] };
    },
});
