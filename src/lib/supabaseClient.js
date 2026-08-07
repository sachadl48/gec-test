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

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
