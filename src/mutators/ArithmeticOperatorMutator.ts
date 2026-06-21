import { BinaryOp } from "@specs-feup/alpakka/api/Joinpoints.js";
import { defineMutator } from "../MutatorBase.js";

/**
 * Replaces arithmetic binary ops (`add`, `sub`, `mul`, `div`) with a configured
 * alternative. Config args: `from` (source opcode base), `to` (list of targets).
 * For lit8/lit16 forms where the target opcode doesn't exist in Dalvik (e.g.
 * `sub-int/lit8`), the literal operand is negated to simulate subtraction.
 *
 * Example config entry:
 *   { "name": "Arithmetic", "from": "add", "to": ["sub"] }
 */
export const ArithmeticOperatorMutator = defineMutator<BinaryOp>({
    name: "ArithmeticOperatorMutator",
    nodeType: "binaryOp",
    process: (op, { args }) => {
        const from = args.from as string | undefined;
        const to = args.to as string[] | undefined;
        if (!from || !to || to.length === 0) return null;

        let currentOperator: string;
        try {
            currentOperator = op.operator;
        } catch (_e) {
            return null;
        }
        if (currentOperator !== from) return null;

        const originalOp = op.operator;
        const originalCode = op.code;
        const opCode = op.opCodeName;
        const variants: string[] = [];

        for (const newOp of to) {
            try {
                op.setOperator(newOp);
                variants.push(op.code);
            } catch (_e) {
                // Opcode doesn't exist in Dalvik ISA (e.g. sub-int/lit8).
                // For add→sub with a literal operand, negate the literal instead.
                if (newOp === "sub" && (opCode.includes("/lit8") || opCode.includes("/lit16"))) {
                    const negated = negateLastLiteral(originalCode, opCode.includes("/lit8"));
                    if (negated !== null) variants.push(negated);
                }
            }
            op.setOperator(originalOp);
        }

        if (variants.length === 0) return null;
        return { originalCode, variants, detach: [op] };
    },
});

/** Negates the literal operand of a lit8/lit16 instruction to simulate subtraction. */
function negateLastLiteral(code: string, isLit8: boolean): string | null {
    const lastComma = code.lastIndexOf(",");
    if (lastComma < 0) return null;

    const prefix = code.substring(0, lastComma + 1);
    const litStr = code.substring(lastComma + 1).trim();
    const value = Number(litStr); // handles "0x5", "-0x3", "5", "-3"
    if (isNaN(value) || value === 0) return null; // negating 0 → same result

    const negated = -value;
    const [min, max] = isLit8 ? [-128, 127] : [-32768, 32767];
    if (negated < min || negated > max) return null;

    const negStr = negated < 0
        ? `-0x${Math.abs(negated).toString(16)}`
        : `0x${negated.toString(16)}`;
    return `${prefix} ${negStr}`;
}
