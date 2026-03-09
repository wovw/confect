import { GroupSpec, Spec } from "@confect/core";
import { describe, expect, test } from "@effect/vitest";
import { Option } from "effect";

import * as GroupPath from "../src/GroupPath";

describe("GroupPath.getGroupSpec", () => {
  const makeGroupPathObj = (pathSegments: readonly [string, ...string[]]) =>
    GroupPath.make(pathSegments);

  test("returns none for empty spec", () => {
    const spec = Spec.define({});

    const result = GroupPath.getGroupSpec(
      spec,
      makeGroupPathObj(["nonexistent"]),
    );

    expect(Option.isNone(result)).toBe(true);
  });

  test("returns none when group does not exist", () => {
    const spec = Spec.define({
      myGroup: GroupSpec.define("myGroup", {}),
    });

    const result = GroupPath.getGroupSpec(
      spec,
      makeGroupPathObj(["nonexistent"]),
    );

    expect(Option.isNone(result)).toBe(true);
  });

  test("returns the group for a single-element path", () => {
    const myGroup = GroupSpec.define("myGroup", {});
    const spec = Spec.define({ myGroup });

    const result = GroupPath.getGroupSpec(spec, makeGroupPathObj(["myGroup"]));

    expect(Option.isSome(result)).toBe(true);
    expect(Option.getOrThrow(result).name).toBe("myGroup");
  });

  test("returns none when nested group does not exist", () => {
    const outer = GroupSpec.define("outer", {});
    const spec = Spec.define({ outer });

    const result = GroupPath.getGroupSpec(
      spec,
      makeGroupPathObj(["outer", "nonexistent"]),
    );

    expect(Option.isNone(result)).toBe(true);
  });

  test("returns the nested group for a two-element path", () => {
    const inner = GroupSpec.define("inner", {});
    const outer = GroupSpec.define("outer", { groups: { inner } });
    const spec = Spec.define({ outer });

    const result = GroupPath.getGroupSpec(
      spec,
      makeGroupPathObj(["outer", "inner"]),
    );

    expect(Option.isSome(result)).toBe(true);
    expect(Option.getOrThrow(result).name).toBe("inner");
  });

  test("returns the deeply nested group for a three-element path", () => {
    const level3 = GroupSpec.define("level3", {});
    const level2 = GroupSpec.define("level2", { groups: { level3 } });
    const level1 = GroupSpec.define("level1", { groups: { level2 } });
    const spec = Spec.define({ level1 });

    const result = GroupPath.getGroupSpec(
      spec,
      makeGroupPathObj(["level1", "level2", "level3"]),
    );

    expect(Option.isSome(result)).toBe(true);
    expect(Option.getOrThrow(result).name).toBe("level3");
  });

  test("returns none when path is partially valid but final segment does not exist", () => {
    const level2 = GroupSpec.define("level2", {});
    const level1 = GroupSpec.define("level1", { groups: { level2 } });
    const spec = Spec.define({ level1 });

    const result = GroupPath.getGroupSpec(
      spec,
      makeGroupPathObj(["level1", "level2", "nonexistent"]),
    );

    expect(Option.isNone(result)).toBe(true);
  });

  test("returns none when intermediate path segment does not exist", () => {
    const level2 = GroupSpec.define("level2", {});
    const level1 = GroupSpec.define("level1", { groups: { level2 } });
    const spec = Spec.define({ level1 });

    const result = GroupPath.getGroupSpec(
      spec,
      makeGroupPathObj(["level1", "nonexistent", "level2"]),
    );

    expect(Option.isNone(result)).toBe(true);
  });

  test("returns correct group when multiple groups exist at the same level", () => {
    const notes = GroupSpec.define("notes", {});
    const random = GroupSpec.define("random", {});
    const notesAndRandom = GroupSpec.define("notesAndRandom", {
      groups: { notes, random },
    });
    const spec = Spec.define({ notesAndRandom });

    const notesResult = GroupPath.getGroupSpec(
      spec,
      makeGroupPathObj(["notesAndRandom", "notes"]),
    );
    const randomResult = GroupPath.getGroupSpec(
      spec,
      makeGroupPathObj(["notesAndRandom", "random"]),
    );

    expect(Option.isSome(notesResult)).toBe(true);
    expect(Option.getOrThrow(notesResult).name).toBe("notes");
    expect(Option.isSome(randomResult)).toBe(true);
    expect(Option.getOrThrow(randomResult).name).toBe("random");
  });

  test("returns correct group when multiple top-level groups exist", () => {
    const users = GroupSpec.define("users", {});
    const posts = GroupSpec.define("posts", {});
    const spec = Spec.define({ users, posts });

    const usersResult = GroupPath.getGroupSpec(
      spec,
      makeGroupPathObj(["users"]),
    );
    const postsResult = GroupPath.getGroupSpec(
      spec,
      makeGroupPathObj(["posts"]),
    );

    expect(Option.isSome(usersResult)).toBe(true);
    expect(Option.getOrThrow(usersResult).name).toBe("users");
    expect(Option.isSome(postsResult)).toBe(true);
    expect(Option.getOrThrow(postsResult).name).toBe("posts");
  });
});
