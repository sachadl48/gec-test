import { useState } from "react";
import { ClipboardCheck, Clock, ArrowLeft, Trash2 } from "lucide-react";
import { C, FONT_DISPLAY, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { ENQUETE_FORMATION_QUESTIONS, ENQUETE_MONITEUR_QUESTIONS, SCALE_DEFAULT } from "../data/enqueteSatisfaction.js";
import { Btn, SectionTitle, EmptyState, ConfirmDialog } from "./atoms.jsx";

// Sous-onglet "Enquête de satisfaction" de la page "Gestion des
// Moniteurs" : deux listes (terminées, consultables en détail et
// supprimables par un Admin + / en attente, juste listées). Pas anonyme :
// chaque enquête est liée à l'élève qui l'a remplie. Les données arrivent
// en prop depuis App.jsx (chargement initial + synchro en direct), pas
// chargées ici.
export function GestionEnquetes({ users, enquetesSatisfaction, canDelete }) {
  const { t, lang } = useLang();
  const [viewing, setViewing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const enquetes = enquetesSatisfaction || [];

  const nomEleve = (eleveId) => {
    const u = users.find(u => u.id === eleveId);
    return u ? `${u.prenom} ${u.nom}` : t("eleve_inconnu");
  };

  const supprimerEnquete = async (enquete) => {
    setDeleteError("");
    try {
      const { error } = await supabase.from("enquetes_satisfaction").delete().eq("id", enquete.id);
      if (error) throw error;
      setConfirmDelete(null);
      setViewing(null);
      // Pas besoin de retirer l'entrée manuellement de la liste : la
      // synchro en direct (voir App.jsx) s'en charge dès que la
      // suppression est confirmée côté base — ce qui retire du même coup
      // ses cotations des graphiques de performances.
    } catch (e) {
      setDeleteError(e?.message || t("erreur_inconnue"));
    }
  };

  if (viewing) {
    const noteLabel = (n, scale) => scale.find(s => s.value === n)?.desc ?? "—";
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Btn variant="ghost" icon={ArrowLeft} onClick={() => setViewing(null)}>{t("retour_btn")}</Btn>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: C.navy }}>{t("enquete_de_prefix")} {nomEleve(viewing.eleveId)}</div>
          </div>
          {canDelete && <Btn variant="danger" icon={Trash2} onClick={() => setConfirmDelete(viewing)}>{t("supprimer_btn")}</Btn>}
        </div>
        <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 20 }}>{t("enquete_completee_le")} {viewing.dateCompletion ? new Date(viewing.dateCompletion).toLocaleDateString(lang === "nl" ? "nl-BE" : "fr-BE") : "—"}</div>

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
                    {q.note !== false && <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: C.gold, fontSize: 13 }}>{noteLabel(rep?.note, q.scale)}</span>}
                  </div>
                  {rep?.commentaire && <div style={{ fontSize: 12.5, color: C.ink, fontStyle: "italic" }}>{rep.commentaire}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <SectionTitle>{t("enquete_partie_moniteurs")}</SectionTitle>
        <div style={{ height: 10 }} />
        {(viewing.reponses?.moniteurs || []).length === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, fontSize: 12.5, color: C.inkSoft }}>{t("enquete_aucun_moniteur")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {viewing.reponses.moniteurs.map((m, i) => (
              <div key={i} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 14 }}>{m.nom}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {ENQUETE_MONITEUR_QUESTIONS.map(q => {
                    const rep = m.questions?.[q.cle];
                    return (
                      <div key={q.cle} style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{lang === "nl" ? q.labelNl : q.label}</span>
                          <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: C.gold, fontSize: 13 }}>{noteLabel(rep?.note, SCALE_DEFAULT)}</span>
                        </div>
                        {rep?.commentaire && <div style={{ fontSize: 12, color: C.ink, fontStyle: "italic" }}>{rep.commentaire}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        {confirmDelete && (
          <ConfirmDialog tone="danger" title={t("supprimer_enquete_titre")} message={t("confirm_supprimer_enquete_msg", { nom: nomEleve(confirmDelete.eleveId) })}
            confirmLabel={t("supprimer_btn")} onConfirm={() => supprimerEnquete(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
        )}
        {deleteError && <div style={{ fontSize: 12.5, color: C.red, marginTop: 10 }}>{deleteError}</div>}
      </div>
    );
  }

  const terminees = enquetes.filter(e => e.statut === "terminee");
  const enAttente = enquetes.filter(e => e.statut === "en_attente");

  return (
    <div>
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
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{t("enquete_de_prefix")} {nomEleve(e.eleveId)}</span>
                  <span style={{ fontSize: 11, color: C.inkSoft, whiteSpace: "nowrap" }}>{e.dateCompletion ? new Date(e.dateCompletion).toLocaleDateString(lang === "nl" ? "nl-BE" : "fr-BE") : ""}</span>
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
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{t("enquete_de_prefix")} {nomEleve(e.eleveId)}</span>
                  <span style={{ fontSize: 11, color: C.inkSoft, whiteSpace: "nowrap" }}>{new Date(e.dateCreation).toLocaleDateString(lang === "nl" ? "nl-BE" : "fr-BE")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
