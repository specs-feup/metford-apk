import Query from "@specs-feup/lara/api/weaver/Query.js";
import { Program, MethodNode, Label, Statement } from "@specs-feup/alpakka/api/Joinpoints.js";
import AlpakkaFactory from "@specs-feup/alpakka/api/alpakka/AlpakkaFactory.js";

let t = Date.now();

for (const method of Query.search(MethodNode, (m) => m.name.includes("mutationOperatorAdd"))) {
  const regsDirective = method.registersDirective;
  if (!regsDirective || regsDirective.type !== "I_LOCALS") continue;
  const newLocals = regsDirective.value + 1;
  const mutantReg = `v${newLocals - 1}`;
  regsDirective.setValue(newLocals);

  const firstStmt = method.children[0] as Statement;

  firstStmt.insertBefore(`sget ${mutantReg}, Lpt/up/fe/specs/metford/MutationController;->MUTANT_ID:I`);

  const stmts = AlpakkaFactory.packedSwitch(mutantReg, 3);
  stmts.forEach((stmt: Statement) => firstStmt.insertBefore(stmt));

  const [case0, case1, caseDefault] = stmts.slice(1, 4) as Label[];

  case0.insertAfter("const/4 v1, 0x0\ngoto :switch_end");
  case1.insertAfter("const/4 v1, 0x1\ngoto :switch_end");
  caseDefault.insertAfter("const/4 v1, -0x1");

  (stmts.at(-1) as Statement).insertAfter(":switch_end");
}

console.log(`[switch mutation] ${Date.now() - t}ms`); t = Date.now();
console.log("Dumping mutated code:");

for (const method of Query.search(MethodNode, (m) => m.name.includes("mutationOperatorAdd"))) {
  console.log(method.code);
}

const program = Query.root() as Program;
program.buildApk("mutated-app.apk");

console.log(`[buildApk] ${Date.now() - t}ms`);
