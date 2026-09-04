import { useState } from "react";
import { C, FONT_DISPLAY, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { SATISFACTION_SCALE, ENQUETE_FORMATION_QUESTIONS } from "../data/enqueteSatisfaction.js";
import { Btn, inputStyle, SectionTitle, DebouncedTextarea } from "./atoms.jsx";

// Formulaire de remplissage de l'enquête de satisfaction — pas anonyme,
// remplie une seule fois (l'enquête passe de "en_attente" à "terminee" à
// la soumission, plus modifiable ensuite). Deux parties : la formation en
// elle-même, puis un avis par moniteur (liste figée au moment de la
// création de l'enquête, tirée du carnet de l'élève à cet instant).
export function EnqueteSatisfactionForm({ enquete, onDone, onExit }) {
  const { t, lang } = useLang();
  const [formation, setFormation] = useState(() => Object.fromEntries(ENQUETE_FORMATION_QUESTIONS.map(q => [q.cle, { note: null, commentaire: "" }])));
  const [moniteurs, setMoniteurs] = useState(() => (enquete.moniteurs || []).map(m => ({ nom: m.nom, note: null, commentaire: "" })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setFormationNote = (cle, note) => setFormation(f => ({ ...f, [cle]: { ...f[cle], note } }));
  const setFormationCommentaire = (cle, commentaire) => setFormation(f => ({ ...f, [cle]: { ...f[cle], commentaire } }));
  const setMoniteurNote = (i, note) => setMoniteurs(m => m.map((x, xi) => xi === i ? { ...x, note } : x));
  const setMoniteurCommentaire = (i, commentaire) => setMoniteurs(m => m.map((x, xi) => xi === i ? { ...x, commentaire } : x));

  const toutNote = ENQUETE_FORMATION_QUESTIONS.every(q => typeof formation[q.cle]?.note === "number") && moniteurs.every(m => typeof m.note === "number");

  const submit = async () => {
    if (!toutNote) return;
    setSaving(true);
    setError("");
    try {
      const { error: err } = await supabase.from("enquetes_satisfaction").update({
        statut: "terminee", reponses: { formation, moniteurs }, date_completion: new Date().toISOString(),
      }).eq("id", enquete.id);
      if (err) throw err;
      onDone();
    } catch (e) {
      setError(e?.message || t("erreur_inconnue"));
    }
    setSaving(false);
  };

  const NoteSelector = ({ value, onChange }) => (
    <div style={{ display: "flex", gap: 6 }}>
      {SATISFACTION_SCALE.map(s => (
        <button key={s.value} type="button" onClick={() => onChange(s.value)}
          title={lang === "nl" ? s.descNl : s.desc}
          style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${value === s.value ? C.gold : C.line}`, background: value === s.value ? C.gold : "#fff", color: value === s.value ? "#fff" : C.ink, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          {s.label}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Btn variant="ghost" onClick={onExit}>{t("retour_btn")}</Btn>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, color: C.navy }}>{t("enquete_satisfaction_titre")}</div>
      </div>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 20 }}>{t("enquete_intro")}</div>

      <SectionTitle>{t("enquete_partie_formation")}</SectionTitle>
      <div style={{ height: 10 }} />
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {ENQUETE_FORMATION_QUESTIONS.map(q => (
            <div key={q.cle}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: C.navy, marginBottom: 8 }}>{lang === "nl" ? q.labelNl : q.label}</div>
              <NoteSelector value={formation[q.cle]?.note} onChange={v => setFormationNote(q.cle, v)} />
              <DebouncedTextarea value={formation[q.cle]?.commentaire || ""} onCommit={v => setFormationCommentaire(q.cle, v)} placeholder={t("commentaire_facultatif_placeholder")} style={{ ...inputStyle, marginTop: 8, minHeight: 50, fontSize: 12.5 }} />
            </div>
          ))}
        </div>
      </div>

      <SectionTitle>{t("enquete_partie_moniteurs")}</SectionTitle>
      <div style={{ height: 10 }} />
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 28 }}>
        {moniteurs.length === 0 ? (
          <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("enquete_aucun_moniteur")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {moniteurs.map((m, i) => (
              <div key={m.nom + i}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.navy, marginBottom: 8 }}>{m.nom}</div>
                <NoteSelector value={m.note} onChange={v => setMoniteurNote(i, v)} />
                <DebouncedTextarea value={m.commentaire} onCommit={v => setMoniteurCommentaire(i, v)} placeholder={t("commentaire_facultatif_placeholder")} style={{ ...inputStyle, marginTop: 8, minHeight: 50, fontSize: 12.5 }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div style={{ fontSize: 12.5, color: C.red, marginBottom: 10 }}>{error}</div>}
      {!toutNote && <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>{t("enquete_notes_manquantes")}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn variant="gold" disabled={!toutNote || saving} onClick={submit}>{saving ? t("enquete_envoi_en_cours") : t("enquete_soumettre_btn")}</Btn>
      </div>
    </div>
  );
}
