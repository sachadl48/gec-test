import { useState, useEffect } from "react";
import { ClipboardList, Edit2, Plus, Trash2 } from "lucide-react";
import { C, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { TEAMS } from "../data/fonctions.js";
import { supabase, callEdgeFunction } from "../lib/supabaseClient.js";
import { makePseudo, agentPassword } from "../utils/userAccount.js";
import { diffEntities, logActivity, USER_LOG_FIELDS } from "../utils/activityLog.js";
import { Btn, Field, inputStyle, Badge, Modal, SectionTitle, EmptyState, ConfirmDialog } from "./atoms.jsx";

// Page Admin (journal d'activité + zone dangereuse) et gestion des comptes
// staff (moniteurs/admins), avec la fenêtre de création/modification.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function AdminPage({ refreshQuestionnaires }) {
  const { t } = useLang();
  const [confirmResetQn, setConfirmResetQn] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loadingLog, setLoadingLog] = useState(true);
  const [resetError, setResetError] = useState("");
  const [nbQuestionnaires, setNbQuestionnaires] = useState(null);
  const [pageSize, setPageSize] = useState(20);

  const fetchLogPage = async (p, size) => {
    const s = size ?? pageSize;
    const from = s === "tout" ? 0 : p * s;
    const to = s === "tout" ? 99999 : from + s - 1;
    const { data, count } = await supabase.from("activity_log").select("*", { count: "exact" }).order("date", { ascending: false }).range(from, to);
    setActivityLog(prev => p === 0 ? (data || []) : [...prev, ...(data || [])]);
    setTotal(count || 0);
    setLoadingLog(false);
  };
  const fetchCounts = async () => {
    const { count } = await supabase.from("questionnaires").select("*", { count: "exact", head: true });
    setNbQuestionnaires(count || 0);
  };
  useEffect(() => { setPage(0); setLoadingLog(true); fetchLogPage(0, pageSize); fetchCounts(); }, [pageSize]);
  const loadMore = () => { const next = page + 1; setPage(next); fetchLogPage(next); };

  const doReset = async (rpcName, onDone) => {
    setResetError("");
    try {
      const { error } = await supabase.rpc(rpcName);
      if (error) throw error;
      await onDone();
      await fetchCounts();
    } catch (e) { setResetError(e?.message || "Erreur inconnue."); }
  };

  const ACTION_STYLE = {
    creation: { label: t("log_creation"), color: C.green, bg: C.greenSoft },
    modification: { label: t("log_modification"), color: C.gold, bg: C.goldSoft },
    suppression: { label: t("log_suppression"), color: C.red, bg: C.redSoft },
  };

  return (
    <div>
      <SectionTitle>{t("nav_admin_page")}</SectionTitle>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4, marginBottom: 24 }}>{t("admin_page_sub")}</div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <SectionTitle>{t("journal_activite_titre")}</SectionTitle>
        <select style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: 12.5 }} value={pageSize} onChange={e => setPageSize(e.target.value === "tout" ? "tout" : Number(e.target.value))}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value="tout">{t("tout_afficher")}</option>
        </select>
      </div>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4, marginBottom: 16 }}>{t("journal_activite_sub", { n: total })}</div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ background: C.bg, textAlign: "left" }}>{[t("log_date"), t("log_auteur"), t("log_entite"), t("log_action"), t("log_description")].map(h => <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", fontWeight: 700 }}>{h}</th>)}</tr></thead>
          <tbody>
            {activityLog.map(entry => {
              const st = ACTION_STYLE[entry.action] || ACTION_STYLE.modification;
              const d = new Date(entry.date);
              return (
                <tr key={entry.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td style={{ padding: "10px 16px", fontFamily: FONT_MONO, fontSize: 12, color: C.inkSoft, whiteSpace: "nowrap" }}>{d.toLocaleDateString("fr-BE")} {d.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td style={{ padding: "10px 16px" }}>{entry.auteur}</td>
                  <td style={{ padding: "10px 16px", color: C.inkSoft }}>{entry.entite}</td>
                  <td style={{ padding: "10px 16px" }}><Badge color={st.color} bg={st.bg}>{st.label}</Badge></td>
                  <td style={{ padding: "10px 16px", color: C.inkSoft }}>{entry.description}</td>
                </tr>
              );
            })}
            {!loadingLog && activityLog.length === 0 && <tr><td colSpan={5}><EmptyState icon={ClipboardList} title={t("journal_vide_titre")} body={t("journal_vide_body")} /></td></tr>}
          </tbody>
        </table>
      </div>
      {total > activityLog.length && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <Btn variant="ghost" onClick={loadMore}>{t("charger_plus_btn", { n: total - activityLog.length })}</Btn>
        </div>
      )}
      {total <= activityLog.length && <div style={{ marginBottom: 32 }} />}

      <SectionTitle>{t("zone_dangereuse_titre")}</SectionTitle>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4, marginBottom: 16 }}>{t("zone_dangereuse_carnet_note")}</div>
      {resetError && <div style={{ background: C.redSoft, color: C.red, fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>{resetError}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "#fff", border: `1px solid ${C.red}40`, borderRadius: 12, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: 3 }}>{t("reset_questionnaires_titre")}</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft }}>{t("reset_questionnaires_msg", { n: nbQuestionnaires ?? "…" })}</div>
          </div>
          <Btn variant="danger" icon={Trash2} onClick={() => setConfirmResetQn(true)} disabled={!nbQuestionnaires}>{t("reset_btn")}</Btn>
        </div>
      </div>

      {confirmResetQn && (
        <ConfirmDialog title={t("reset_questionnaires_titre")} message={t("reset_questionnaires_confirm_msg", { n: nbQuestionnaires })}
          confirmLabel={t("reset_btn")} onConfirm={async () => { await doReset("reset_questionnaire_history", refreshQuestionnaires); setConfirmResetQn(false); }} onCancel={() => setConfirmResetQn(false)} />
      )}
    </div>
  );
}
export function GestionComptes({ users, setUsers, currentUser }) {
  const { t } = useLang();
  const [modal, setModal] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [error, setError] = useState("");
  const moniteurs = users.filter(u => u.role === "moniteur" || u.role === "admin");
  const auteurLog = currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "Système";
  const save = async (data) => {
    setError("");
    const pseudo = makePseudo(data.nom, data.prenom, users, data.id);
    const before = data.id ? users.find(u => u.id === data.id) : null;
    try {
      if (data.id) {
        await callEdgeFunction("manage-user", { action: "update", userId: data.id, pseudo, nom: data.nom, prenom: data.prenom, numeroAgent: data.numeroAgent, langue: data.langue || "fr", responsableTeam: data.role === "admin" ? data.responsableTeam : "", superAdmin: data.role === "admin" ? !!data.superAdmin : false, adminTitre: data.role === "admin" ? data.adminTitre || null : null, email: data.email || null });
        logActivity("Profil", diffEntities([before], [{ ...before, ...data, pseudo }], u => `${u.prenom} ${u.nom}`, USER_LOG_FIELDS), auteurLog);
      } else {
        await callEdgeFunction("manage-user", { action: "create", pseudo, nom: data.nom, prenom: data.prenom, numeroAgent: data.numeroAgent, role: data.role, langue: data.langue || "fr", responsableTeam: data.role === "admin" ? data.responsableTeam : "", superAdmin: data.role === "admin" ? !!data.superAdmin : false, adminTitre: data.role === "admin" ? data.adminTitre || null : null, email: data.email || null });
        logActivity("Profil", [{ action: "creation", description: `${data.prenom} ${data.nom}` }], auteurLog);
      }
      await setUsers();
      setModal(null);
    } catch (e) { setError(e.message || t("erreur_enregistrement")); }
  };
  const remove = async (id) => {
    if (id === currentUser.id) return;
    setError("");
    const target = users.find(u => u.id === id);
    try {
      await callEdgeFunction("manage-user", { action: "delete", userId: id });
      logActivity("Profil", [{ action: "suppression", description: target ? `${target.prenom} ${target.nom}` : id }], auteurLog);
      await setUsers();
    }
    catch (e) { setError(e.message || t("erreur_suppression")); }
  };
  const confirmTarget = moniteurs.find(m => m.id === confirmId);
  return (
    <div>
      {error && <div style={{ background: C.redSoft, color: C.red, fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>{t("comptes_titre")}</SectionTitle>
        <Btn variant="primary" icon={Plus} onClick={() => setModal({ role: "moniteur" })}>{t("ajouter_compte")}</Btn>
      </div>
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead><tr style={{ background: C.bg, textAlign: "left" }}>{[t("col_nom"), t("col_role"), t("responsable_team_label"), t("agent_number"), t("col_identifiant"), ""].map(h => <th key={h} style={{ padding: "10px 16px", fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", fontWeight: 700 }}>{h}</th>)}</tr></thead>
          <tbody>
            {moniteurs.map(m => (
              <tr key={m.id} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ padding: "12px 16px" }}>{m.prenom} {m.nom}</td>
                <td style={{ padding: "12px 16px" }}><Badge color={m.adminTitre ? C.rose : m.superAdmin ? C.red : m.role === "admin" ? C.gold : C.teal} bg={m.adminTitre ? C.roseSoft : m.superAdmin ? C.redSoft : m.role === "admin" ? C.goldSoft : C.tealSoft}>{m.adminTitre === "gunmen" ? "Gunmen" : m.adminTitre === "business_dev" ? "Business Dev" : m.superAdmin ? "Admin +" : m.role === "admin" ? t("role_admin") : t("role_moniteur")}</Badge></td>
                <td style={{ padding: "12px 16px", fontSize: 12.5, color: m.responsableTeam ? C.ink : C.inkSoft }}>{m.responsableTeam || "—"}</td>
                <td style={{ padding: "12px 16px", fontFamily: FONT_MONO, fontSize: 12.5 }}>{m.numeroAgent}</td>
                <td style={{ padding: "12px 16px", color: C.inkSoft, fontFamily: FONT_MONO, fontSize: 12.5 }}>{m.pseudo}</td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}><Btn variant="subtle" icon={Edit2} onClick={() => setModal(m)} style={{ padding: "6px 10px", marginRight: 6 }} /><Btn variant="danger" icon={Trash2} onClick={() => setConfirmId(m.id)} style={{ padding: "6px 10px" }} disabled={m.id === currentUser.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal !== null && <CompteModal initial={modal} users={users} canGrantSuperAdmin={currentUser.superAdmin === true} onClose={() => setModal(null)} onSave={save} />}
      {confirmTarget && (
        <ConfirmDialog title={t("supprimer_compte_titre")} message={t("supprimer_compte_msg", { nom: `${confirmTarget.prenom} ${confirmTarget.nom}` })} onConfirm={() => { remove(confirmId); setConfirmId(null); }} onCancel={() => setConfirmId(null)} />
      )}
    </div>
  );
}
export function CompteModal({ initial, users, canGrantSuperAdmin, onClose, onSave }) {
  const { t } = useLang();
  const [form, setForm] = useState({ nom: initial.nom || "", prenom: initial.prenom || "", numeroAgent: initial.numeroAgent || "", role: initial.role || "moniteur", langue: initial.langue || "fr", responsableTeam: initial.responsableTeam || "", superAdmin: initial.superAdmin || false, adminTitre: initial.adminTitre || "", email: initial.email || "", id: initial.id });
  const pseudoPreview = makePseudo(form.nom, form.prenom, users, initial.id) || "—";
  return (
    <Modal title={initial.id ? t("modifier_compte") : t("ajouter_compte")} onClose={onClose}>
      <Field label={t("prenom_label")}><input style={inputStyle} value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} /></Field>
      <Field label={t("nom_label")}><input style={inputStyle} value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></Field>
      <Field label={t("col_role")}><select style={inputStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value, responsableTeam: e.target.value === "admin" ? form.responsableTeam : "", superAdmin: e.target.value === "admin" ? form.superAdmin : false, adminTitre: e.target.value === "admin" ? form.adminTitre : "" })}><option value="moniteur">{t("role_moniteur")}</option><option value="admin">{t("administrateur_option")}</option></select></Field>
      <Field label={t("numero_agent_label")}><input style={inputStyle} value={form.numeroAgent} onChange={e => setForm({ ...form, numeroAgent: e.target.value })} /></Field>
      <Field label={t("role_linguistique_label")} hint={t("role_linguistique_hint")}>
        <select style={inputStyle} value={form.langue} onChange={e => setForm({ ...form, langue: e.target.value })}>
          <option value="fr">Français</option>
          <option value="nl">Nederlands</option>
        </select>
      </Field>
      <Field label={t("email_label")} hint={t("email_hint")}>
        <input type="email" style={inputStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="prenom.nom@exemple.be" />
      </Field>
      {form.role === "admin" && (
        <Field label={t("responsable_team_label")} hint={t("responsable_team_hint")}>
          <select style={inputStyle} value={form.responsableTeam} onChange={e => setForm({ ...form, responsableTeam: e.target.value })}>
            <option value="">{t("team_aucune")}</option>
            {TEAMS.map(tm => <option key={tm} value={tm}>{tm}</option>)}
          </select>
        </Field>
      )}
      {form.role === "admin" && (
        <Field label={t("titre_admin_label")}>
          <select style={inputStyle} value={form.adminTitre} onChange={e => setForm({ ...form, adminTitre: e.target.value })}>
            <option value="">{t("titre_admin_standard")}</option>
            <option value="gunmen">Gunmen</option>
            <option value="business_dev">Business Dev</option>
          </select>
        </Field>
      )}
      {form.role === "admin" && canGrantSuperAdmin && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 16, cursor: "pointer" }}>
          <input type="checkbox" checked={form.superAdmin} onChange={e => setForm({ ...form, superAdmin: e.target.checked })} />
          {t("admin_plus_label")}
        </label>
      )}
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
