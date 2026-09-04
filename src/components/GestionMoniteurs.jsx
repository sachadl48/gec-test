import { useState } from "react";
import { C } from "../theme.js";
import { useLang } from "../lang.jsx";
import { SectionTitle, pillStyle } from "./atoms.jsx";
import { GestionEnquetes } from "./GestionEnquetes.jsx";
import { PerformancesMoniteurs } from "./PerformancesMoniteurs.jsx";

// Page admin "Gestion des Moniteurs" : deux sous-onglets — l'enquête de
// satisfaction (en attente / terminées, avec suppression réservée aux
// Admin +), et les performances des moniteurs (graphiques en toile
// d'araignée, alimentés par les cotations des enquêtes complétées).
export function GestionMoniteurs({ users, enquetesSatisfaction, isSuperAdmin }) {
  const { t } = useLang();
  const [subtab, setSubtab] = useState("enquetes"); // "enquetes" | "performances"

  return (
    <div>
      <SectionTitle>{t("nav_gestion_moniteurs")}</SectionTitle>
      <div style={{ height: 14 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => setSubtab("enquetes")} style={pillStyle(subtab === "enquetes")}>{t("sous_onglet_enquete_satisfaction")}</button>
        <button onClick={() => setSubtab("performances")} style={pillStyle(subtab === "performances")}>{t("sous_onglet_performances_moniteurs")}</button>
      </div>
      {subtab === "enquetes"
        ? <GestionEnquetes users={users} enquetesSatisfaction={enquetesSatisfaction} canDelete={isSuperAdmin} />
        : <PerformancesMoniteurs users={users} enquetesSatisfaction={enquetesSatisfaction} />}
    </div>
  );
}
