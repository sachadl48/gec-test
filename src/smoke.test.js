import { describe, it, expect } from "vitest";
import { qText } from "./App.jsx";

describe("smoke test", () => {
  it("peut importer App.jsx sans planter", () => {
    expect(typeof qText).toBe("function");
  });
});
