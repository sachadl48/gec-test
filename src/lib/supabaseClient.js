import { createClient } from "@supabase/supabase-js";

// Ces deux valeurs sont lues depuis les variables d'environnement
// (fichier .env en local, réglages "Environment variables" sur Netlify/Vercel).
// La clé "anon" n'est pas un secret : elle est faite pour être visible côté
// navigateur. C'est la sécurité au niveau des lignes (RLS), déjà en place
// dans la base, qui protège réellement les données.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes. " +
    "Vérifiez votre fichier .env (en local) ou les variables d'environnement de votre hébergeur."
  );
}

// sessionStorage plutôt que le localStorage par défaut : la session reste
// active tant que l'onglet reste ouvert (un F5 ne déconnecte pas), mais
// fermer l'onglet ou le navigateur déconnecte réellement — important sur
// des postes potentiellement partagés entre opérateurs.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true },
});

// Appelle une Edge Function Supabase authentifiée avec le jeton de la
// session en cours (ou la clé anonyme si personne n'est connecté).
export async function callEdgeFunction(name, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || supabaseAnonKey}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Une erreur est survenue.");
  return json;
}
