import { describe, it, expect, vi } from "vitest";
import { saveGameScoreWithRetry } from "./utils/gameScore.js";

// Faux client Supabase minimal, pour simuler des échecs puis un succès
// sans dépendre d'un vrai réseau.
function fakeSupabase(sequenceOfResults) {
  let call = 0;
  return {
    rpc: vi.fn(() => {
      const result = sequenceOfResults[call] ?? sequenceOfResults[sequenceOfResults.length - 1];
      call++;
      return Promise.resolve(result);
    }),
  };
}

describe("saveGameScoreWithRetry", () => {
  it("réussit du premier coup si l'appel fonctionne directement", async () => {
    const supabase = fakeSupabase([{ error: null }]);
    const result = await saveGameScoreWithRetry(supabase, "update_my_station_score", { new_score: 10 });
    expect(result.success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it("réessaie après un échec, et réussit à la deuxième tentative", async () => {
    const supabase = fakeSupabase([{ error: { message: "coupure réseau" } }, { error: null }]);
    const result = await saveGameScoreWithRetry(supabase, "update_my_station_score", { new_score: 10 });
    expect(result.success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledTimes(2);
  });

  it("abandonne proprement après le nombre maximal de tentatives, sans planter", async () => {
    const supabase = fakeSupabase([{ error: { message: "échec persistant" } }]);
    const result = await saveGameScoreWithRetry(supabase, "update_my_station_score", { new_score: 10 }, 3);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(supabase.rpc).toHaveBeenCalledTimes(3);
  });

  it("ne plante pas si l'appel lève une exception au lieu de renvoyer une erreur", async () => {
    const supabase = { rpc: vi.fn(() => { throw new Error("réseau indisponible"); }) };
    const result = await saveGameScoreWithRetry(supabase, "update_my_station_score", { new_score: 10 }, 2);
    expect(result.success).toBe(false);
  });
});
