const MUTANT_ID = "Lpt/up/fe/specs/metford/MutationController;->MUTANT_ID:I";

export function buildSchemata(
  originalCode: string,
  mutantCodes: string[],
  tmpReg: string,
  baseId: number,
  siteTag: string
): string {
  const baseHex = `0x${baseId.toString(16)}`;
  const p = `pswitch_${siteTag}`;

  const lines: string[] = [
    `sget ${tmpReg}, ${MUTANT_ID}`,
    `packed-switch ${tmpReg}, :${p}_data`,
    `goto :${p}_default`,
  ];

  for (let i = 0; i < mutantCodes.length; i++) {
    lines.push(`:${p}_${i}`);
    lines.push(mutantCodes[i]);
    lines.push(`goto :${p}_end`);
  }

  lines.push(`:${p}_default`);
  lines.push(originalCode);
  lines.push(`goto :${p}_end`);
  lines.push(`:${p}_data`);
  lines.push(`.packed-switch ${baseHex}`);
  for (let i = 0; i < mutantCodes.length; i++) {
    lines.push(`    :${p}_${i}`);
  }
  lines.push(`.end packed-switch`);
  lines.push(`:${p}_end`);

  return lines.join("\n");
}
