import { useState } from "react";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";
import { C, FONT_MONO } from "../theme.js";
import { useLang } from "../lang.jsx";
import { supabase } from "../lib/supabaseClient.js";
import {
  gameStationToRow, gameTelephoneToRow, gameAbreviationToRow, gameTraductionToRow,
} from "../lib/mappers.js";
import { Btn, Field, inputStyle, Modal, SectionTitle, EmptyState, ConfirmDialog, pillStyle } from "./atoms.jsx";

// Page "Gestion des jeux" : un onglet par jeu, chacun listant les
// entrées de la table correspondante avec possibilité d'ajouter, modifier
// et supprimer — accessible à tout le staff (moniteurs compris), pas
// réservé aux admins. Les données arrivent en prop depuis App.jsx
// (chargement initial + synchro en direct) ; les écritures passent
// directement par Supabase, protégées côté base par les permissions
// (RLS) du schéma 32 — tout autre membre du staff verra le changement
// apparaître tout seul, sans recharger la page.
//
// Un seul composant de table générique (GameDataTable) sert les 4
// onglets, paramétré par les colonnes propres à chaque jeu — évite de
// dupliquer 4 fois la même logique d'ajout/modification/suppression.

function GameDataTable({ tableName, columns, rows, toRow }) {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | {} (nouvelle entrée) | {...ligne} (modification)
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = search.trim()
    ? rows.filter(r => columns.some(c => String(r[c.key] ?? "").toLowerCase().includes(search.trim().toLowerCase())))
    : rows;

  const save = async (values) => {
    setSaving(true);
    setError("");
    try {
      if (modal.id) {
        const { error: err } = await supabase.from(tableName).update(toRow(values)).eq("id", modal.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from(tableName).insert(toRow(values));
        if (err) throw err;
      }
      setModal(null);
    } catch (e) { setError(e?.message || t("erreur_inconnue")); }
    setSaving(false);
  };

  const del = async (row) => {
    setError("");
    try {
      const { error: err } = await supabase.from(tableName).delete().eq("id", row.id);
      if (err) throw err;
      setConfirmDelete(null);
    } catch (e) { setError(e?.message || t("erreur_inconnue")); }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={14} color={C.inkSoft} style={{ position: "absolute", left: 10, top: 10 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("rechercher_placeholder")} style={{ ...inputStyle, paddingLeft: 30, width: "100%" }} />
        </div>
        <span style={{ fontSize: 12, color: C.inkSoft }}>{filtered.length} / {rows.length}</span>
        <Btn variant="gold" icon={Plus} onClick={() => setModal({})} style={{ marginLeft: "auto" }}>{t("ajouter_btn")}</Btn>
      </div>

      {error && <div style={{ fontSize: 12.5, color: C.red, marginBottom: 10 }}>{error}</div>}

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title={t("aucun_resultat_titre")} body="" />
      ) : (
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", maxHeight: 520, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ position: "sticky", top: 0, background: C.bg, zIndex: 1 }}>
              <tr>
                {columns.map(c => <th key={c.key} style={{ textAlign: "left", padding: "10px 14px", color: C.inkSoft, fontWeight: 600, fontSize: 12 }}>{c.label}</th>)}
                <th style={{ width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  {columns.map(c => (
                    <td key={c.key} style={{ padding: "9px 14px", fontFamily: c.type === "number" ? FONT_MONO : undefined }}>
                      {c.type === "select" ? (c.options.find(o => o.value === row[c.key])?.label || row[c.key]) : (row[c.key] ?? "—")}
                    </td>
                  ))}
                  <td style={{ padding: "9px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <Btn variant="subtle" icon={Edit2} onClick={() => setModal(row)} style={{ padding: "5px 8px", marginRight: 4 }} />
                    <Btn variant="danger" icon={Trash2} onClick={() => setConfirmDelete(row)} style={{ padding: "5px 8px" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <GameEntryModal columns={columns} initial={modal} onClose={() => setModal(null)} onSave={save} saving={saving} isNew={!modal.id} />
      )}
      {confirmDelete && (
        <ConfirmDialog tone="danger" title={t("supprimer_entree_titre")} message={t("confirm_supprimer_entree_msg")}
          confirmLabel={t("supprimer_btn")} onConfirm={() => del(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
      )}
    </div>
  );
}

function GameEntryModal({ columns, initial, onClose, onSave, saving, isNew }) {
  const { t } = useLang();
  const [values, setValues] = useState(() => Object.fromEntries(columns.map(c => [c.key, initial[c.key] ?? ""])));
  const setField = (key, v) => setValues(prev => ({ ...prev, [key]: v }));

  return (
    <Modal title={isNew ? t("ajouter_entree_titre") : t("modifier_entree_titre")} onClose={onClose}>
      {columns.map(c => (
        <Field key={c.key} label={c.label}>
          {c.type === "select" ? (
            <select value={values[c.key]} onChange={e => setField(c.key, e.target.value)} style={inputStyle}>
              {c.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input type={c.type === "number" ? "number" : "text"} value={values[c.key]} onChange={e => setField(c.key, c.type === "number" ? Number(e.target.value) : e.target.value)} style={inputStyle} />
          )}
        </Field>
      ))}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
        <Btn variant="ghost" onClick={onClose}>{t("cancel")}</Btn>
        <Btn variant="primary" disabled={saving} onClick={() => onSave(values)}>{saving ? t("enregistrement_en_cours") : t("save")}</Btn>
      </div>
    </Modal>
  );
}

export function GestionJeux({ gameStations, gameTelephones, gameAbreviations, gameTraductions }) {
  const { t } = useLang();
  const [subtab, setSubtab] = useState("stations"); // stations | telephones | abreviations | traductions

  const LANGUE_OPTIONS = [{ value: "fr", label: "FR" }, { value: "nl", label: "NL" }];

  return (
    <div>
      <SectionTitle>{t("nav_gestion_jeux")}</SectionTitle>
      <div style={{ height: 14 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => setSubtab("stations")} style={pillStyle(subtab === "stations")}>{t("jeu_stations_titre")}</button>
        <button onClick={() => setSubtab("telephones")} style={pillStyle(subtab === "telephones")}>{t("jeu_telephones_titre")}</button>
        <button onClick={() => setSubtab("abreviations")} style={pillStyle(subtab === "abreviations")}>{t("jeu_abreviations_titre")}</button>
        <button onClick={() => setSubtab("traductions")} style={pillStyle(subtab === "traductions")}>{t("jeu_traductions_titre")}</button>
      </div>

      {subtab === "stations" && (
        <GameDataTable tableName="game_stations" rows={gameStations} toRow={gameStationToRow} columns={[
          { key: "numero", label: t("col_numero"), type: "number" },
          { key: "fr", label: t("col_nom_fr"), type: "text" },
          { key: "nl", label: t("col_nom_nl"), type: "text" },
        ]} />
      )}
      {subtab === "telephones" && (
        <GameDataTable tableName="game_telephones" rows={gameTelephones} toRow={gameTelephoneToRow} columns={[
          { key: "serviceFr", label: t("col_service_fr"), type: "text" },
          { key: "serviceNl", label: t("col_service_nl"), type: "text" },
          { key: "pax", label: "PAX", type: "text" },
          { key: "cisco", label: "CISCO", type: "text" },
        ]} />
      )}
      {subtab === "abreviations" && (
        <GameDataTable tableName="game_abreviations" rows={gameAbreviations} toRow={gameAbreviationToRow} columns={[
          { key: "acronyme", label: t("col_acronyme"), type: "text" },
          { key: "correct", label: t("col_signification"), type: "text" },
          { key: "langue", label: t("col_langue"), type: "select", options: LANGUE_OPTIONS },
        ]} />
      )}
      {subtab === "traductions" && (
        <GameDataTable tableName="game_traductions" rows={gameTraductions} toRow={gameTraductionToRow} columns={[
          { key: "fr", label: t("col_terme_fr"), type: "text" },
          { key: "nl", label: t("col_terme_nl"), type: "text" },
        ]} />
      )}
    </div>
  );
}
