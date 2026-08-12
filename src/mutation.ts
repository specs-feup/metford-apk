import type { BinaryOp, MethodNode } from "@specs-feup/alpakka/api/Joinpoints.js";

type NamedMethod = Pick<MethodNode, "name">;
type BinaryInstruction = Pick<BinaryOp, "opCodeName">;
type MutableBinaryInstruction = Pick<BinaryOp, "setOperator">;

/** Returns whether a method is one of the sample application's add operators. */
export function isAddMutationOperator(method: NamedMethod): boolean {
  return method.name.includes("mutationOperatorAdd(");
}

/** Returns whether an instruction performs integer addition. */
export function isIntegerAdd(instruction: BinaryInstruction): boolean {
  return instruction.opCodeName.includes("add-int");
}

/** Replaces all supplied binary operations with subtraction. */
export function replaceWithSubtraction(
  instructions: Iterable<MutableBinaryInstruction>,
): number {
  let mutationCount = 0;

  for (const instruction of instructions) {
    instruction.setOperator("sub");
    mutationCount += 1;
  }

  return mutationCount;
}
