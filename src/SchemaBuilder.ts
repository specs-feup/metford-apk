const MUTANT_ID = "Lpt/up/fe/specs/metford/MutationController;->MUTANT_ID:I";

export function buildSchemata(
  originalCode: string,
  mutantCodes: string[],
  tmpReg: string,
  baseId: number,
  siteTag: string
): string {
  const negBase = -baseId;
  const negBaseHex = negBase < 0 ? `-0x${(-negBase).toString(16)}` : `0x0`;
  const p = `pswitch_${siteTag}`;

  const lines: string[] = [
    `sget ${tmpReg}, ${MUTANT_ID}`,
    `add-int/lit16 ${tmpReg}, ${tmpReg}, ${negBaseHex}`,
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
  lines.push(`:${p}_data`);
  lines.push(`.packed-switch 0x0`);
  for (let i = 0; i < mutantCodes.length; i++) {
    lines.push(`    :${p}_${i}`);
  }
  lines.push(`.end packed-switch`);
  lines.push(`:${p}_end`);

  return lines.join("\n");
}
