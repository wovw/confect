import { describe, expect, it } from "@effect/vitest";
import * as GroupSpec from "../src/GroupSpec";

describe("isGroupSpec", () => {
  it("checks whether a value is a function spec", () => {
    const groupSpec: unknown = GroupSpec.define("notes", {});

    expect(GroupSpec.isGroupSpec(groupSpec)).toStrictEqual(true);
  });
});

describe("define", () => {
  it("disallows invalid JS identifiers as group names", () => {
    expect(() => GroupSpec.define("123", {})).toThrowErrorMatchingInlineSnapshot(
      `[Error: Expected a valid Confect function identifier, but received: "123". Valid identifiers must start with a letter, underscore, or dollar sign, and can only contain letters, numbers, underscores, or dollar signs.]`,
    );
  });

  it("disallows reserved keywords as group names", () => {
    expect(() => GroupSpec.define("if", {})).toThrowErrorMatchingInlineSnapshot(
      `[Error: Expected a valid Confect function identifier, but received: "if". "if" is a reserved JavaScript identifier.]`,
    );
  });

  it("disallows reserved Convex file names as group names", () => {
    expect(() => GroupSpec.define("schema", {})).toThrowErrorMatchingInlineSnapshot(
      `[Error: Expected a valid Confect function identifier, but received: "schema". "schema" is a reserved Convex file name.]`,
    );
  });
});
