import { Instruction, Statement } from "@specs-feup/alpakka/api/Joinpoints.js";

export function parseRegisters(code: string): string[] | null {
    const match = code.match(/\{([^}]*)\}/);
    if (!match) return null;
    return match[1].split(",").map(r => r.trim()).filter(r => r.length > 0);
}

export function nextInstruction(instr: Instruction): Instruction | null {
    const next = instr.nextStatement as Statement;
    return next?.instanceOf("instruction") ? (next as Instruction) : null;
}

/** Walk forward past .line directives and labels until the next real instruction. */
export function nextInstructionSkipping(instr: Instruction): Instruction | null {
    let cur = instr.nextStatement as Statement | null;
    while (cur) {
        if (cur.instanceOf("instruction")) return cur as Instruction;
        cur = (cur as any).nextStatement as Statement | null;
    }
    return null;
}

export function prevInstruction(instr: Instruction): Instruction | null {
    const prev = instr.prevStatement as Statement;
    return prev?.instanceOf("instruction") ? (prev as Instruction) : null;
}

export function prevInstructionWhere(instr: Instruction, predicate: (i: Instruction) => boolean): Instruction | null {
    let cur = prevInstruction(instr);
    while (cur !== null) {
        if (predicate(cur)) return cur;
        cur = prevInstruction(cur);
    }
    return null;
}

/** First register written by a pure value-loading instruction (const or sget family), or null. */
function loaderDest(instr: Instruction): string | null {
    const op = instr.opCodeName;
    if (!op.startsWith("const") && !op.startsWith("sget")) return null;
    const m = instr.code.match(/v\d+/);
    return m ? m[0] : null;
}

/**
 * Capture the instructions that build `objReg` of type `typeDescriptor`:
 * the nearest `new-instance objReg`, the constructor `invokeDirect`, and only
 * the pure argument-loading instructions in between.
 *
 * Returns `[newInstance, ...argLoads, invokeDirect]`, or `null` if the range is
 * not self-contained — i.e. the backward walk hits anything other than an
 * arg-load (a method call, a store, a write to a register that is not a
 * constructor argument) before reaching the allocation. Bailing keeps the
 * mutated site minimal and prevents dropping registers that are live elsewhere.
 */
export function captureObjectConstruction(
    invokeDirect: Instruction,
    objReg: string,
    argRegs: string[],
    typeDescriptor: string,
): Instruction[] | null {
    const between: Instruction[] = [];
    let cur = prevInstruction(invokeDirect);
    while (cur !== null) {
        if (cur.opCodeName === "new-instance" &&
            cur.code.includes(typeDescriptor) &&
            cur.code.includes(objReg)) {
            return [cur, ...between, invokeDirect];
        }
        const dst = loaderDest(cur);
        if (dst !== null && argRegs.includes(dst)) {
            between.unshift(cur);
            cur = prevInstruction(cur);
            continue;
        }
        return null; // not a clean construction sequence — skip this site
    }
    return null;
}
