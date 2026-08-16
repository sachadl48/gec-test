# Contexte GEC — à lire avant de travailler sur ce projet

Ce document résume ce qui a été décidé lors des sessions précédentes (via
claude.ai), pour qu'une nouvelle session Claude Code n'ait pas besoin de
redécouvrir ce contexte à la dure, ou pire, de contredire un choix qui a été
fait volontairement.

## Le projet en une phrase

GEC (Gestion des Évaluations Continues) : application web pour le suivi
des évaluations continues des élèves opérateurs à la STIB (Bruxelles) —
banque de questions bilingue FR/NL, questionnaires, carnet de formation
noté par compétence, jeu des stations, et administration.

## Stack et accès

- **Frontend** : Vite + React, dans `src/App.jsx` (racine) + `src/components/`,
  `src/data/`, `src/utils/`, `src/lang.jsx`, `src/theme.js`
- **Backend** : Supabase (PostgreSQL + RLS + Edge Functions + Realtime)
- **Hébergement** : Vercel
- **GitHub** : `sachadl48/gec-test`
- **Tests** : Vitest, 54 tests dans `src/*.test.js` (lancer avec `npm test`)

## Architecture actuelle (important)

Le fichier `App.jsx` a été **volontairement découpé** depuis un fichier
unique de ~5900 lignes vers une architecture modulaire (~35 fichiers).
`App.jsx` ne fait plus que ~580 lignes : imports, système d'impression/export
PDF, synchronisation Supabase, et le composant racine `App`.

**Règle de travail suivie pendant le découpage**, à respecter si vous
continuez ce travail ou touchez à la structure des fichiers :
1. Ne jamais changer la logique en même temps que la structure — un
   déplacement de code ne doit rien changer au comportement.
2. Après chaque déplacement : vérifier la syntaxe, lancer eslint
   (`no-undef` est le plus utile — il détecte les imports manquants),
   lancer `npm test`, puis `npm run build`.
3. Un bug réel a été trouvé de cette manière : `StaffView` était utilisée
   dans `App.jsx` sans jamais être importée — aurait empêché **toute
   connexion staff** en production. Découvert seulement parce qu'un examen
   manuel a été fait après coup sur des fichiers déjà extraits avant cette
   série de sessions. Ça vaut la peine d'être prudent avec tout code déjà
   présent qui n'a pas été vérifié aussi rigoureusement.

## Décisions volontaires à ne pas contredire par erreur

- **Détection de doublons à l'import de questions** : implémentée mais
  **exclue intentionnellement** des déploiements, à la demande de Sacha.
  Ne pas la réactiver sans qu'il le redemande explicitement.
- **Traduction FR/NL des questions** : quand Sacha fournit des questions
  déjà écrites, il faut les **traduire directement**, pas en générer de
  nouvelles à partir des documents sources (CCT Move, INST_BUM, NOT_BUM).
- **Terminologie STIB** : à préserver exactement dans les deux langues
  (SMT/AGD, GCTR/BBRT, Proximity Manager, opérateur ATS/ATS-operator,
  carte agent/agentkaart, poste fixe/vaste post...).
- **Verrouillage du carnet par moniteur** (ajouté récemment) : seul le
  moniteur qui a ouvert un jour peut noter/commenter. Si le jour reste
  ouvert plus de 8h, n'importe quel membre du staff (moniteur/admin/admin+)
  peut le **clôturer** — mais jamais noter à la place de l'autre. Les
  opérateurs n'ont jamais accès à l'édition du carnet.
- **Migration des clés de notation du carnet** : les notes étaient stockées
  par position (`{0: 3}`), maintenant par nom de compétence (`{"Regulation":
  3}`) pour résister aux réorganisations de compétences. **Pas de
  transformation en masse des données existantes** — lecture avec repli
  automatique vers l'ancien format, écriture toujours au nouveau format.
  Ne jamais faire de script de migration en masse sur ce champ sans
  confirmation explicite : on ne sait pas avec certitude dans quel ordre
  les données existantes ont été saisies.
- **Hermès, Crew Management, CBTC, IVL** : ajoutés au carnet mais **vides
  intentionnellement** (technologies encore en test à la STIB). Ne pas les
  développer sans demande explicite.
- **Export Excel du carnet** : volontairement PAS de librairie haut niveau
  (xlsx, exceljs) — ces librairies suppriment les graphiques natifs Excel.
  Approche "chirurgicale" : le .xlsx est traité comme une archive ZIP,
  seules les cellules concernées sont modifiées en XML, tout le reste
  (graphiques, styles, formules) est recopié à l'identique.

## Pièges déjà rencontrés (pour ne pas les refaire)

- RLS Supabase peut bloquer silencieusement des écritures initiées par un
  élève (ex: score du jeu des stations) — la solution éprouvée est une
  fonction `security definer` appelée via RPC.
- Écritures Supabase rapides (frappe clavier) peuvent se faire concurrence
  et perdre des caractères — solution : `DebouncedTextarea` (600ms + flush
  au blur), déjà en place dans `components/Carnet.jsx`.
- `colLetterToNum` (export Excel) doit recevoir une lettre de colonne
  seule, jamais une adresse de cellule complète — bug déjà corrigé, testé
  par `excelExport.test.js`.

## Scripts SQL — statut incertain

Plusieurs scripts SQL numérotés (6, 7, 9, 10, 11, 12) ont été écrits lors
de sessions antérieures mais leur exécution effective sur la base Supabase
n'est pas confirmée avec certitude. À vérifier avant de supposer qu'ils
sont en place. Le schéma 18 (Realtime sur `profiles`) est confirmé écrit
récemment — statut d'exécution à vérifier aussi si besoin.

## Tests automatisés

`npm test` lance Vitest. Fichiers dans `src/*.test.js`, ciblés sur les
fonctions à risque : résolution de texte bilingue, notation, export Excel,
clés du carnet. Config dans `vitest.config.js` (séparée de `vite.config.js`,
n'affecte jamais le build de production). Variables d'environnement
factices dans `.env.test` (aucune vraie donnée, nécessaire uniquement pour
que le client Supabase s'initialise pendant les tests).

## Style de travail attendu par Sacha

- Progresser par petites étapes vérifiables, pas de gros changements d'un
  coup.
- **Aucun risque de perte de données réelles** — il y a de vrais carnets
  d'élèves déjà remplis. Toujours privilégier l'option la plus prudente
  si un choix se présente entre rapidité et sécurité des données.
- Poser une question de clarification avant une décision structurante
  plutôt que de supposer.
- Sacha ne déploie pas forcément après chaque changement — vérifier l'état
  réel du dépôt GitHub avant de supposer que le code présenté correspond
  à ce qui est en production sur Vercel.
