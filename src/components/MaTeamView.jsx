import { useState } from "react";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip,
} from "recharts";
import { CheckSquare, ClipboardList, Edit2, ExternalLink, Eye, FileDown, Square, Trash2, Users } from "lucide-react";
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { fonctionColor, fonctionLabel } from "../data/fonctions.js";
import { callEdgeFunction } from "../lib/supabaseClient.js";
import { makePseudo } from "../utils/userAccount.js";
import { initials, computeCategoryStats } from "../utils/scoring.js";
import { Btn, inputStyle, Badge, SectionTitle, EmptyState, ConfirmDialog, StatCard } from "./atoms.jsx";
import { EleveDetailView, ProfilModal } from "./profileShared.jsx";
import { AnalysisView } from "./GestionQuestionnaires.jsx";

// Vue "Ma Team" : réservée aux responsables d'équipe, mêmes fonctionnalités
// que la gestion des profils mais limitées aux opérateurs de leur team.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function MaTeamView({ currentUser, users, setUsers, questionnaires, questions, categories, requestPrint }) {
  const { t, lang } = useLang();
  const [viewingEleve, setViewingEleve] = useState(null);
  const [viewingQn, setViewingQn] = useState(null);
  const [modal, setModal] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const team = currentUser.responsableTeam;
  const operators = users.filter(u => u.role === "eleve" && u.team === team);
  const operatorIds = new Set(operators.map(o => o.id));
  const teamQuestionnaires = questionnaires.filter(qn => operatorIds.has(qn.eleveId));
  const [histFilter, setHistFilter] = useState("");
  const [selected, setSelected] = useState(new Set());
  const graded = teamQuestionnaires.filter(qn => qn.statut === "validé" && !qn.supprime).sort((a, b) => (b.dateValidation || "").localeCompare(a.dateValidation || ""));
  const gradedFiltered = graded.filter(qn => !histFilter || qn.eleveId === histFilter);
  const toggleSelect = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const exportSelection = () => {
    const items = gradedFiltered.filter(qn => selected.has(qn.id)).map(qn => ({ questionnaire: qn, eleve: users.find(u => u.id === qn.eleveId) }));
    if (items.length) requestPrint({ type: "questionnaires", items, questions, categories });
  };
  const catStats = computeCategoryStats(graded, categories);
  const radarData = categories.map(cat => ({ categorie: cat, score: catStats[cat]?.total ? Math.round((catStats[cat].correct / catStats[cat].total) * 100) : 0 }));
  const [error, setError] = useState("");
  const save = async (data) => {
    setError("");
    const pseudo = makePseudo(data.nom, data.prenom, users, data.id);
    try {
      await callEdgeFunction("manage-user", { action: "update", userId: data.id, pseudo, nom: data.nom, prenom: data.prenom, numeroAgent: data.numeroAgent, fonction: data.fonction, langue: data.langue || "fr", team: data.team });
      await setUsers();
      setModal(null);
    } catch (e) { setError(e.message || t("erreur_enregistrement")); }
  };
  const remove = async (id) => {
    setError("");
    try { await callEdgeFunction("manage-user", { action: "delete", userId: id }); await setUsers(); }
    catch (e) { setError(e.message || t("erreur_suppression")); }
  };
  const confirmTarget = operators.find(o => o.id === confirmId);

  if (viewingEleve) {
    const fresh = users.find(u => u.id === viewingEleve.id) || viewingEleve;
    return <EleveDetailView eleve={fresh} questionnaires={questionnaires} categories={categories} onBack={() => setViewingEleve(null)} />;
  }
  if (viewingQn) {
    return <AnalysisView questionnaire={viewingQn} eleve={users.find(u => u.id === viewingQn.eleveId)} questions={questions} categories={categories} onClose={() => setViewingQn(null)} readOnly onValidate={() => {}} />;
  }

  return (
    <div>
      {error && <div style={{ background: C.redSoft, color: C.red, fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: C.navy }}>{t("ma_team_titre", { team })}</div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 2 }}>{operators.length} {t("stat_operateurs").toLowerCase()}</div>
        </div>
        <Btn variant="gold" icon={FileDown} onClick={() => requestPrint({ type: "team", team, operators, questionnaires, questions, categories })} disabled={operators.length === 0}>{t("exporter_team")}</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard label={t("stat_operateurs")} value={operators.length} />
        <StatCard label={t("qn_valides_label")} value={graded.length} />
        <StatCard label={t("en_attente_encours")} value={teamQuestionnaires.length - graded.length} />
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <SectionTitle>{t("resultats_globaux_categorie")}</SectionTitle>
        {graded.length === 0 ? <EmptyState icon={ClipboardList} title={t("no_results_title")} body={t("pas_encore_resultats_team")} /> : (
          <div style={{ height: 300, marginTop: 10 }}>
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

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <SectionTitle>{t("operateurs_team_titre")}</SectionTitle>
        {operators.length === 0 ? <EmptyState icon={Users} title={t("aucun_operateur_titre")} body={t("aucun_operateur_body")} /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {operators.map(o => (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 14px" }}>
                <button onClick={() => setViewingEleve(o)} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit", flex: 1, textAlign: "left" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: FONT_DISPLAY, flexShrink: 0 }}>{initials(o.prenom, o.nom)}</div>
                  <span style={{ fontSize: 13.5, color: C.navy, fontWeight: 600, textDecoration: "underline", textDecorationColor: C.line }}>{o.prenom} {o.nom}</span>
                  <Badge {...fonctionColor(o.fonction)}>{fonctionLabel(o.fonction, lang) || t("role_eleve")}</Badge>
                </button>
                <Btn variant="subtle" icon={Eye} onClick={() => setViewingEleve(o)} style={{ padding: "6px 10px" }} />
                <Btn variant="subtle" icon={FileDown} onClick={() => requestPrint({ type: "profile", eleve: o, questionnaires, categories })} style={{ padding: "6px 10px" }} />
                <Btn variant="subtle" icon={Edit2} onClick={() => setModal(o)} style={{ padding: "6px 10px" }} />
                <Btn variant="danger" icon={Trash2} onClick={() => setConfirmId(o.id)} style={{ padding: "6px 10px" }} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
          <SectionTitle>{t("qn_valides_team_titre")}</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {selected.size > 0 && <Btn variant="gold" icon={FileDown} onClick={exportSelection}>{t("exporter_selection", { n: selected.size })}</Btn>}
            <select style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: 12.5 }} value={histFilter} onChange={e => setHistFilter(e.target.value)}>
              <option value="">{t("tous_les_operateurs")}</option>
              {operators.map(o => <option key={o.id} value={o.id}>{o.prenom} {o.nom}</option>)}
            </select>
          </div>
        </div>
        {gradedFiltered.length === 0 ? <EmptyState icon={ClipboardList} title={t("aucun_qn_valide_team_titre")} body={t("aucun_qn_valide_team_body")} /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {gradedFiltered.map(qn => { const e = users.find(u => u.id === qn.eleveId); return (
              <div key={qn.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${selected.has(qn.id) ? C.gold : C.line}`, borderRadius: 10, padding: "10px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => toggleSelect(qn.id)} style={{ background: "none", border: "none", cursor: "pointer", color: selected.has(qn.id) ? C.gold : C.inkSoft, display: "flex" }}>{selected.has(qn.id) ? <CheckSquare size={17} /> : <Square size={17} />}</button>
                  <span style={{ fontSize: 13 }}>{qn.titre} — {e?.prenom} {e?.nom} <span style={{ color: C.inkSoft }}>· {qn.dateAttribution}</span></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {qn.scoreGlobal != null && <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 600 }}>{qn.scoreGlobal}%</span>}
                  <Btn variant="subtle" icon={ExternalLink} onClick={() => setViewingQn(qn)} style={{ padding: "5px 10px", fontSize: 12 }}>{t("voir_btn")}</Btn>
                </div>
              </div>
            ); })}
          </div>
        )}
      </div>
      {modal !== null && <ProfilModal initial={modal} users={users} isAdmin onClose={() => setModal(null)} onSave={save} />}
      {confirmTarget && (
        <ConfirmDialog title={t("supprimer_profil_titre")} message={t("supprimer_profil_msg", { nom: `${confirmTarget.prenom} ${confirmTarget.nom}` })}
          onConfirm={() => { remove(confirmId); setConfirmId(null); }} onCancel={() => setConfirmId(null)} />
      )}
    </div>
  );
}
