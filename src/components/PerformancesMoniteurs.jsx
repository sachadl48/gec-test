import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip,
} from "recharts";
import { C, FONT_DISPLAY, FONT_BODY } from "../theme.js";
import { useLang } from "../lang.jsx";
import { computeMoniteurRadarData } from "../data/enqueteSatisfaction.js";
import { SectionTitle, EmptyState } from "./atoms.jsx";
import { Users } from "lucide-react";

// Vue "Performances des moniteurs" : un graphique en toile d'araignée
// général (toutes les enquêtes complétées confondues), puis un graphique
// personnel pour chaque profil enregistré comme moniteur. Les moniteurs
// sont retrouvés dans les enquêtes par correspondance de nom (prénom +
// nom) — pas d'identifiant direct, donc un moniteur renommé ou dont le
// nom a été mal saisi lors de l'ouverture d'un jour de carnet n'apparaîtra
// pas correctement ici. Limite connue, pas une erreur du calcul lui-même.
function RadarCard({ title, data, compact }) {
  const { t } = useLang();
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: compact ? 16 : 20 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: compact ? 13.5 : 15, fontWeight: 700, color: C.navy, marginBottom: 10 }}>{title}</div>
      <div style={{ height: compact ? 200 : 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius={compact ? "68%" : "72%"}>
            <PolarGrid stroke={C.line} />
            <PolarAngleAxis dataKey="competence" tick={{ fontSize: compact ? 9.5 : 10.5, fill: C.inkSoft, fontFamily: FONT_BODY }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#B8BCC4" }} />
            <Radar dataKey="score" stroke={C.gold} fill={C.gold} fillOpacity={0.35} />
            <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PerformancesMoniteurs({ users, enquetesSatisfaction }) {
  const { t, lang } = useLang();
  const terminees = (enquetesSatisfaction || []).filter(e => e.statut === "terminee");
  const moniteursProfils = users.filter(u => u.role === "moniteur");
  const dataGenerale = computeMoniteurRadarData(terminees, null, lang);
  const auMoinsUneNote = terminees.some(e => (e.reponses?.moniteurs || []).length > 0);

  return (
    <div>
      <SectionTitle>{t("performances_generale_titre")}</SectionTitle>
      <div style={{ height: 10 }} />
      {auMoinsUneNote ? <RadarCard title={t("performances_generale_titre")} data={dataGenerale} /> : <EmptyState icon={Users} title={t("performances_aucune_donnee_titre")} body={t("performances_aucune_donnee_body")} />}

      <div style={{ height: 28 }} />
      <SectionTitle>{t("performances_par_moniteur_titre")}</SectionTitle>
      <div style={{ height: 10 }} />
      {moniteursProfils.length === 0 ? (
        <EmptyState icon={Users} title={t("performances_aucun_moniteur_titre")} body="" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {moniteursProfils.map(m => {
            const nomComplet = `${m.prenom} ${m.nom}`;
            const data = computeMoniteurRadarData(terminees, nomComplet, lang);
            return <RadarCard key={m.id} title={nomComplet} data={data} compact />;
          })}
        </div>
      )}
    </div>
  );
}
