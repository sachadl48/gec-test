import React, { useState } from "react";
import { HelpCircle } from "lucide-react";
import { C, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { CARPASS_COMPETENCES, CARPASS_COTATION_SCALE, CARPASS_COMMENTAIRES_CHAMPS } from "../data/carpass.js";
import { Field, inputStyle, SectionTitle, Badge, Btn, Modal, DebouncedTextarea } from "./atoms.jsx";

const SEMAINES = ["semaine1", "semaine2", "semaine3"];

// Onglet "CarPass SYREM" du carnet : le feedback général de l'instructeur
// au centre de formation externe (SYREM), pour que le staff DTM voie où
// en était l'élève à son arrivée. Toujours visible, mais modifiable
// uniquement par les Gunmen et les Admin + (voir canEdit, calculé dans
// CarnetPersonnel) — tout le monde d'autre le consulte en lecture seule.
// Style volontairement identique aux onglets Élève régulateur/dispatcheur
// (badge modifiable/lecture seule, cartes blanches arrondies, même
// en-tête de tableau et même principe d'aide à la cotation que le reste
// de l'app) plutôt qu'un style à part.
export function CarPassTab({ eleve, updateCarnet, canEdit }) {
  const { t, lang } = useLang();
  const [showAideCotation, setShowAideCotation] = useState(false);
  const carpass = eleve.carnet?.carpass || {};
  const commentaires = carpass.commentaires || {};
  const cotations = carpass.cotations || {};

  const setCommentaire = (cle, valeur) => {
    updateCarnet({ carpass: { ...carpass, commentaires: { ...commentaires, [cle]: valeur } } });
  };
  const setCotation = (id, patch) => {
    updateCarnet({ carpass: { ...carpass, cotations: { ...cotations, [id]: { ...(cotations[id] || {}), ...patch } } } });
  };
  const scaleFor = (val) => CARPASS_COTATION_SCALE.find(s => s.value === val);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        {canEdit
          ? <Badge color={C.green} bg={C.greenSoft}>{t("carnet_onglet_modifiable")}</Badge>
          : <Badge color={C.inkSoft} bg={C.bg}>{t("carnet_onglet_lecture_seule")}</Badge>}
      </div>

      <SectionTitle>{t("carpass_commentaires_titre")}</SectionTitle>
      <div style={{ height: 10 }} />
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {CARPASS_COMMENTAIRES_CHAMPS.map(champ => (
            <Field key={champ.cle} label={lang === "nl" ? champ.labelNl : champ.label}>
              <DebouncedTextarea disabled={!canEdit} value={commentaires[champ.cle] || ""} onCommit={v => setCommentaire(champ.cle, v)} style={inputStyle} />
            </Field>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <SectionTitle>{t("carpass_cotations_titre")}</SectionTitle>
        <Btn variant="ghost" icon={HelpCircle} onClick={() => setShowAideCotation(true)}>{t("aide_cotation_btn")}</Btn>
      </div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 720 }}>
            <thead>
              <tr style={{ background: C.bg, textAlign: "left" }}>
                <th style={{ padding: "10px 16px", fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", fontWeight: 700 }}>{t("carpass_col_chapitre")}</th>
                <th style={{ padding: "10px 12px", width: 84, fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", fontWeight: 700, textAlign: "center" }}>{t("carpass_semaine_1")}</th>
                <th style={{ padding: "10px 12px", width: 84, fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", fontWeight: 700, textAlign: "center" }}>{t("carpass_semaine_2")}</th>
                <th style={{ padding: "10px 12px", width: 84, fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", fontWeight: 700, textAlign: "center" }}>{t("carpass_semaine_3")}</th>
                <th style={{ padding: "10px 16px", fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", fontWeight: 700 }}>{t("carpass_col_commentaire")}</th>
              </tr>
            </thead>
            <tbody>
              {CARPASS_COMPETENCES.map(comp => (
                <React.Fragment key={comp.id}>
                  <tr>
                    <td colSpan={5} style={{ padding: "10px 16px", fontWeight: 700, color: C.navy, background: C.bg, borderTop: `1px solid ${C.line}` }}>{comp.titre}</td>
                  </tr>
                  {comp.sousCompetences.map(sc => {
                    const cot = cotations[sc.id] || {};
                    return (
                      <tr key={sc.id} style={{ borderTop: `1px solid ${C.line}` }}>
                        <td style={{ padding: "12px 16px 12px 32px", color: C.ink }}>{sc.titre}</td>
                        {SEMAINES.map(sem => {
                          const val = cot[sem];
                          const scale = val !== undefined && val !== null ? scaleFor(val) : null;
                          return (
                            <td key={sem} style={{ padding: "10px 8px", textAlign: "center" }}>
                              <select disabled={!canEdit} value={val ?? ""} onChange={e => setCotation(sc.id, { [sem]: e.target.value === "" ? null : Number(e.target.value) })}
                                style={{ ...inputStyle, padding: "6px 4px", textAlign: "center", fontFamily: FONT_MONO, fontWeight: 700, background: scale ? scale.bg : "#fff", color: scale ? scale.color : C.ink, borderColor: scale ? scale.color : C.line }}>
                                <option value="">—</option>
                                {CARPASS_COTATION_SCALE.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                            </td>
                          );
                        })}
                        <td style={{ padding: "12px 16px" }}>
                          <DebouncedTextarea disabled={!canEdit} value={cot.commentaire || ""} onCommit={v => setCotation(sc.id, { commentaire: v })} style={{ ...inputStyle, minHeight: 36, fontSize: 12.5, resize: "vertical" }} />
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAideCotation && (
        <Modal title={t("aide_cotation_titre")} onClose={() => setShowAideCotation(false)} width={480}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CARPASS_COTATION_SCALE.map(opt => (
              <div key={opt.value} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10, background: opt.bg }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#fff", color: opt.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{opt.label}</div>
                <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.4 }}>{lang === "nl" ? opt.descNl : opt.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <Btn variant="ghost" onClick={() => setShowAideCotation(false)}>{t("close")}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
