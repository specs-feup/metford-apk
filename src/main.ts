import Query from "@specs-feup/lara/api/weaver/Query.js";
import { Program, MethodNode, BinaryOp } from "@specs-feup/alpakka/api/Joinpoints.js";
import {
  isAddMutationOperator,
  isIntegerAdd,
  replaceWithSubtraction,
} from "./mutation.js";

const addInstructions = Query.search(MethodNode, isAddMutationOperator).search(
  BinaryOp,
  isIntegerAdd,
);

for (const instruction of addInstructions) {
  console.log(instruction.code);
  replaceWithSubtraction([instruction]);
  console.log(instruction.code);
}

const program = Query.root() as Program;
program.buildApk("mutated-app.apk");
