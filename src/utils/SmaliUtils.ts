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
