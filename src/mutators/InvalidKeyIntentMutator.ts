import { defineMutator } from "../MutatorBase.js";
import { parseRegisters } from "../utils/SmaliUtils.js";
import { nullify, lines } from "../utils/SmaliBuilders.js";

const INTENT_INIT = "Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V";

/**
 * Replaces the Context argument of `new Intent(context, SomeClass.class)`
 * with null — equivalent to Kadabra's InvalidKeyIntentOperatorMutator.
 *
 * invoke-direct {v_intent, v_ctx, v_class}, Intent-><init>(Context;Class;)V
 *   → const/16 v_ctx, 0x0
 *     invoke-direct {v_intent, v_ctx, v_class}, ...
 */
export const InvalidKeyIntentMutator = defineMutator({
    name: "InvalidKeyIntentMutator",
    extraRegisters: 0,
    process: (instr) => {
        if (!instr.code.includes(INTENT_INIT)) return null;

        const regs = parseRegisters(instr.code);
        if (!regs || regs.length < 2) return null;
        // regs[0] = Intent (this), regs[1] = Context to nullify
        const contextReg = regs[1];

        return {
            originalCode: instr.code,
            variants: [lines(nullify(contextReg), instr.code)],
            detach: [instr],
        };
    },
});
