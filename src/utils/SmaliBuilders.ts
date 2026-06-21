// Smali instruction builders used by mutators to construct replacement code snippets.

export const nullify = (reg: string) => `const/16 ${reg}, 0x0`;
export const const16 = (reg: string, value: string) => `const/16 ${reg}, ${value}`;
export const constInt = (reg: string, value: string) => `const ${reg}, ${value}`;
export const constString = (reg: string, value: string) => `const-string ${reg}, "${value}"`;
export const constWide16 = (reg: string, value: string) => `const-wide/16 ${reg}, ${value}`;

export const newInstance = (reg: string, type: string) => `new-instance ${reg}, ${type}`;
export const sgetObject = (reg: string, field: string) => `sget-object ${reg}, ${field}`;

export const invokeVirtual = (regs: string[], method: string) =>
    `invoke-virtual {${regs.join(", ")}}, ${method}`;
export const invokeDirect = (regs: string[], method: string) =>
    `invoke-direct {${regs.join(", ")}}, ${method}`;
export const invokeStatic = (regs: string[], method: string) =>
    `invoke-static {${regs.join(", ")}}, ${method}`;

/** Returns the high half of a wide register pair (`v3` → `v4`). */
export const pairWith = (reg: string): string => `v${parseInt(reg.slice(1)) + 1}`;

/** `Thread.sleep(ms)` — the wide arg occupies the pair starting at `tmpReg`. */
export const sleep = (tmpReg: string, ms: number): string => [
    constWide16(tmpReg, `0x${ms.toString(16)}`),
    invokeStatic([tmpReg, pairWith(tmpReg)], "Ljava/lang/Thread;->sleep(J)V"),
].join("\n");

/** Concatenates lines into a single Smali snippet. */
export const lines = (...ls: string[]) => ls.join("\n");
