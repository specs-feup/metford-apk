import Query from "@specs-feup/lara/api/weaver/Query.js";
import { Instruction, MethodNode, BinaryOp } from "@specs-feup/alpakka/api/Joinpoints.js";

/**
 * One mutation proposal. The operator describes the change, but does NOT
 * modify the AST. The runner is responsible for grouping proposals by anchor,
 * building the schemata wrapper once per group, and detaching originals.
 */
export interface MutationProposal {
    /** Where the schemata gets inserted. Defaults to `detach[0]` if omitted. */
    anchor?: Instruction;
    /** Instructions to remove once the schemata is in place. */
    detach: Instruction[];
    /** Smali code of the original sequence (lives in the schemata's default case). */
    originalCode: string;
    /** Variant code snippets this operator contributes for this anchor. */
    variants: string[];
}

export interface MutatorContext {
    method: MethodNode;
    tmpReg: string;
}

export interface MutatorSpec<T = Instruction> {
    name: string;
    /** Extra locals the operator needs; defaults to 1, use 2 for wide-pair temps. */
    extraRegisters?: number;
    /** Walk `BinaryOp` instead of every `Instruction`. */
    nodeType?: "instruction" | "binaryOp";
    /** Skip methods that don't pass this predicate. */
    methodFilter?: (m: MethodNode) => boolean;
    /** Stop after the first successful proposal in a method. */
    oncePerMethod?: boolean;
    /** Return a proposal for this instruction, or null to skip. */
    process: (instr: T, ctx: MutatorContext) => MutationProposal | null;
}

export interface Mutator {
    readonly name: string;
    readonly extraRegisters: number;
    /** Scan a method and return zero or more proposals. Does NOT modify the AST. */
    propose(method: MethodNode, tmpReg: string): MutationProposal[];
}

/**
 * Build a `Mutator` class from a spec. The constructor accepts an optional
 * `MutationEngine` argument for backwards compatibility with old call sites —
 * the engine is unused; recording happens in the runner.
 */
export function defineMutator<T = Instruction>(spec: MutatorSpec<T>): new (engine?: unknown) => Mutator {
    return class implements Mutator {
        readonly name = spec.name;
        readonly extraRegisters = spec.extraRegisters ?? 1;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        constructor(_engine?: unknown) {}

        propose(method: MethodNode, tmpReg: string): MutationProposal[] {
            if (spec.methodFilter && !spec.methodFilter(method)) return [];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const NodeClass: any = spec.nodeType === "binaryOp" ? BinaryOp : Instruction;
            const instrs = [...Query.searchFrom(method, NodeClass)] as T[];

            const proposals: MutationProposal[] = [];
            for (const instr of instrs) {
                const p = spec.process(instr, { method, tmpReg });
                if (!p) continue;
                proposals.push({ ...p, anchor: p.anchor ?? p.detach[0] });
                if (spec.oncePerMethod) break;
            }
            return proposals;
        }
    };
}
