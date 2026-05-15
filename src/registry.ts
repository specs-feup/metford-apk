import { Mutator } from "./MutatorBase.js";
import { ArithmeticOperatorMutator } from "./mutators/ArithmeticOperatorMutator.js";
import { ConditionalOperatorMutator } from "./mutators/ConditionalOperatorMutator.js";
import { ConstantReplacementMutator } from "./mutators/ConstantReplacementMutator.js";
import { InvalidDateMutator } from "./mutators/InvalidDateMutator.js";
import { NullIntentMutator } from "./mutators/NullIntentMutator.js";
import { RandomIntentActionMutator } from "./mutators/RandomIntentActionMutator.js";
import { NullPutExtraValueMutator } from "./mutators/NullPutExtraValueMutator.js";
import { NullPutExtraKeyMutator } from "./mutators/NullPutExtraKeyMutator.js";
import { BuggyGUIListenerMutator } from "./mutators/BuggyGUIListenerMutator.js";
import { LengthyGUIListenerMutator } from "./mutators/LengthyGUIListenerMutator.js";
import { LengthyGUICreationMutator } from "./mutators/LengthyGUICreationMutator.js";
import { FindViewByIdReturnsNullMutator } from "./mutators/FindViewByIdReturnsNullMutator.js";
import { InvalidIDFindViewMutator } from "./mutators/InvalidIDFindViewMutator.js";
import { InvalidViewFocusMutator } from "./mutators/InvalidViewFocusMutator.js";
import { ViewComponentNotVisibleMutator } from "./mutators/ViewComponentNotVisibleMutator.js";

type MutatorCtor = new (args?: Record<string, unknown>) => Mutator;

/**
 * Maps the config-level operator name to its mutator class. One entry per
 * conceptual operator (Kadabra-style); when two of them target the same
 * instruction at runtime, the schemata runner merges their variants into one
 * site automatically.
 */
export const REGISTRY: Record<string, MutatorCtor> = {
    Arithmetic: ArithmeticOperatorMutator,
    Conditional: ConditionalOperatorMutator,
    Constant: ConstantReplacementMutator,
    InvalidDate: InvalidDateMutator,
    NullIntent: NullIntentMutator,
    RandomIntentAction: RandomIntentActionMutator,
    NullPutExtraValue: NullPutExtraValueMutator,
    NullPutExtraKey: NullPutExtraKeyMutator,
    BuggyGUIListener: BuggyGUIListenerMutator,
    LengthyGUIListener: LengthyGUIListenerMutator,
    LengthyGUICreation: LengthyGUICreationMutator,
    FindViewByIdReturnsNull: FindViewByIdReturnsNullMutator,
    InvalidIDFindView: InvalidIDFindViewMutator,
    InvalidViewFocus: InvalidViewFocusMutator,
    ViewComponentNotVisible: ViewComponentNotVisibleMutator,
};
