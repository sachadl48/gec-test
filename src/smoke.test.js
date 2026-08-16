import { describe, it, expect } from "vitest";
import App from "./App.jsx";

describe("smoke test", () => {
  it("peut importer App.jsx sans planter", () => {
    expect(typeof App).toBe("function");
  });
});
