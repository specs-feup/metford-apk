import { defineMutator } from "../MutatorBase.js";

/**
 * Replaces conditional branch opcodes (e.g. `if-eq` → `if-ne`).
 * Config args: `from` (source opcode), `to` (list of replacement opcodes).
 *
 * Example config entry:
 *   { "name": "Conditional", "from": "if-eq", "to": ["if-ne"] }
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
