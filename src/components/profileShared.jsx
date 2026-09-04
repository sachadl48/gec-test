import { useState, useEffect } from "react";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip,
  LineChart, CartesianGrid, XAxis, YAxis, Line,
} from "recharts";
import { ClipboardList } from "lucide-react";
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "../theme.js";
import { useLang, LANGS } from "../lang.jsx";
import { FONCTIONS, TEAMS, fonctionLabel } from "../data/fonctions.js";
import { catColor } from "../utils/categoryColor.js";
import { makePseudo, agentPassword } from "../utils/userAccount.js";
import { initials, computeCategoryStats, computeCategoryEvolution, statutNoteObligatoire } from "../utils/scoring.js";
import { supabase } from "../lib/supabaseClient.js";
import { Btn, Field, inputStyle, Modal, SectionTitle, EmptyState, StatCard, Badge } from "./atoms.jsx";

// Fiche détaillée d'un profil élève (lecture seule, avec statistiques), et
// fenêtre de création/modification d'un profil — partagées entre la page
// "Gestion des profils" et la vue "Ma Team".
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

// Une fois diplômé (Régulateur/Dispatcheur), la fonction de l'élève ne
// correspond plus aux valeurs "Élève X" utilisées comme filière dans la
// table notes_obligatoires — sans ce mapping, plus aucune note ne
// remonterait après la remise du diplôme, alors que le statut (lu/raté)
// de ces notes reste bien réel et doit continuer à s'afficher.
const FILIERE_NOTES_MAP = { "Élève régulateur": "Élève régulateur", "Régulateur": "Élève régulateur", "Élève dispatcheur": "Élève dispatcheur", "Dispatcheur": "Élève dispatcheur" };
export function filiereNotesPour(fonction) { return FILIERE_NOTES_MAP[fonction] || null; }

// Charge les notes obligatoires de la filière de l'élève et calcule le
// statut de chacune (lue et réussie / pas lue ou ratée). Fonction simple
// (pas un hook) pour pouvoir être réutilisée aussi bien dans un composant
// React (EleveDetailView) que dans le flux d'export/impression, qui doit
// charger ces données avant de générer le PDF.
export async function fetchNotesObligatoiresStatut(eleve, questionnaires, categoryConfig) {
  const filiere = filiereNotesPour(eleve?.fonction);
  if (!filiere) return [];
  const { data, error } = await supabase.from("notes_obligatoires").select("*").eq("filiere", filiere).order("ordre", { ascending: true });
  if (error || !data) return [];
  return data.map(note => ({ ...note, statut: statutNoteObligatoire(note, questionnaires, eleve.id, categoryConfig).statut }));
}

function NotesStatutSection({ eleve, questionnaires, categoryConfig }) {
  const { t, lang } = useLang();
  const [notes, setNotes] = useState(null); // null = chargement en cours
  useEffect(() => {
    let cancelled = false;
    fetchNotesObligatoiresStatut(eleve, questionnaires, categoryConfig).then(n => { if (!cancelled) setNotes(n); });
    return () => { cancelled = true; };
  }, [eleve.id, eleve.fonction]); // eslint-disable-line

  if (notes === null || notes.length === 0) return null;

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
      <SectionTitle>{t("notes_obligatoires_titre")}</SectionTitle>
      <div style={{ height: 8 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {notes.map(note => {
          const lue = note.statut === true;
          return (
            <div key={note.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: lue ? C.greenSoft : "#fff", border: `1px solid ${lue ? C.green : C.line}` }}>
              <span style={{ fontSize: 13, color: C.ink }}>{note.titre}</span>
              <Badge color={lue ? C.green : C.inkSoft} bg={lue ? C.greenSoft : C.bg}>{lue ? t("note_lue_badge") : t("note_pas_lue_badge")}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EleveDetailView({ eleve, questionnaires, categories, categoryConfig, onBack }) {
  const { t, lang } = useLang();
  const mine = questionnaires.filter(q => q.eleveId === eleve.id && !q.supprime);
  const graded = mine.filter(q => q.statut === "validé" && !q.supprime);
  const catStats = computeCategoryStats(graded, categories);
  const radarData = categories.map(cat => ({ categorie: cat, score: catStats[cat]?.total ? Math.round((catStats[cat].correct / catStats[cat].total) * 100) : 0 }));
  const evolution = computeCategoryEvolution(graded, categories);
  const evolutionCats = Object.keys(evolution);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16 }}>{initials(eleve.prenom, eleve.nom)}</div>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, color: C.navy }}>{eleve.prenom} {eleve.nom}</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 2, fontFamily: FONT_MONO }}>{t("agent_number")} : {eleve.numeroAgent} · {fonctionLabel(eleve.fonction, lang) || t("role_eleve")}</div>
          </div>
        </div>
        <Btn variant="ghost" onClick={onBack}>{t("retour_profils")}</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard label={t("stat_qn_attribues")} value={mine.length} />
        <StatCard label={t("qn_valides_label")} value={graded.length} />
        <StatCard label={t("en_attente_encours")} value={mine.length - graded.length} />
        <StatCard label={t("record_jeu_stations_label")} value={eleve.jeuStationsMeilleurScore || 0} />
      </div>

      <NotesStatutSection eleve={eleve} questionnaires={questionnaires} categoryConfig={categoryConfig} />

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <SectionTitle>{t("points_forts_faibles_global")}</SectionTitle>
        {graded.length === 0 ? <EmptyState icon={ClipboardList} title={t("no_results_title")} body={t("graphique_apres_validation")} /> : (
          <div style={{ height: 280, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke={C.line} />
                <PolarAngleAxis dataKey="categorie" tick={{ fontSize: 11, fill: C.inkSoft, fontFamily: FONT_BODY }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#B8BCC4" }} />
                <Radar dataKey="score" stroke={C.gold} fill={C.gold} fillOpacity={0.35} />
                <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
        <SectionTitle>{t("evolution_categorie_titre")}</SectionTitle>
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4, marginBottom: 10 }}>{t("evolution_categorie_note")}</div>
        {evolutionCats.length === 0 ? <EmptyState icon={ClipboardList} title={t("pas_de_donnees_titre")} body={t("graphiques_apparaitront")} /> : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {evolutionCats.map(cat => (
              <div key={cat} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: catColor(categories, cat) }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{cat}</span>
                </div>
                <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolution[cat]} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid stroke={C.line} strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: C.inkSoft }} interval={0} angle={-15} textAnchor="end" height={40} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#B8BCC4" }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12 }} />
                      <Line type="monotone" dataKey="score" stroke={catColor(categories, cat)} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export function ProfilModal({ initial, users, isAdmin, onClose, onSave }) {
  const { t, lang } = useLang();
  const [form, setForm] = useState({ nom: initial.nom || "", prenom: initial.prenom || "", numeroAgent: initial.numeroAgent || "", fonction: initial.fonction || "Élève régulateur", langue: initial.langue || "fr", team: initial.team || "", email: initial.email || "", id: initial.id });
  const pseudoPreview = makePseudo(form.nom, form.prenom, users, initial.id) || "—";
  return (
    <Modal title={initial.id ? t("modifier_profil") : t("ajouter_eleve")} onClose={onClose}>
      <Field label={t("prenom_label")}><input style={inputStyle} value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} /></Field>
      <Field label={t("nom_label")}><input style={inputStyle} value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></Field>
      <Field label={t("numero_agent_label")}><input style={inputStyle} value={form.numeroAgent} onChange={e => setForm({ ...form, numeroAgent: e.target.value })} /></Field>
      <Field label={t("fonction_label")}><select style={inputStyle} value={form.fonction} onChange={e => setForm({ ...form, fonction: e.target.value })}>{FONCTIONS.map(f => <option key={f} value={f}>{fonctionLabel(f, lang)}</option>)}</select></Field>
      <Field label={t("role_linguistique_label")} hint={t("role_linguistique_hint")}>
        <select style={inputStyle} value={form.langue} onChange={e => setForm({ ...form, langue: e.target.value })}>
          {Object.entries(LANGS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
      </Field>
      <Field label="Team">
        <select style={inputStyle} value={form.team} onChange={e => setForm({ ...form, team: e.target.value })}>
          <option value="">{t("team_aucune")}</option>
          {TEAMS.map(tm => <option key={tm} value={tm}>{tm}</option>)}
        </select>
      </Field>
      <Field label={t("email_label")}>
        <input type="email" style={inputStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="prenom.nom@exemple.be" />
      </Field>
      <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", fontSize: 12.5, color: C.inkSoft, marginBottom: 8 }}>
        {t("identifiant_connexion")} : <strong style={{ fontFamily: FONT_MONO, color: C.ink }}>{pseudoPreview}</strong><br />
        {t("mot_de_passe_label")} : <strong style={{ fontFamily: FONT_MONO, color: C.ink }}>{form.numeroAgent ? agentPassword(form.numeroAgent) : "—"}</strong> <span>{t("genere_auto")}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>{t("cancel")}</Btn>
        <Btn variant="primary" onClick={() => onSave(form)} disabled={!form.nom || !form.prenom || !form.numeroAgent}>{t("save")}</Btn>
      </div>
    </Modal>
  );
}
