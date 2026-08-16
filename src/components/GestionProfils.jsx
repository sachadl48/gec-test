import { useState } from "react";
import { Plus, Search, Eye, FileDown, Edit2, Trash2, Users } from "lucide-react";
import { C, FONT_DISPLAY, FONT_MONO } from "../theme.js";
import { useLang, LANGS } from "../lang.jsx";
import { fonctionColor, fonctionLabel } from "../data/fonctions.js";
import { makePseudo } from "../utils/userAccount.js";
import { initials } from "../utils/scoring.js";
import { diffEntities, logActivity, USER_LOG_FIELDS } from "../utils/activityLog.js";
import { callEdgeFunction } from "../lib/supabaseClient.js";
import {
  Btn, Field, inputStyle, Badge, SectionTitle, EmptyState, ConfirmDialog,
} from "./atoms.jsx";
import { EleveDetailView, ProfilModal } from "./profileShared.jsx";

// Page "Gestion des profils" : liste des élèves, création/modification via
// ProfilModal, fiche détaillée via EleveDetailView.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function GestionProfils({ users, setUsers, questionnaires, questions, categories, isAdmin, currentUser, onPrint }) {
  const { t, lang } = useLang();
  const [modal, setModal] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [search, setSearch] = useState("");
  const [viewingEleve, setViewingEleve] = useState(null);
  const [error, setError] = useState("");
  const auteurLog = currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "Système";
  const eleves = users.filter(u => u.role === "eleve" && `${u.prenom} ${u.nom} ${u.numeroAgent}`.toLowerCase().includes(search.toLowerCase()));
  const save = async (data) => {
    setError("");
    const pseudo = makePseudo(data.nom, data.prenom, users, data.id);
    const before = data.id ? users.find(u => u.id === data.id) : null;
    try {
      if (data.id) {
        await callEdgeFunction("manage-user", { action: "update", userId: data.id, pseudo, nom: data.nom, prenom: data.prenom, numeroAgent: data.numeroAgent, fonction: data.fonction, langue: data.langue || "fr", team: data.team, responsableTeam: data.responsableTeam, email: data.email || null });
        logActivity("Profil", diffEntities([before], [{ ...before, ...data, pseudo }], u => `${u.prenom} ${u.nom}`, USER_LOG_FIELDS), auteurLog);
      } else {
        await callEdgeFunction("manage-user", { action: "create", pseudo, nom: data.nom, prenom: data.prenom, numeroAgent: data.numeroAgent, role: "eleve", fonction: data.fonction, langue: data.langue || "fr", team: data.team, responsableTeam: data.responsableTeam, email: data.email || null });
        logActivity("Profil", [{ action: "creation", description: `${data.prenom} ${data.nom}` }], auteurLog);
      }
      await setUsers();
      setModal(null);
    } catch (e) { setError(e.message || t("erreur_enregistrement")); }
  };
  const remove = async (id) => {
    setError("");
    const target = users.find(u => u.id === id);
    try {
      await callEdgeFunction("manage-user", { action: "delete", userId: id });
      logActivity("Profil", [{ action: "suppression", description: target ? `${target.prenom} ${target.nom}` : id }], auteurLog);
      await setUsers();
    }
    catch (e) { setError(e.message || t("erreur_suppression")); }
  };
  const confirmTarget = eleves.find(e => e.id === confirmId);

  if (viewingEleve) {
    const fresh = users.find(u => u.id === viewingEleve.id) || viewingEleve;
    return <EleveDetailView eleve={fresh} questionnaires={questionnaires} categories={categories} onBack={() => setViewingEleve(null)} />;
  }

  return (
    <div>
      {error && <div style={{ background: C.redSoft, color: C.red, fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>{t("nav_profiles")}</SectionTitle>
        <Btn variant="primary" icon={Plus} onClick={() => setModal({})}>{t("ajouter_eleve")}</Btn>
      </div>
      <div style={{ position: "relative", marginBottom: 16, maxWidth: 320 }}>
        <Search size={15} style={{ position: "absolute", left: 11, top: 11, color: C.inkSoft }} />
        <input style={{ ...inputStyle, paddingLeft: 34 }} placeholder={t("rechercher_eleve")} value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead><tr style={{ background: C.bg, textAlign: "left" }}>{[t("col_eleve"), t("col_fonction"), t("col_team"), t("col_langue"), t("agent_number"), t("col_identifiant"), t("col_questionnaires"), ""].map(h => <th key={h} style={{ padding: "10px 16px", fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", fontWeight: 700 }}>{h}</th>)}</tr></thead>
          <tbody>
            {eleves.map(e => (
              <tr key={e.id} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ padding: "12px 16px" }}>
                  <button onClick={() => setViewingEleve(e)} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit", color: C.navy, textAlign: "left" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: FONT_DISPLAY, flexShrink: 0 }}>{initials(e.prenom, e.nom)}</div>
                    <span style={{ textDecoration: "underline", textDecorationColor: C.line }}>{e.prenom} {e.nom}</span>
                  </button>
                </td>
                <td style={{ padding: "12px 16px" }}><Badge {...fonctionColor(e.fonction)}>{fonctionLabel(e.fonction, lang) || t("role_eleve")}</Badge></td>
                <td style={{ padding: "12px 16px", fontSize: 12.5, color: e.team ? C.ink : C.inkSoft }}>{e.team || "—"}</td>
                <td style={{ padding: "12px 16px", fontSize: 12.5, color: C.inkSoft }}>{LANGS[e.langue || "fr"]}</td>
                <td style={{ padding: "12px 16px", fontFamily: FONT_MONO, fontSize: 12.5 }}>{e.numeroAgent}</td>
                <td style={{ padding: "12px 16px", color: C.inkSoft, fontFamily: FONT_MONO, fontSize: 12.5 }}>{e.pseudo}</td>
                <td style={{ padding: "12px 16px" }}>{questionnaires.filter(q => q.eleveId === e.id).length}</td>
                <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                  <Btn variant="subtle" icon={Eye} onClick={() => setViewingEleve(e)} style={{ padding: "6px 10px", marginRight: 6 }} />
                  <Btn variant="subtle" icon={FileDown} onClick={() => onPrint(e)} style={{ padding: "6px 10px", marginRight: 6 }} />
                  <Btn variant="subtle" icon={Edit2} onClick={() => setModal(e)} style={{ padding: "6px 10px", marginRight: 6 }} />
                  {isAdmin && <Btn variant="danger" icon={Trash2} onClick={() => setConfirmId(e.id)} style={{ padding: "6px 10px" }} />}
                </td>
              </tr>
            ))}
            {eleves.length === 0 && <tr><td colSpan={8}><EmptyState icon={Users} title={t("aucun_eleve_titre")} body={t("aucun_eleve_body")} /></td></tr>}
          </tbody>
        </table>
      </div>
      {modal !== null && <ProfilModal initial={modal} users={users} isAdmin={isAdmin} onClose={() => setModal(null)} onSave={save} />}
      {confirmTarget && (
        <ConfirmDialog title={t("supprimer_profil_titre")} message={t("supprimer_profil_msg", { nom: `${confirmTarget.prenom} ${confirmTarget.nom}` })}
          onConfirm={() => { remove(confirmId); setConfirmId(null); }} onCancel={() => setConfirmId(null)} />
      )}
    </div>
  );
}
