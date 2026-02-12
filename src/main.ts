import Query from "@specs-feup/lara/api/weaver/Query.js";
import { Program, MethodNode, BinaryOp } from "@specs-feup/alpakka/api/Joinpoints.js";

const addInstructions = Query.search(MethodNode, (m) => m.name.includes("mutationOperatorAdd("))
  .search(BinaryOp, (i) => i.opCodeName.includes("add-int"))

for (const instruction of addInstructions) {
  console.log(instruction.code)
  instruction.setOperator("sub")
  console.log(instruction.code)
}

const program = Query.root() as Program;
program.buildApk("mutated-app.apk");
