// Sauvegarde d'un score de jeu (stations/téléphones), avec nouvelles
// tentatives automatiques en cas d'échec.
//
// Avant ce correctif, un échec de sauvegarde (coupure réseau, session
// expirée, etc.) ne faisait absolument rien : pas de nouvelle tentative,
// aucun message, l'échec était totalement invisible — un joueur pouvait
// obtenir un excellent score sans jamais savoir que celui-ci n'avait pas
// été enregistré. Désormais : 3 tentatives avec un court délai croissant
// entre chacune, une trace claire dans la console à chaque échec pour
// pouvoir diagnostiquer, et l'appelant peut afficher un message visible
// au joueur si les 3 tentatives échouent malgré tout.
export async function saveGameScoreWithRetry(supabase, rpcName, params, maxAttempts = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { error } = await supabase.rpc(rpcName, params);
      if (!error) return { success: true };
      lastError = error;
      console.error(`[${rpcName}] tentative ${attempt}/${maxAttempts} échouée :`, error.message || error);
    } catch (e) {
      lastError = e;
      console.error(`[${rpcName}] tentative ${attempt}/${maxAttempts} — exception :`, e);
    }
    if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 800 * attempt));
  }
  return { success: false, error: lastError };
}
