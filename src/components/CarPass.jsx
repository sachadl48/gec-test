import React from "react";
import { C, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { CARPASS_COMPETENCES, CARPASS_COTATION_SCALE, CARPASS_COMMENTAIRES_CHAMPS } from "../data/carpass.js";
import { Field, inputStyle, SectionTitle, DebouncedTextarea } from "./atoms.jsx";

// Onglet "CarPass SYREM" du carnet : le feedback général de l'instructeur
// au centre de formation externe (SYREM), pour que le staff DTM voie où
// en était l'élève à son arrivée. Toujours visible, mais modifiable
// uniquement par les Gunmen et les Admin + (voir canEdit, calculé dans
// CarnetPersonnel) — tout le monde d'autre le consulte en lecture seule.
export function CarPassTab({ eleve, updateCarnet, canEdit }) {
  const { t, lang } = useLang();
  const carpass = eleve.carnet?.carpass || {};
  const commentaires = carpass.commentaires || {};
  const cotations = carpass.cotations || {};

  const setCommentaire = (cle, valeur) => {
    updateCarnet({ carpass: { ...carpass, commentaires: { ...commentaires, [cle]: valeur } } });
  };
  const setCotation = (id, patch) => {
    updateCarnet({ carpass: { ...carpass, cotations: { ...cotations, [id]: { ...(cotations[id] || {}), ...patch } } } });
  };

  return (
    <div>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 20, background: C.bg, borderRadius: 8, padding: "10px 14px" }}>
        {t("carpass_intro")}
      </div>

      <SectionTitle>{t("carpass_commentaires_titre")}</SectionTitle>
      <div style={{ height: 10 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
        {CARPASS_COMMENTAIRES_CHAMPS.map(champ => (
          <Field key={champ.cle} label={lang === "nl" ? champ.labelNl : champ.label}>
            <DebouncedTextarea disabled={!canEdit} value={commentaires[champ.cle] || ""} onCommit={v => setCommentaire(champ.cle, v)} />
          </Field>
        ))}
      </div>

      <SectionTitle>{t("carpass_cotations_titre")}</SectionTitle>
      <div style={{ height: 10 }} />
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
          <thead>
            <tr style={{ background: C.bg, textAlign: "left" }}>
              <th style={{ padding: "8px 12px", fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em" }}>{t("carpass_col_chapitre")}</th>
              <th style={{ padding: "8px 12px", width: 90, fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em" }}>{t("carpass_col_cotation")}</th>
              <th style={{ padding: "8px 12px", fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em" }}>{t("carpass_col_commentaire")}</th>
            </tr>
          </thead>
          <tbody>
            {CARPASS_COMPETENCES.map(comp => (
              <React.Fragment key={comp.id}>
                <tr>
                  <td colSpan={3} style={{ padding: "10px 12px", fontWeight: 700, color: C.navy, background: C.bg, borderTop: `1px solid ${C.line}` }}>{comp.titre}</td>
                </tr>
                {comp.sousCompetences.map(sc => {
                  const cot = cotations[sc.id] || {};
                  return (
                    <tr key={sc.id} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td style={{ padding: "8px 12px 8px 30px", color: C.ink }}>{sc.titre}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <select disabled={!canEdit} value={cot.note ?? ""} onChange={e => setCotation(sc.id, { note: e.target.value === "" ? null : Number(e.target.value) })} style={{ ...inputStyle, padding: "5px 6px", fontFamily: FONT_MONO, fontWeight: 700 }}>
                          <option value="">—</option>
                          {CARPASS_COTATION_SCALE.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <DebouncedTextarea disabled={!canEdit} value={cot.commentaire || ""} onCommit={v => setCotation(sc.id, { commentaire: v })} style={{ minHeight: 34, fontSize: 12.5 }} />
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 10 }}>
        {CARPASS_COTATION_SCALE.map(s => `${s.label} = ${lang === "nl" ? s.descNl : s.desc}`).join("  ·  ")}
      </div>
    </div>
  );
}
