import Query from "@specs-feup/lara/api/weaver/Query.js";
import { Program, MethodNode, BinaryOp } from "@specs-feup/alpakka/api/Joinpoints.js";

let t = Date.now();

const addInstructions = Query.search(MethodNode, (m) => m.name.includes("mutationOperatorAdd("))
  .search(BinaryOp, (i) => i.opCodeName.includes("add-int"))

console.log(`[query] ${Date.now() - t}ms`); t = Date.now();

for (const instruction of addInstructions) {
  instruction.setOperator("sub")
}

console.log(`[mutation loop] ${Date.now() - t}ms`); t = Date.now();

const program = Query.root() as Program;
program.buildApk("mutated-app.apk");

console.log(`[buildApk] ${Date.now() - t}ms`);
