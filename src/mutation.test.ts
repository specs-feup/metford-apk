import { describe, expect, jest, test } from "@jest/globals";
import {
  isAddMutationOperator,
  isIntegerAdd,
  replaceWithSubtraction,
} from "./mutation.js";

describe("isAddMutationOperator", () => {
  test("accepts overloaded add mutation methods", () => {
    expect(isAddMutationOperator({ name: "mutationOperatorAdd(II)I" })).toBe(true);
    expect(isAddMutationOperator({ name: "mutationOperatorAdd(FF)F" })).toBe(true);
  });

  test("rejects methods that do not match the mutation operator signature", () => {
    expect(isAddMutationOperator({ name: "mutationOperatorSubtract(II)I" })).toBe(false);
    expect(isAddMutationOperator({ name: "mutationOperatorAdd" })).toBe(false);
  });
});

describe("isIntegerAdd", () => {
  test("accepts integer add instruction variants", () => {
    expect(isIntegerAdd({ opCodeName: "add-int" })).toBe(true);
    expect(isIntegerAdd({ opCodeName: "add-int/2addr" })).toBe(true);
    expect(isIntegerAdd({ opCodeName: "add-int/lit8" })).toBe(true);
  });

  test("rejects other arithmetic instructions", () => {
    expect(isIntegerAdd({ opCodeName: "sub-int" })).toBe(false);
    expect(isIntegerAdd({ opCodeName: "add-long" })).toBe(false);
  });
});

describe("replaceWithSubtraction", () => {
  test("mutates every supplied instruction and returns the mutation count", () => {
    const firstSetOperator = jest.fn<(operator: string) => void>();
    const secondSetOperator = jest.fn<(operator: string) => void>();

    const count = replaceWithSubtraction([
      { setOperator: firstSetOperator },
      { setOperator: secondSetOperator },
    ]);

    expect(count).toBe(2);
    expect(firstSetOperator).toHaveBeenCalledTimes(1);
    expect(firstSetOperator).toHaveBeenCalledWith("sub");
    expect(secondSetOperator).toHaveBeenCalledTimes(1);
    expect(secondSetOperator).toHaveBeenCalledWith("sub");
  });

  test("handles an empty selection", () => {
    expect(replaceWithSubtraction([])).toBe(0);
  });
});
