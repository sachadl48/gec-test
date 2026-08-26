import { useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, CartesianGrid, XAxis, YAxis, Line, Legend, Tooltip,
} from "recharts";
import {
  ArrowUpDown, Ban, BookCheck, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Eye,
  FileDown, HelpCircle, Lock, Plus, Search, Trash2, Undo2, X, XCircle,
} from "lucide-react";
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "../theme.js";
import { useLang, LANGS } from "../lang.jsx";
import { fonctionColor, fonctionLabel } from "../data/fonctions.js";
import { COTATION_SCALE, VOLET_CLUSTERS_REGULATEUR, VOLET_CLUSTERS_DISPATCHEUR, EVOLUTION_GRAPHS, EVOLUTION_COLORS, POSTES_REGULATEUR, POSTES_DISPATCHEUR } from "../data/carnetDisplay.js";
import { VOLETS_REGULATEUR, VOLETS_DISPATCHEUR } from "../data/competences.js";
import { supabase } from "../lib/supabaseClient.js";
import { initials, statutNoteObligatoire } from "../utils/scoring.js";
import { getCompetenceGlobale, getCritereValeur, computeRadarCarnet, computeEvolutionCarnet } from "../utils/carnetKeys.js";
import { exportCarnetExcel } from "../utils/excelExport.js";
import { logActivity } from "../utils/activityLog.js";
import { NotesObligatoires } from "./NotesObligatoires.jsx";
import { CarPassTab } from "./CarPass.jsx";
import {
  Btn, Field, inputStyle, Badge, Modal, EmptyState, ConfirmDialog, SectionTitle, pillStyle, DebouncedTextarea,
} from "./atoms.jsx";
import { EleveDetailView } from "./profileShared.jsx";

// Tout le système du carnet de formation : zone de texte à sauvegarde
// différée, détail d'un jour (notation par compétence, verrouillage par
// moniteur), vue d'ensemble d'un élève (grille des jours + graphiques), et
// la liste "Gestion des carnets" côté staff.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

function makeJours(n, startAt = 1) {
  return Array.from({ length: n }, (_, i) => ({
    numero: startAt + i, statut: i === 0 ? "disponible" : "verrouille",
    date: null, moniteurNom: null, moniteurComplet: null, poste: null, ouvertParId: null, ouvertAt: null,
    commentaireHumain: "", commentaireTechnique: "", incidentsRencontres: "", resumeSemaine: "", competencesGlobales: {}, criteres: {}, feedbackDuty: null,
  }));
}
function formatDateJour(d) { const dd = String(d.getDate()).padStart(2, "0"); const mm = String(d.getMonth() + 1).padStart(2, "0"); return `${dd}/${mm}/${d.getFullYear()}`; }

// Zone de texte à état local + sauvegarde différée (600ms après la dernière
// frappe, ou immédiatement en quittant le champ). Sans ça, chaque caractère
// tapé déclenchait une écriture réseau vers Supabase ; en tapant vite, des
// réponses pouvaient arriver dans le désordre et faire "reculer" le texte
// affiché, donnant l'impression de lettres perdues.
export function CarnetJourDetail({ jourData, editable, currentUser, volets, track, onUpdateList, onBack }) {
  const { t } = useLang();
  const [confirmFin, setConfirmFin] = useState(false);
  const [confirmAnnuler, setConfirmAnnuler] = useState(false);
  const [openVolet, setOpenVolet] = useState(null);
  const [showAideCotation, setShowAideCotation] = useState(false);
  const started = jourData.statut === "en_cours" || jourData.statut === "termine";
  const finished = jourData.statut === "termine";
  // Rétrocompatibilité : un jour déjà en cours avant l'ajout de cette
  // fonctionnalité n'a pas de "ouvertParId" — dans ce cas, pas de
  // restriction (on ne verrouille pas rétroactivement du travail en cours).
  const isOwner = !jourData.ouvertParId || jourData.ouvertParId === currentUser?.id;
  const heuresEcoulees = jourData.ouvertAt ? (Date.now() - new Date(jourData.ouvertAt).getTime()) / 3600000 : 0;
  const canForceClose = started && !finished && !isOwner && heuresEcoulees >= 8;
  const canFill = editable && started && !finished && isOwner;

  const commencer = () => {
    onUpdateList(jours => jours.map(j => j.numero === jourData.numero ? {
      ...j, statut: "en_cours", date: formatDateJour(new Date()), ouvertAt: new Date().toISOString(), ouvertParId: currentUser?.id || null,
      moniteurNom: currentUser?.nom || "", moniteurComplet: `${currentUser?.prenom || ""} ${currentUser?.nom || ""}`.trim(),
    } : j));
  };
  const finDeJournee = () => {
    onUpdateList(jours => jours.map(j => j.numero === jourData.numero ? { ...j, statut: "termine" } : j));
    setConfirmFin(false);
    onBack();
  };
  const annulerJour = () => {
    onUpdateList(jours => jours.map(j => j.numero === jourData.numero ? {
      ...j, statut: "verrouille", date: null, moniteurNom: null, moniteurComplet: null, poste: null, ouvertParId: null, ouvertAt: null,
      commentaireHumain: "", commentaireTechnique: "", incidentsRencontres: "", resumeSemaine: "",
      competencesGlobales: {}, criteres: {},
    } : j));
    setConfirmAnnuler(false);
    onBack();
  };
  const reouvrirJour = () => {
    onUpdateList(jours => jours.map(j => j.numero === jourData.numero ? { ...j, statut: "en_cours", ouvertParId: currentUser?.id || null, ouvertAt: new Date().toISOString() } : j));
  };
  const setChampTexte = (champ, texte) => {
    onUpdateList(jours => jours.map(j => j.numero === jourData.numero ? { ...j, [champ]: texte } : j));
  };
  const setStatutCritere = (volet, vi, ci, v) => {
    if (!canFill) return;
    const key = `${volet.titre}-${ci}`;
    const actuel = getCritereValeur(jourData, volet, vi, ci);
    onUpdateList(jours => jours.map(j => j.numero === jourData.numero ? { ...j, criteres: { ...j.criteres, [key]: actuel === v ? undefined : v } } : j));
  };
  const setCompetenceGlobale = (volet, vi, v) => {
    if (!canFill) return;
    const actuel = getCompetenceGlobale(jourData, volet, vi);
    onUpdateList(jours => jours.map(j => j.numero === jourData.numero ? { ...j, competencesGlobales: { ...j.competencesGlobales, [volet.titre]: actuel === v ? undefined : v } } : j));
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Btn variant="ghost" onClick={onBack}>{t("retour_btn")}</Btn>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: C.navy }}>{t("carnet_jour_titre", { n: jourData.numero })}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 16px", marginBottom: 18 }}>
        <Btn variant="gold" onClick={commencer} disabled={!editable || started}>{t("commencer_jour_btn")}</Btn>
        <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.inkSoft }}>{jourData.date || ".../.../..."}</span>
        <span style={{ fontSize: 13, color: C.inkSoft }}>{t("moniteur_label")} <strong style={{ color: C.ink }}>{jourData.moniteurComplet || "—"}</strong></span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.inkSoft }}>
          {t("poste_label")}
          <select disabled={!canFill} value={jourData.poste || ""} onChange={e => setChampTexte("poste", e.target.value || null)} style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: 13 }}>
            <option value="">—</option>
            {(track === "dispatcheur" ? POSTES_DISPATCHEUR : POSTES_REGULATEUR).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </span>
        <Btn variant="primary" onClick={() => setConfirmFin(true)} disabled={!editable || !started || finished || (!isOwner && !canForceClose)} style={{ marginLeft: "auto" }}>{t("fin_journee_btn")}</Btn>
        {started && !finished && <Btn variant="danger" icon={Ban} onClick={() => setConfirmAnnuler(true)} disabled={!editable || !isOwner}>{t("annuler_jour_btn")}</Btn>}
        {finished && <Btn variant="ghost" icon={Undo2} onClick={reouvrirJour} disabled={!editable}>{t("reouvrir_jour_btn")}</Btn>}
      </div>

      {started && !finished && !isOwner && (
        <div style={{ background: canForceClose ? C.goldSoft : C.redSoft, color: canForceClose ? C.gold : C.red, fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 8, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
          <Lock size={14} style={{ flexShrink: 0 }} />
          {canForceClose ? t("carnet_verrouille_deblocable", { nom: jourData.moniteurComplet || "?" }) : t("carnet_verrouille_note", { nom: jourData.moniteurComplet || "?" })}
        </div>
      )}

      {!started && <div style={{ background: C.bg, color: C.inkSoft, fontSize: 12.5, padding: "10px 14px", borderRadius: 8, marginBottom: 18 }}>{t("carnet_pas_commence_note")}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 6 }}>{t("commentaire_humain_label")}</div>
            <DebouncedTextarea disabled={!canFill} value={jourData.commentaireHumain} onCommit={v => setChampTexte("commentaireHumain", v)}
              placeholder={t("commentaire_humain_placeholder")}
              style={{ ...inputStyle, minHeight: 80, resize: "vertical", opacity: started ? 1 : 0.6 }} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 6 }}>{t("incidents_rencontres_label")}</div>
            <DebouncedTextarea disabled={!canFill} value={jourData.incidentsRencontres} onCommit={v => setChampTexte("incidentsRencontres", v)}
              placeholder={t("incidents_rencontres_placeholder")}
              style={{ ...inputStyle, minHeight: 80, resize: "vertical", opacity: started ? 1 : 0.6 }} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 6 }}>{t("commentaire_technicite_label")}</div>
          <DebouncedTextarea disabled={!canFill} value={jourData.commentaireTechnique} onCommit={v => setChampTexte("commentaireTechnique", v)}
            placeholder={t("commentaire_technicite_placeholder")}
            style={{ ...inputStyle, minHeight: 80, resize: "vertical", opacity: started ? 1 : 0.6 }} />
        </div>
      </div>

      {jourData.numero % 5 === 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 6 }}>{t("resume_semaine_label")}</div>
          <DebouncedTextarea disabled={!canFill} value={jourData.resumeSemaine} onCommit={v => setChampTexte("resumeSemaine", v)}
            placeholder={t("resume_semaine_placeholder")}
            style={{ ...inputStyle, minHeight: 80, resize: "vertical", opacity: started ? 1 : 0.6, borderColor: C.gold }} />
        </div>
      )}

      <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
        <Btn variant="ghost" icon={HelpCircle} onClick={() => setShowAideCotation(true)}>{t("aide_cotation_btn")}</Btn>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(() => {
          const clusterDefs = track === "dispatcheur" ? VOLET_CLUSTERS_DISPATCHEUR : VOLET_CLUSTERS_REGULATEUR;
          const clusterOfTitle = (titre) => clusterDefs.find(cl => cl.categories.includes(titre));
          const renderCard = (volet, vi) => {
            const isOpen = openVolet === vi;
            const notes = volet.criteres.map((_, ci) => getCritereValeur(jourData, volet, vi, ci)).filter(v => v != null);
            const globalVal = getCompetenceGlobale(jourData, volet, vi);
            return (
              <div key={vi} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", opacity: started ? 1 : 0.6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", gap: 10, flexWrap: "wrap" }}>
                  {volet.criteres.length > 0 ? (
                    <button onClick={() => setOpenVolet(isOpen ? null : vi)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, flex: 1, minWidth: 160, textAlign: "left" }}>
                      {isOpen ? <ChevronUp size={15} color={C.inkSoft} /> : <ChevronDown size={15} color={C.inkSoft} />}
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: C.navy }}>{volet.titre}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: notes.length > 0 ? C.green : C.inkSoft }}>{t("volet_notes_count", { n: notes.length, total: volet.criteres.length })}</span>
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 160 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: C.navy }}>{volet.titre}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {COTATION_SCALE.map(opt => (
                        <button key={opt.value} disabled={!canFill} onClick={() => setCompetenceGlobale(volet, vi, opt.value)} title={opt.desc}
                          style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${globalVal === opt.value ? opt.color : C.line}`, background: globalVal === opt.value ? opt.bg : "#fff", color: globalVal === opt.value ? opt.color : C.inkSoft, fontSize: 13, fontWeight: 700, cursor: canFill ? "pointer" : "not-allowed" }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${C.line}`, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ fontSize: 11, color: C.inkSoft, fontStyle: "italic" }}>{t("volet_criteres_situationnels_note", { n: notes.length, total: volet.criteres.length })}</div>
                    {volet.criteres.map((crit, ci) => {
                      const val = getCritereValeur(jourData, volet, vi, ci);
                      return (
                        <div key={ci}>
                          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6, display: "flex", gap: 6, alignItems: "baseline", flexWrap: "wrap" }}>
                            {crit.type && <span style={{ fontSize: 9.5, fontWeight: 700, color: C.inkSoft, background: C.bg, borderRadius: 5, padding: "1px 6px", flexShrink: 0 }}>{crit.type}</span>}
                            <span>{crit.label}</span>
                          </div>
                          <div style={{ display: "flex", gap: 5 }}>
                            {COTATION_SCALE.map(opt => (
                              <button key={opt.value} disabled={!canFill} onClick={() => setStatutCritere(volet, vi, ci, opt.value)} title={opt.desc}
                                style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${val === opt.value ? opt.color : C.line}`, background: val === opt.value ? opt.bg : "#fff", color: val === opt.value ? opt.color : C.inkSoft, fontSize: 12, fontWeight: 700, cursor: canFill ? "pointer" : "not-allowed" }}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          };

          const elements = [];
          let i = 0;
          while (i < volets.length) {
            const cluster = clusterOfTitle(volets[i].titre);
            if (!cluster) { elements.push(renderCard(volets[i], i)); i++; continue; }
            const group = [];
            let j = i;
            while (j < volets.length && clusterOfTitle(volets[j].titre) === cluster) { group.push(j); j++; }
            elements.push(
              <div key={`cluster-${i}`} style={{ display: "flex", gap: 10 }}>
                <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", background: cluster.color, color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: ".04em", padding: "12px 8px", borderRadius: 9, textAlign: "center", flexShrink: 0 }}>{cluster.label}</div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  {group.map(gi => renderCard(volets[gi], gi))}
                </div>
              </div>
            );
            i = j;
          }
          return elements;
        })()}
      </div>
      {confirmFin && (
        <ConfirmDialog tone="success" title={t("fin_journee_btn")} message={t("confirm_fin_journee_msg", { n: jourData.numero })}
          confirmLabel={t("fin_journee_btn")} onConfirm={finDeJournee} onCancel={() => setConfirmFin(false)} />
      )}
      {confirmAnnuler && (
        <ConfirmDialog title={t("annuler_jour_btn")} message={t("confirm_annuler_jour_msg", { n: jourData.numero })}
          confirmLabel={t("annuler_jour_btn")} onConfirm={annulerJour} onCancel={() => setConfirmAnnuler(false)} />
      )}
      {showAideCotation && (
        <Modal title={t("aide_cotation_titre")} onClose={() => setShowAideCotation(false)} width={480}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {COTATION_SCALE.map(opt => (
              <div key={opt.value} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10, background: opt.bg }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#fff", color: opt.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{opt.label}</div>
                <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.4 }}>{opt.descComplete}</div>
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

// Affichage (lecture seule) du statut des notes obligatoires d'un élève,
// pour la filière du carnet en cours de consultation. Le statut se déduit
// directement de la table questionnaires (dernier questionnaire lié à
// chaque note, via note_id) — aucune table de suivi séparée n'est
// nécessaire, on réutilise ce qui existe déjà.
function NotesCarnetSection({ eleve, filiere, questionnaires, categoryConfig }) {
  const { t } = useLang();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase.from("notes_obligatoires").select("*").eq("filiere", filiere).order("ordre", { ascending: true })
      .then(({ data }) => { if (!cancelled) { setNotes(data || []); setLoading(false); } });
    return () => { cancelled = true; };
  }, [filiere]);

  if (loading) return null;
  if (notes.length === 0) return null;

  const statutNote = (note) => statutNoteObligatoire(note, questionnaires, eleve.id, categoryConfig).statut;

  return (
    <div style={{ marginTop: 24 }}>
      <SectionTitle>{t("notes_obligatoires_titre")}</SectionTitle>
      <div style={{ height: 8 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {notes.map(note => {
          const statut = statutNote(note);
          const bg = statut === true ? C.greenSoft : statut === false ? C.redSoft : "#fff";
          const border = statut === true ? C.green : statut === false ? C.red : C.line;
          const color = statut === true ? C.green : statut === false ? C.red : C.inkSoft;
          return (
            <div key={note.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: bg, border: `1px solid ${border}`, borderRadius: 10 }}>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: C.ink }}>{note.titre}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color }}>
                {statut === true ? t("note_statut_reussie") : statut === false ? t("note_statut_a_relire") : t("note_statut_a_faire")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CarnetPersonnel({ eleve, users, setUsers, questionnaires, categoryConfig, currentUser, onBack }) {
  const { t, lang } = useLang();
  const isSuperAdmin = currentUser?.superAdmin === true;
  const isAdmin = currentUser?.role === "admin";
  // CarPass SYREM : modifiable uniquement par les Gunmen et les Admin +
  // (voir la conversation avec Sacha) — tout le monde d'autre le consulte
  // en lecture seule, quel que soit son rôle par ailleurs.
  const canEditCarpass = isAdmin && (isSuperAdmin || currentUser?.adminTitre === "gunmen");
  const [confirmResetTab, setConfirmResetTab] = useState(false);
  const tab2Visible = eleve.fonction === "Élève dispatcheur" || eleve.fonction === "Dispatcheur";
  const tab1Editable = eleve.fonction === "Élève régulateur";
  const tab2Editable = eleve.fonction === "Élève dispatcheur";
  const defaultTab = (eleve.fonction === "Élève dispatcheur" || eleve.fonction === "Dispatcheur") ? "dispatcheur" : "regulateur";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [activeSubTab, setActiveSubTab] = useState("jours");
  const [viewingJour, setViewingJour] = useState(null); // { section: "reg"|"regSolo"|"disp", numero }
  const [viewingFeedback, setViewingFeedback] = useState(null); // { section, numero } — numero = dernier jour du bloc de 5
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const showingTab2 = activeTab === "dispatcheur" && tab2Visible;
  const editable = showingTab2 ? tab2Editable : tab1Editable;

  const carnet = eleve.carnet || {};
  const joursReg = carnet.reg || makeJours(35, 1);
  const joursRegSolo = carnet.regSolo || makeJours(10, 1);
  const joursDisp = carnet.disp || makeJours(35, 1);
  const examen35Reussi = !!carnet.examen35;

  // Toute modification passe par ici : ça met à jour le profil de l'élève
  // dans la liste globale (setUsers), donc ça survit à une sortie du carnet.
  const [carnetError, setCarnetError] = useState("");
  const updateCarnet = async (patch) => {
    setCarnetError("");
    const newCarnet = { ...(eleve.carnet || {}), ...patch };
    try {
      const { error: err } = await supabase.from("profiles").update({ carnet: newCarnet }).eq("id", eleve.id);
      if (err) throw err;
      await setUsers();
    } catch (e) { setCarnetError(e?.message || "Erreur inconnue."); }
  };
  const listSetters = {
    reg: (updater) => updateCarnet({ reg: typeof updater === "function" ? updater(joursReg) : updater }),
    regSolo: (updater) => updateCarnet({ regSolo: typeof updater === "function" ? updater(joursRegSolo) : updater }),
    disp: (updater) => updateCarnet({ disp: typeof updater === "function" ? updater(joursDisp) : updater }),
  };
  const sections = { reg: [joursReg, listSetters.reg], regSolo: [joursRegSolo, listSetters.regSolo], disp: [joursDisp, listSetters.disp] };

  if (viewingJour) {
    const [list, setList] = sections[viewingJour.section];
    const jourData = list.find(j => j.numero === viewingJour.numero);
    const volets = viewingJour.section === "disp" ? VOLETS_DISPATCHEUR : VOLETS_REGULATEUR;
    const track = viewingJour.section === "disp" ? "dispatcheur" : "regulateur";
    return <CarnetJourDetail jourData={jourData} editable={editable} currentUser={currentUser} volets={volets} track={track} onUpdateList={setList} onBack={() => setViewingJour(null)} />;
  }

  const openFeedback = (section, numero, jour) => {
    setViewingFeedback({ section, numero });
    setFeedbackDraft(jour.feedbackDuty?.texte || "");
  };
  const saveFeedback = () => {
    const { section, numero } = viewingFeedback;
    const [, setList] = sections[section];
    const now = new Date();
    setList(list => list.map(j => j.numero === numero ? {
      ...j, feedbackDuty: { texte: feedbackDraft, adminId: currentUser.id, adminNom: `${currentUser.prenom} ${currentUser.nom}`, date: formatDateJour(now) },
    } : j));
    setViewingFeedback(null);
  };

  const renderGrid = (section) => {
    const [list, setList] = sections[section];
    const addJour = () => setList([...list, { numero: list[list.length - 1].numero + 1, statut: "verrouille", date: null, moniteurNom: null, moniteurComplet: null, poste: null, ouvertParId: null, ouvertAt: null, commentaireHumain: "", commentaireTechnique: "", incidentsRencontres: "", resumeSemaine: "", competencesGlobales: {}, criteres: {}, feedbackDuty: null }]);
    const removeJour = () => {
      if (list.length <= 1) return;
      const last = list[list.length - 1];
      if (last.statut === "en_cours" || last.statut === "termine") return;
      setList(list.slice(0, -1));
    };
    const blocs = [];
    for (let i = 0; i < list.length; i += 5) blocs.push(list.slice(i, i + 5));
    return (
      <div style={{ marginBottom: 20 }}>
        {blocs.map((bloc, bi) => (
          <div key={bi} style={{ marginBottom: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 110px))", gap: 10, marginBottom: bloc.length === 5 ? 6 : 0 }}>
              {bloc.map(j => {
                const clickable = true;
                const bg = j.statut === "en_cours" ? C.goldSoft : j.statut === "termine" ? C.greenSoft : "#fff";
                const border = j.statut === "en_cours" ? C.gold : j.statut === "termine" ? C.green : C.line;
                const numColor = j.statut === "verrouille" ? C.inkSoft : C.navy;
                const isSemaine = j.numero % 5 === 0;
                return (
                  <button key={j.numero} disabled={!clickable} onClick={() => setViewingJour({ section, numero: j.numero })}
                    title={isSemaine ? `${t("resume_semaine_label")} : ${j.resumeSemaine || "—"}` : undefined}
                    style={{ background: bg, border: `${isSemaine ? 2 : 1}px solid ${isSemaine ? C.gold : border}`, borderRadius: 10, padding: "12px 8px", cursor: clickable ? "pointer" : "not-allowed", textAlign: "center", fontFamily: FONT_MONO, opacity: clickable ? 1 : 0.7, position: "relative" }}>
                    <div style={{ fontSize: 10, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 3 }}>{t("jour_label")}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: numColor }}>{j.numero}</div>
                    <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 3, minHeight: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.moniteurNom || "\u00A0"}</div>
                    <div style={{ fontSize: 10, color: C.inkSoft, minHeight: 11 }}>{j.date || "\u00A0"}</div>
                  </button>
                );
              })}
            </div>
            {bloc.length === 5 && (() => {
              const jourFeedback = bloc[4];
              const hasFeedback = !!jourFeedback.feedbackDuty?.texte;
              return (
                <button onClick={() => openFeedback(section, jourFeedback.numero, jourFeedback)}
                  style={{ width: "100%", maxWidth: 590, background: hasFeedback ? C.greenSoft : "#fff", border: `1px solid ${hasFeedback ? C.green : C.line}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5 }}>
                  <span style={{ fontWeight: 600, color: hasFeedback ? C.green : C.inkSoft }}>{t("feedback_duty_label")}</span>
                  {hasFeedback && <span style={{ color: C.inkSoft }}>{jourFeedback.feedbackDuty.adminNom} — {jourFeedback.feedbackDuty.date}</span>}
                </button>
              );
            })()}
          </div>
        ))}
        {editable && (
          <div style={{ display: "flex", gap: 6 }}>
            <Btn variant="ghost" icon={Plus} onClick={addJour} style={{ padding: "5px 10px", fontSize: 12 }} />
            <Btn variant="ghost" icon={X} onClick={removeJour} style={{ padding: "5px 10px", fontSize: 12 }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Btn variant="ghost" onClick={onBack}>{t("retour_btn")}</Btn>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: FONT_DISPLAY }}>{initials(eleve.prenom, eleve.nom)}</div>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: C.navy }}>{eleve.prenom} {eleve.nom}</div>
          <div style={{ fontSize: 12, color: C.inkSoft }}>{t("carnet_personnel_sous_titre")}</div>
        </div>
        <Btn variant="ghost" icon={FileDown} onClick={() => exportCarnetExcel(eleve).catch(e => alert("Erreur lors de l'export : " + (e?.message || "inconnue")))} style={{ marginLeft: "auto" }}>{t("exporter_btn")}</Btn>
      </div>

      {carnetError && <div style={{ background: C.redSoft, color: C.red, fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>{carnetError}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 18, borderBottom: `1px solid ${C.line}` }}>
        <button onClick={() => setActiveTab("carpass")} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 4px", marginRight: 20, fontSize: 13.5, fontWeight: 600, color: activeTab === "carpass" ? C.navy : C.inkSoft, borderBottom: `2px solid ${activeTab === "carpass" ? C.navy : "transparent"}` }}>
          {t("carpass_onglet_titre")}
        </button>
        <button onClick={() => setActiveTab("regulateur")} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 4px", marginRight: 20, fontSize: 13.5, fontWeight: 600, color: activeTab === "regulateur" ? C.navy : C.inkSoft, borderBottom: `2px solid ${activeTab === "regulateur" ? C.navy : "transparent"}` }}>
          {fonctionLabel("Élève régulateur", lang)}
        </button>
        {tab2Visible && (
          <button onClick={() => setActiveTab("dispatcheur")} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 4px", fontSize: 13.5, fontWeight: 600, color: activeTab === "dispatcheur" ? C.navy : C.inkSoft, borderBottom: `2px solid ${activeTab === "dispatcheur" ? C.navy : "transparent"}` }}>
            {fonctionLabel("Élève dispatcheur", lang)}
          </button>
        )}
      </div>

      {activeTab === "carpass" ? (
        <CarPassTab eleve={eleve} updateCarnet={updateCarnet} canEdit={canEditCarpass} />
      ) : (
      <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        {editable
          ? <Badge color={C.green} bg={C.greenSoft}>{t("carnet_onglet_modifiable")}</Badge>
          : <Badge color={C.inkSoft} bg={C.bg}>{t("carnet_onglet_lecture_seule")}</Badge>}
        <span style={{ fontSize: 12, color: C.inkSoft }}>{activeTab === "regulateur" ? t("carnet_duree_regulateur") : t("carnet_duree_dispatcheur")}</span>
        {isSuperAdmin && (
          <Btn variant="danger" icon={Trash2} onClick={() => setConfirmResetTab(true)} style={{ marginLeft: "auto", padding: "5px 10px", fontSize: 12 }}>{t("reset_onglet_btn")}</Btn>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        <button onClick={() => setActiveSubTab("jours")} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${activeSubTab === "jours" ? C.navy : C.line}`, background: activeSubTab === "jours" ? C.navy : "#fff", color: activeSubTab === "jours" ? "#fff" : C.ink, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{t("sous_onglet_jours")}</button>
        <button onClick={() => setActiveSubTab("graphiques")} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${activeSubTab === "graphiques" ? C.navy : C.line}`, background: activeSubTab === "graphiques" ? C.navy : "#fff", color: activeSubTab === "graphiques" ? "#fff" : C.ink, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{t("sous_onglet_graphiques")}</button>
      </div>

      {activeSubTab === "jours" ? (
        activeTab === "regulateur" ? (
          <>
            {renderGrid("reg")}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 16, cursor: editable ? "pointer" : "default" }}>
              <input type="checkbox" checked={examen35Reussi} disabled={!editable} onChange={e => updateCarnet({ examen35: e.target.checked })} />
              {t("examen_35_label")}
            </label>
            {examen35Reussi && renderGrid("regSolo")}
            <NotesCarnetSection eleve={eleve} filiere="Élève régulateur" questionnaires={questionnaires} categoryConfig={categoryConfig} />
          </>
        ) : (
          <>
            {renderGrid("disp")}
            <NotesCarnetSection eleve={eleve} filiere="Élève dispatcheur" questionnaires={questionnaires} categoryConfig={categoryConfig} />
          </>
        )
      ) : (() => {
        const jours = activeTab === "regulateur" ? [...joursReg, ...joursRegSolo] : joursDisp;
        const volets = activeTab === "regulateur" ? VOLETS_REGULATEUR : VOLETS_DISPATCHEUR;
        const radarData = computeRadarCarnet(jours, volets);
        const aDesDonnees = radarData.some(d => d.value > 0);
        return (
          <>
            <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <SectionTitle>{t("carnet_radar_titre")}</SectionTitle>
              {!aDesDonnees ? <EmptyState icon={ClipboardList} title={t("pas_de_donnees_titre")} body={t("carnet_graphiques_apparaitront")} /> : (
                <div style={{ height: 300, marginTop: 10 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="75%">
                      <PolarGrid stroke={C.line} />
                      <PolarAngleAxis dataKey="axe" tick={{ fontSize: 11, fill: C.inkSoft, fontFamily: FONT_BODY }} />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 9, fill: "#B8BCC4" }} />
                      <Radar dataKey="value" stroke={C.gold} fill={C.gold} fillOpacity={0.35} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
              {EVOLUTION_GRAPHS.map((g, gi) => {
                const categories = gi === 0 && activeTab === "dispatcheur" ? ["Gestion d'incident", "Safety", "Multi Tasking", "Travaux / Travaux de nuit"]
                  : gi === 1 ? ["SYREM Généralité", "PEX", "Factory Link", "GCTR"]
                  : g.categories;
                const data = activeTab === "regulateur"
                  ? [...computeEvolutionCarnet(joursReg, volets, categories), ...computeEvolutionCarnet(joursRegSolo, volets, categories, 35)]
                  : computeEvolutionCarnet(joursDisp, volets, categories);
                return (
                  <div key={g.titre} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: C.navy, marginBottom: 12 }}>{g.titre}</div>
                    {data.length === 0 ? <EmptyState icon={ClipboardList} title={t("pas_de_donnees_titre")} body={t("carnet_graphiques_apparaitront")} /> : (
                      <div style={{ height: 340 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid stroke={C.line} strokeDasharray="3 3" />
                            <XAxis dataKey="jour" type="number" domain={["dataMin", "dataMax"]} allowDecimals={false} tick={{ fontSize: 9, fill: C.inkSoft }} />
                            <YAxis domain={[0, 5]} tick={{ fontSize: 9, fill: "#B8BCC4" }} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12 }} labelFormatter={(v) => `${t("jour_label")} ${v}`} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            {categories.map((cat, ci) => (
                              <Line key={cat} type="monotone" dataKey={cat} stroke={EVOLUTION_COLORS[ci % EVOLUTION_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}
      </>
      )}
      {confirmResetTab && (
        <ConfirmDialog title={t("reset_onglet_btn")} message={t("confirm_reset_onglet_msg", { fonction: fonctionLabel(activeTab === "regulateur" ? "Élève régulateur" : "Élève dispatcheur", lang) })}
          confirmLabel={t("reset_btn")} onConfirm={async () => { await updateCarnet(activeTab === "regulateur" ? { reg: undefined, regSolo: undefined, examen35: undefined } : { disp: undefined }); setConfirmResetTab(false); }} onCancel={() => setConfirmResetTab(false)} />
      )}
      {viewingFeedback && (() => {
        const [listF] = sections[viewingFeedback.section];
        const jourF = listF.find(j => j.numero === viewingFeedback.numero);
        const fb = jourF?.feedbackDuty;
        return (
          <Modal title={t("feedback_duty_titre", { debut: viewingFeedback.numero - 4, fin: viewingFeedback.numero })} onClose={() => setViewingFeedback(null)}>
            {fb ? (
              <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>{t("feedback_par_label")} <strong style={{ color: C.navy }}>{fb.adminNom}</strong> — {fb.date}</div>
            ) : isAdmin ? (
              <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>{t("feedback_redaction_par", { nom: `${currentUser.prenom} ${currentUser.nom}` })}</div>
            ) : null}
            <textarea style={{ ...inputStyle, minHeight: 130, resize: "vertical" }} disabled={!isAdmin} value={feedbackDraft} onChange={e => setFeedbackDraft(e.target.value)} placeholder={isAdmin ? t("feedback_placeholder") : ""} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
              <Btn variant="ghost" onClick={() => setViewingFeedback(null)}>{isAdmin ? t("cancel") : t("fermer_btn")}</Btn>
              {isAdmin && <Btn variant="primary" onClick={saveFeedback}>{t("save")}</Btn>}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

const GRADUATION_MAP = { "Élève régulateur": "Régulateur", "Élève dispatcheur": "Dispatcheur" };
export function CarnetsEleves({ users, setUsers, questionnaires, questions, categories, categoryConfig, isAdmin, currentUser }) {
  const { t, lang } = useLang();
  const [subtab, setSubtab] = useState("liste"); // "liste" | "notes"
  const [search, setSearch] = useState("");
  const [viewingEleve, setViewingEleve] = useState(null);
  const [viewingCarnet, setViewingCarnet] = useState(null);
  const [confirmSuccess, setConfirmSuccess] = useState(null);
  const [confirmFail, setConfirmFail] = useState(null);
  const [confirmStartDP, setConfirmStartDP] = useState(null);
  const [error, setError] = useState("");
  const matches = (u) => `${u.prenom} ${u.nom} ${u.numeroAgent}`.toLowerCase().includes(search.toLowerCase());

  const enCours = users.filter(u => u.role === "eleve" && (u.fonction === "Élève régulateur" || u.fonction === "Élève dispatcheur") && u.formationStatut !== "echouee" && matches(u));
  const reussies = users.filter(u => u.role === "eleve" && (u.fonction === "Régulateur" || u.fonction === "Dispatcheur") && matches(u));
  const ratees = users.filter(u => u.role === "eleve" && (u.fonction === "Élève régulateur" || u.fonction === "Élève dispatcheur") && u.formationStatut === "echouee" && matches(u));

  const auteurLog = currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "Système";
  const markSuccess = async (eleve) => {
    const nouvelleFonction = GRADUATION_MAP[eleve.fonction];
    if (!nouvelleFonction) return;
    setError("");
    try {
      const { error: err } = await supabase.from("profiles").update({ fonction: nouvelleFonction, formation_statut: null }).eq("id", eleve.id);
      if (err) throw err;
      logActivity("Profil", [{ action: "modification", description: `${eleve.prenom} ${eleve.nom} — Fonction : ${eleve.fonction} → ${nouvelleFonction}` }], auteurLog);
      await setUsers();
    } catch (e) { setError(e?.message || "Erreur inconnue."); }
    setConfirmSuccess(null);
  };
  const markFail = async (eleve) => {
    setError("");
    try {
      const { error: err } = await supabase.from("profiles").update({ formation_statut: "echouee" }).eq("id", eleve.id);
      if (err) throw err;
      logActivity("Profil", [{ action: "modification", description: `${eleve.prenom} ${eleve.nom} — Statut formation : vide → echouee` }], auteurLog);
      await setUsers();
    } catch (e) { setError(e?.message || "Erreur inconnue."); }
    setConfirmFail(null);
  };
  const startDPTraining = async (eleve) => {
    setError("");
    try {
      const { error: err } = await supabase.from("profiles").update({ fonction: "Élève dispatcheur", formation_statut: null }).eq("id", eleve.id);
      if (err) throw err;
      logActivity("Profil", [{ action: "modification", description: `${eleve.prenom} ${eleve.nom} — Fonction : ${eleve.fonction} → Élève dispatcheur` }], auteurLog);
      await setUsers();
    } catch (e) { setError(e?.message || "Erreur inconnue."); }
    setConfirmStartDP(null);
  };

  if (viewingCarnet) {
    const fresh = users.find(u => u.id === viewingCarnet.id) || viewingCarnet;
    return <CarnetPersonnel eleve={fresh} users={users} setUsers={setUsers} questionnaires={questionnaires} categoryConfig={categoryConfig} currentUser={currentUser} onBack={() => setViewingCarnet(null)} />;
  }
  if (viewingEleve) {
    const fresh = users.find(u => u.id === viewingEleve.id) || viewingEleve;
    return <EleveDetailView eleve={fresh} questionnaires={questionnaires} categories={categories} onBack={() => setViewingEleve(null)} />;
  }

  const renderTable = (list, opts = {}) => (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "15%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} />
          <col style={{ width: "7%" }} /><col style={{ width: "9%" }} /><col style={{ width: "8%" }} />
          <col style={{ width: "16%" }} /><col style={{ width: "16%" }} /><col style={{ width: "9%" }} />
        </colgroup>
        <thead><tr style={{ background: C.bg, textAlign: "left" }}>{[t("col_eleve"), "", t("col_fonction"), t("col_team"), t("col_langue"), t("agent_number"), "", "", ""].map((h, i) => <th key={i} style={{ padding: "10px 16px", fontSize: 11.5, color: C.inkSoft, textTransform: "uppercase", letterSpacing: ".03em", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
        <tbody>
          {list.map(e => (
            <tr key={e.id} style={{ borderTop: `1px solid ${C.line}` }}>
              <td style={{ padding: "12px 16px", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: FONT_DISPLAY, flexShrink: 0 }}>{initials(e.prenom, e.nom)}</div>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.prenom} {e.nom}</span>
                </div>
              </td>
              <td style={{ padding: "12px 16px" }}>
                <Btn variant="subtle" icon={BookCheck} onClick={() => setViewingCarnet(e)} style={{ padding: "4px 9px", fontSize: 12, whiteSpace: "nowrap" }}>{t("voir_carnet_btn")}</Btn>
              </td>
              <td style={{ padding: "12px 16px", overflow: "hidden" }}><Badge {...fonctionColor(e.fonction)}>{fonctionLabel(e.fonction, lang)}</Badge></td>
              <td style={{ padding: "12px 16px", fontSize: 12.5, color: e.team ? C.ink : C.inkSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.team || "—"}</td>
              <td style={{ padding: "12px 8px", fontSize: 12.5, color: C.inkSoft }}>{LANGS[e.langue || "fr"]}</td>
              <td style={{ padding: "12px 16px", fontFamily: FONT_MONO, fontSize: 12.5, overflow: "hidden" }}>{e.numeroAgent}</td>
              <td style={{ padding: "12px 6px" }}>
                {opts.actions && isAdmin && <Btn variant="success" icon={CheckCircle2} onClick={() => setConfirmSuccess(e)} style={{ padding: "6px 8px", fontSize: 12 }}>{t("valider_reussite_btn")}</Btn>}
                {opts.dpAction && isAdmin && e.fonction === "Régulateur" && (
                  <Btn variant="success" icon={ArrowUpDown} onClick={() => setConfirmStartDP(e)} style={{ padding: "6px 8px", fontSize: 12 }}>{t("debuter_formation_dp_btn")}</Btn>
                )}
              </td>
              <td style={{ padding: "12px 6px" }}>
                {opts.actions && isAdmin && <Btn variant="danger" icon={XCircle} onClick={() => setConfirmFail(e)} style={{ padding: "6px 8px", fontSize: 12 }}>{t("mettre_fin_formation_btn")}</Btn>}
              </td>
              <td style={{ padding: "12px 8px", textAlign: "left" }}>
                <Btn variant="subtle" icon={Eye} onClick={() => setViewingEleve(e)} style={{ padding: "6px 8px" }} />
              </td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={9}><EmptyState icon={BookCheck} title={t("aucun_carnet_titre")} body={t("aucun_carnet_body")} /></td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <SectionTitle>{t("carnets_titre")}</SectionTitle>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4, marginBottom: 16 }}>{t("carnets_sub")}</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => setSubtab("liste")} style={pillStyle(subtab === "liste")}>{t("sous_onglet_liste_eleves")}</button>
        <button onClick={() => setSubtab("notes")} style={pillStyle(subtab === "notes")}>{t("notes_obligatoires_titre")}</button>
      </div>

      {subtab === "notes" ? (
        <NotesObligatoires questions={questions} currentUser={currentUser} />
      ) : (
        <>
      {error && <div style={{ background: C.redSoft, color: C.red, fontSize: 12.5, fontWeight: 600, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>{error}</div>}
      <div style={{ position: "relative", marginBottom: 16, maxWidth: 320 }}>
        <Search size={15} style={{ position: "absolute", left: 11, top: 11, color: C.inkSoft }} />
        <input style={{ ...inputStyle, paddingLeft: 34 }} placeholder={t("rechercher_eleve")} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <SectionTitle>{t("formation_en_cours_titre")}</SectionTitle>
      <div style={{ height: 10 }} />
      {renderTable(enCours, { actions: true })}

      <SectionTitle>{t("formation_reussies_titre")}</SectionTitle>
      <div style={{ height: 10 }} />
      {renderTable(reussies, { dpAction: true })}

      <SectionTitle>{t("formation_ratees_titre")}</SectionTitle>
      <div style={{ height: 10 }} />
      {renderTable(ratees)}

      {confirmSuccess && (
        <ConfirmDialog tone="success" title={t("valider_reussite_title")} message={t("valider_reussite_msg", { nom: `${confirmSuccess.prenom} ${confirmSuccess.nom}`, fonction: fonctionLabel(GRADUATION_MAP[confirmSuccess.fonction], lang) })}
          confirmLabel={t("valider_reussite_btn")} onConfirm={() => markSuccess(confirmSuccess)} onCancel={() => setConfirmSuccess(null)} />
      )}
      {confirmFail && (
        <ConfirmDialog tone="danger" title={t("mettre_fin_formation_title")} message={t("mettre_fin_formation_msg", { nom: `${confirmFail.prenom} ${confirmFail.nom}` })}
          confirmLabel={t("mettre_fin_formation_btn")} onConfirm={() => markFail(confirmFail)} onCancel={() => setConfirmFail(null)} />
      )}
      {confirmStartDP && (
        <ConfirmDialog tone="success" title={t("debuter_formation_dp_btn")} message={t("debuter_formation_dp_msg", { nom: `${confirmStartDP.prenom} ${confirmStartDP.nom}` })}
          confirmLabel={t("debuter_formation_dp_btn")} onConfirm={() => startDPTraining(confirmStartDP)} onCancel={() => setConfirmStartDP(null)} />
      )}
        </>
      )}
    </div>
  );
}
