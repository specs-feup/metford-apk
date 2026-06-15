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
import { InvalidKeyIntentMutator } from "./mutators/InvalidKeyIntentMutator.js";
import { IntentTargetReplacementMutator } from "./mutators/IntentTargetReplacementMutator.js";

type MutatorCtor = new (args?: Record<string, unknown>) => Mutator;

/**
 * Maps config operator names (as written in metford.config.json) to their
 * mutator constructors. Add new operators here after implementing their class.
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
    InvalidKeyIntent: InvalidKeyIntentMutator,
    IntentTargetReplacement: IntentTargetReplacementMutator,
};
