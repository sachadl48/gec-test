import { useState } from "react";
import { Tag, CheckCircle2, X, Edit2, Lock, Plus, Info } from "lucide-react";
import { C } from "../theme.js";
import { useLang } from "../lang.jsx";
import { FONCTIONS, fonctionLabel } from "../data/fonctions.js";
import { catColor } from "../utils/categoryColor.js";
import { findCategoryMatch } from "../utils/userAccount.js";
import { Btn, inputStyle, SectionTitle, ConfirmDialog, InfoDialog, Modal } from "./atoms.jsx";

// Page "Gestion des catégories" : liste, seuil de réussite et fonctions
// concernées par catégorie, ajout/suppression/renommage.
// Extrait de App.jsx dans le cadre du découpage du fichier principal en
// modules plus petits — aucun changement de contenu, uniquement déplacé.

export function CategoryManager({ categories, setCategories, categoryConfig, setCategoryConfig, questions, setQuestions, isAdmin, onRenameCategory }) {
  const { t, lang } = useLang();
  const [newCat, setNewCat] = useState("");
  const [newSeuil, setNewSeuil] = useState(60);
  const [newDescription, setNewDescription] = useState("");
  const [descPopup, setDescPopup] = useState(null);
  const [descDraft, setDescDraft] = useState("");
  const [confirmCat, setConfirmCat] = useState(null);
  const [blockedCat, setBlockedCat] = useState(null);
  const [duplicateMatch, setDuplicateMatch] = useState(null);
  const [pendingSeuils, setPendingSeuils] = useState({});
  const [savedFlash, setSavedFlash] = useState({});
  const [pendingFonctions, setPendingFonctions] = useState({});
  const [savedFlashF, setSavedFlashF] = useState({});
  const [renamingCat, setRenamingCat] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameDuplicate, setRenameDuplicate] = useState(null);
  const [slashError, setSlashError] = useState(false);

  const startRename = (cat) => { setRenamingCat(cat); setRenameValue(cat); };
  const cancelRename = () => { setRenamingCat(null); setRenameValue(""); };
  const confirmRename = () => {
    const v = renameValue.trim();
    if (!v || v === renamingCat) { cancelRename(); return; }
    if (v.includes("/")) { setSlashError(true); return; }
    const match = findCategoryMatch(v, categories.filter(c => c !== renamingCat));
    if (match) { setRenameDuplicate(match); return; }
    const oldName = renamingCat;
    if (onRenameCategory) {
      onRenameCategory(oldName, v);
    } else {
      setCategories(categories.map(c => c === oldName ? v : c));
      const newConfig = { ...categoryConfig };
      newConfig[v] = newConfig[oldName] || { seuil: 60, fonctions: [...FONCTIONS] };
      delete newConfig[oldName];
      setCategoryConfig(newConfig);
      setQuestions(questions.map(q => (q.categories || []).includes(oldName) ? { ...q, categories: q.categories.map(c => c === oldName ? v : c) } : q));
    }
    cancelRename();
  };

  const add = () => {
    const v = newCat.trim();
    if (!v) return;
    if (v.includes("/")) { setSlashError(true); return; }
    const match = findCategoryMatch(v, categories);
    if (match) { setDuplicateMatch(match); return; }
    setCategories([...categories, v]);
    setCategoryConfig({ ...categoryConfig, [v]: { seuil: Number(newSeuil) || 60, fonctions: [...FONCTIONS], description: newDescription.trim() } });
    setNewCat(""); setNewSeuil(60); setNewDescription("");
  };
  const updateConfig = (cat, patch) => setCategoryConfig({ ...categoryConfig, [cat]: { ...(categoryConfig[cat] || { seuil: 60, fonctions: [...FONCTIONS] }), ...patch } });
  const openDescPopup = (cat) => { setDescPopup(cat); setDescDraft(categoryConfig[cat]?.description || ""); };
  const saveDescription = () => { updateConfig(descPopup, { description: descDraft.trim() }); setDescPopup(null); };
  const fonctionsValue = (cat) => pendingFonctions[cat] !== undefined ? pendingFonctions[cat] : (categoryConfig[cat]?.fonctions || [...FONCTIONS]);
  const fonctionsDirty = (cat) => {
    if (pendingFonctions[cat] === undefined) return false;
    const saved = categoryConfig[cat]?.fonctions || [...FONCTIONS];
    const p = pendingFonctions[cat];
    return p.length !== saved.length || !p.every(f => saved.includes(f));
  };
  const toggleFonctionPending = (cat, fonction) => {
    const current = fonctionsValue(cat);
    const next = current.includes(fonction) ? current.filter(f => f !== fonction) : [...current, fonction];
    setPendingFonctions(p => ({ ...p, [cat]: next }));
  };
  const confirmFonctions = (cat) => {
    updateConfig(cat, { fonctions: pendingFonctions[cat] });
    setPendingFonctions(p => { const n = { ...p }; delete n[cat]; return n; });
    setSavedFlashF(f => ({ ...f, [cat]: true }));
    setTimeout(() => setSavedFlashF(f => { const n = { ...f }; delete n[cat]; return n; }), 2200);
  };
  const seuilValue = (cat) => pendingSeuils[cat] !== undefined ? pendingSeuils[cat] : (categoryConfig[cat]?.seuil ?? 60);
  const seuilDirty = (cat) => pendingSeuils[cat] !== undefined && pendingSeuils[cat] !== (categoryConfig[cat]?.seuil ?? 60);
  const confirmSeuil = (cat) => {
    updateConfig(cat, { seuil: pendingSeuils[cat] });
    setPendingSeuils(p => { const n = { ...p }; delete n[cat]; return n; });
    setSavedFlash(f => ({ ...f, [cat]: true }));
    setTimeout(() => setSavedFlash(f => { const n = { ...f }; delete n[cat]; return n; }), 2200);
  };
  const requestRemove = (cat) => {
    if (questions.some(q => (q.categories || []).includes(cat))) { setBlockedCat(cat); return; }
    setConfirmCat(cat);
  };
  const doRemove = () => { setCategories(categories.filter(c => c !== confirmCat)); setConfirmCat(null); };

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><Tag size={15} color={C.inkSoft} /><SectionTitle>{t("categories_titre")}</SectionTitle></div>
      <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 14 }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th style={{ padding: "6px 8px", fontSize: 11, color: C.inkSoft, textTransform: "uppercase" }}>{t("col_categorie")}</th>
            <th style={{ padding: "6px 8px", fontSize: 11, color: C.inkSoft, textTransform: "uppercase" }}>{t("col_seuil_reussite")}</th>
            <th style={{ padding: "6px 8px", fontSize: 11, color: C.inkSoft, textTransform: "uppercase" }}>{t("col_concerne")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {categories.map(c => {
            const cfg = categoryConfig[c] || { seuil: 60, fonctions: [...FONCTIONS] };
            return (
              <tr key={c} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                  {renamingCat === c ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input autoFocus style={{ ...inputStyle, width: 140, padding: "4px 6px", fontSize: 12.5 }} value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") cancelRename(); }} />
                      <button onClick={confirmRename} title={t("confirmer")} style={{ background: "none", border: "none", cursor: "pointer", color: C.green, display: "flex" }}><CheckCircle2 size={16} /></button>
                      <button onClick={cancelRename} title={t("cancel")} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, display: "flex" }}><X size={16} /></button>
                    </div>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: catColor(categories, c) }} />
                      {c}
                      <button onClick={() => openDescPopup(c)} title={t("voir_description_categorie")} style={{ background: "none", border: "none", cursor: "pointer", color: categoryConfig[c]?.description ? C.teal : C.inkSoft, display: "inline-flex", padding: 2 }}><Info size={12} /></button>
                      {isAdmin && <button onClick={() => startRename(c)} title={t("renommer_categorie")} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, display: "inline-flex", padding: 2 }}><Edit2 size={12} /></button>}
                    </span>
                  )}
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 150 }}>
                    <input type="number" min={0} max={100} value={seuilValue(c)} onChange={e => setPendingSeuils(p => ({ ...p, [c]: Number(e.target.value) }))} onKeyDown={e => e.key === "Enter" && seuilDirty(c) && confirmSeuil(c)} style={{ ...inputStyle, width: 62, padding: "5px 8px" }} disabled={!isAdmin} /> <span style={{ color: C.inkSoft }}>%</span>
                    {!isAdmin && <Lock size={11} color={C.inkSoft} style={{ marginLeft: 2 }} />}
                    {isAdmin && seuilDirty(c) && <Btn variant="gold" icon={CheckCircle2} onClick={() => confirmSeuil(c)} style={{ padding: "4px 8px", fontSize: 11.5 }}>{t("confirmer")}</Btn>}
                    {isAdmin && !seuilDirty(c) && savedFlash[c] && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: C.green, fontWeight: 600 }}><CheckCircle2 size={13} /> {t("enregistre")}</span>}
                  </div>
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 190 }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      {FONCTIONS.map(f => (
                        <label key={f} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.inkSoft, cursor: isAdmin ? "pointer" : "default" }}>
                          <input type="checkbox" checked={fonctionsValue(c).includes(f)} disabled={!isAdmin} onChange={() => toggleFonctionPending(c, f)} /> {fonctionLabel(f, lang)}
                        </label>
                      ))}
                      {!isAdmin && <Lock size={11} color={C.inkSoft} />}
                    </div>
                    {isAdmin && fonctionsDirty(c) && <Btn variant="gold" icon={CheckCircle2} onClick={() => confirmFonctions(c)} style={{ padding: "4px 8px", fontSize: 11.5, alignSelf: "flex-start" }}>{t("confirmer")}</Btn>}
                    {isAdmin && !fonctionsDirty(c) && savedFlashF[c] && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: C.green, fontWeight: 600 }}><CheckCircle2 size={13} /> {t("enregistre")}</span>}
                  </div>
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>
                  {isAdmin && <button onClick={() => requestRemove(c)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft, display: "inline-flex", padding: 3 }}><X size={13} /></button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...inputStyle, maxWidth: 180 }} placeholder={t("nouvelle_categorie_placeholder")} value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        <input style={{ ...inputStyle, maxWidth: 220 }} placeholder={t("description_categorie_placeholder")} value={newDescription} onChange={e => setNewDescription(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="number" min={0} max={100} style={{ ...inputStyle, width: 62, padding: "8px" }} value={newSeuil} onChange={e => setNewSeuil(e.target.value)} /><span style={{ fontSize: 12, color: C.inkSoft }}>{t("pct_reussite")}</span></div>
        <Btn variant="ghost" icon={Plus} onClick={add}>{t("add")}</Btn>
      </div>
      {descPopup && (
        <Modal title={t("description_categorie_titre", { cat: descPopup })} onClose={() => setDescPopup(null)}>
          {isAdmin ? (
            <>
              <textarea autoFocus style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} placeholder={t("description_categorie_placeholder")} value={descDraft} onChange={e => setDescDraft(e.target.value)} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                <Btn variant="ghost" onClick={() => setDescPopup(null)}>{t("cancel")}</Btn>
                <Btn variant="primary" onClick={saveDescription}>{t("save")}</Btn>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.5 }}>{categoryConfig[descPopup]?.description || t("aucune_description")}</div>
          )}
        </Modal>
      )}
      {confirmCat && (
        <ConfirmDialog title={t("supprimer_categorie_titre")} message={t("supprimer_categorie_msg", { cat: confirmCat })} onConfirm={doRemove} onCancel={() => setConfirmCat(null)} />
      )}
      {blockedCat && (
        <InfoDialog title={t("suppression_impossible_titre")} message={t("suppression_impossible_msg", { cat: blockedCat })} onClose={() => setBlockedCat(null)} />
      )}
      {duplicateMatch && (
        <InfoDialog title={t("categorie_existante_titre")} message={t("categorie_existante_msg", { cat: duplicateMatch })} onClose={() => setDuplicateMatch(null)} />
      )}
      {renameDuplicate && (
        <InfoDialog title={t("categorie_existante_titre")} message={t("categorie_existante_msg", { cat: renameDuplicate })} onClose={() => setRenameDuplicate(null)} />
      )}
      {slashError && (
        <InfoDialog title={t("caractere_interdit_titre")} message={t("caractere_interdit_msg")} onClose={() => setSlashError(false)} />
      )}
    </div>
  );
}
