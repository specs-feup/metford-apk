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
