import { useState, useEffect } from "react";
import { ClipboardCheck, Clock, ArrowLeft } from "lucide-react";
import { C, FONT_DISPLAY, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { SATISFACTION_SCALE, ENQUETE_FORMATION_QUESTIONS } from "../data/enqueteSatisfaction.js";
import { Btn, SectionTitle, EmptyState } from "./atoms.jsx";

// Page admin "Enquêtes de satisfaction" : deux listes (terminées,
// consultables en détail / en attente, juste listées) — visible
// uniquement pour les admins. Pas anonyme : chaque enquête est liée à
// l'élève qui l'a remplie.
export function GestionEnquetes({ users, currentUser }) {
  const { t, lang } = useLang();
  const [enquetes, setEnquetes] = useState(null); // null = chargement
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    let cancelled = false;
    supabase.from("enquetes_satisfaction").select("*").order("date_creation", { ascending: false })
      .then(({ data }) => { if (!cancelled) setEnquetes(data || []); });
    return () => { cancelled = true; };
  }, []);

  const nomEleve = (eleveId) => {
    const u = users.find(u => u.id === eleveId);
    return u ? `${u.prenom} ${u.nom}` : t("eleve_inconnu");
  };

  if (enquetes === null) return <div style={{ fontSize: 13, color: C.inkSoft }}>{t("chargement")}…</div>;

  if (viewing) {
    const noteLabel = (n) => SATISFACTION_SCALE.find(s => s.value === n)?.label ?? "—";
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <Btn variant="ghost" icon={ArrowLeft} onClick={() => setViewing(null)}>{t("retour_btn")}</Btn>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: C.navy }}>{t("enquete_de_prefix")} {nomEleve(viewing.eleve_id)}</div>
        </div>
        <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 20 }}>{t("enquete_completee_le")} {viewing.date_completion ? new Date(viewing.date_completion).toLocaleDateString(lang === "nl" ? "nl-BE" : "fr-BE") : "—"}</div>

        <SectionTitle>{t("enquete_partie_formation")}</SectionTitle>
        <div style={{ height: 10 }} />
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {ENQUETE_FORMATION_QUESTIONS.map(q => {
              const rep = viewing.reponses?.formation?.[q.cle];
              return (
                <div key={q.cle} style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{lang === "nl" ? q.labelNl : q.label}</span>
                    <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: C.gold, fontSize: 15 }}>{noteLabel(rep?.note)}<span style={{ color: C.inkSoft, fontSize: 11, fontWeight: 400 }}> / 5</span></span>
                  </div>
                  {rep?.commentaire && <div style={{ fontSize: 12.5, color: C.ink, fontStyle: "italic" }}>{rep.commentaire}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <SectionTitle>{t("enquete_partie_moniteurs")}</SectionTitle>
        <div style={{ height: 10 }} />
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
          {(viewing.reponses?.moniteurs || []).length === 0 ? (
            <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("enquete_aucun_moniteur")}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {viewing.reponses.moniteurs.map((m, i) => (
                <div key={i} style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{m.nom}</span>
                    <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: C.gold, fontSize: 15 }}>{noteLabel(m.note)}<span style={{ color: C.inkSoft, fontSize: 11, fontWeight: 400 }}> / 5</span></span>
                  </div>
                  {m.commentaire && <div style={{ fontSize: 12.5, color: C.ink, fontStyle: "italic" }}>{m.commentaire}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const terminees = enquetes.filter(e => e.statut === "terminee");
  const enAttente = enquetes.filter(e => e.statut === "en_attente");

  return (
    <div>
      <SectionTitle>{t("nav_enquetes")}</SectionTitle>
      <div style={{ height: 14 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <ClipboardCheck size={16} color={C.green} />
            <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{t("enquetes_terminees_titre")}</span>
          </div>
          {terminees.length === 0 ? <EmptyState icon={ClipboardCheck} title={t("aucune_enquete_titre")} body="" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {terminees.map(e => (
                <button key={e.id} onClick={() => setViewing(e)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: C.greenSoft, border: `1px solid ${C.green}`, borderRadius: 10, cursor: "pointer", textAlign: "left", width: "100%" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{t("enquete_de_prefix")} {nomEleve(e.eleve_id)}</span>
                  <span style={{ fontSize: 11, color: C.inkSoft, whiteSpace: "nowrap" }}>{e.date_completion ? new Date(e.date_completion).toLocaleDateString(lang === "nl" ? "nl-BE" : "fr-BE") : ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Clock size={16} color={C.gold} />
            <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{t("enquetes_en_attente_titre")}</span>
          </div>
          {enAttente.length === 0 ? <EmptyState icon={Clock} title={t("aucune_enquete_titre")} body="" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {enAttente.map(e => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{t("enquete_de_prefix")} {nomEleve(e.eleve_id)}</span>
                  <span style={{ fontSize: 11, color: C.inkSoft, whiteSpace: "nowrap" }}>{new Date(e.date_creation).toLocaleDateString(lang === "nl" ? "nl-BE" : "fr-BE")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
