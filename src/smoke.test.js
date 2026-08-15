import { describe, it, expect } from "vitest";
import { genId } from "./App.jsx";

describe("smoke test", () => {
  it("peut importer App.jsx sans planter", () => {
    expect(typeof genId).toBe("function");
  });
});
