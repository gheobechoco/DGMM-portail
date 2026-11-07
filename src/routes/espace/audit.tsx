import { Pagination, usePagination } from "@/components/dgmm/Listes";
import { Aide } from "@/components/dgmm/Aide";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, KeyRound, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { RequirePerm } from "@/components/dgmm/Guard";
import { PageHeader, Panel, StatCard, selectClass } from "@/components/dgmm/Page";
import { SectionStatistiques, LienStatistiques } from "@/components/dgmm/Statistiques";
import { Button } from "@/components/ui/button";
import { useAudit, verifierAudit } from "@/lib/dgmm/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/espace/audit")({
  head: () => ({ meta: [{ title: "Journal d'audit — GDM | DGMM" }] }),
  component: () => <RequirePerm perm="audit">{() => <Journal />}</RequirePerm>,
});

const CATEGORIES: [string, RegExp][] = [
  ["Délivrances de livret", /livret/i],
  ["Visas administratifs", /visa|rejet/i],
  ["Signatures & révocations", /signature|révocation/i],
  ["Enrôlements & modifications", /enrôlement|modification|embarquement|débarquement/i],
  ["Connexions externes", /connexion|alerte|rôle d'équipage/i],
  [
    "Administration système",
    /système|sauvegarde|réinitialisation|maintenance|habillage|animations|calendrier/i,
  ],
];

function Journal() {
  const audit = useAudit();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [verif, setVerif] = useState<{ at: string; rupture: number | null } | null>(null);

  const rows = useMemo(() => {
    const nq = q.trim().toLowerCase();
    const re = CATEGORIES.find(([l]) => l === cat)?.[1];
    return [...audit]
      .reverse()
      .filter(
        (e) =>
          (!re || re.test(e.action)) &&
          (!nq ||
            `${e.acteur} ${e.role} ${e.action} ${e.cible} ${e.hash}`.toLowerCase().includes(nq)),
      );
  }, [audit, q, cat]);
  const pg = usePagination(rows, 15);

  const livrets = audit.filter((e) => /Délivrance du livret/.test(e.action)).length;
  const visas = audit.filter((e) => /Visa administratif/.test(e.action)).length;

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [
      [
        "N°",
        "Date",
        "Acteur",
        "Rôle",
        "Action",
        "Cible",
        "Poste",
        "Empreinte précédente",
        "Empreinte",
      ]
        .map(esc)
        .join(";"),
      ...audit.map((e) =>
        [e.seq, e.date, e.acteur, e.role, e.action, e.cible, e.poste, e.prev, e.hash]
          .map(esc)
          .join(";"),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal-audit-dgmm-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        eyebrow="Sécurité & traçabilité"
        title="Journal d'audit"
        subtitle={<span className="inline-flex flex-wrap items-center gap-1">Historique chaîné des actions sensibles : chaque entrée scelle la précédente, toute altération est détectée. <Aide terme="journal" /></span>}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download /> Exporter (CSV)
            </Button>
            <Button
              variant="gold"
              onClick={() =>
                setVerif({ at: new Date().toLocaleString("fr-FR"), rupture: verifierAudit(audit) })
              }
            >
              <KeyRound /> Vérifier l'intégrité
            </Button>
          </>
        }
      />

      {verif && (
        <div
          role="status"
          className={cn(
            "mb-6 flex items-start gap-3 rounded-xl border p-4",
            verif.rupture === null
              ? "border-success/40 bg-success/8"
              : "border-destructive/40 bg-destructive/8",
          )}
        >
          {verif.rupture === null ? (
            <ShieldCheck className="size-5 shrink-0 text-success" />
          ) : (
            <ShieldAlert className="size-5 shrink-0 text-destructive" />
          )}
          <div className="text-sm">
            <div className="font-semibold text-primary">
              {verif.rupture === null
                ? `Intégrité vérifiée : ${audit.length} entrées, chaîne d'empreintes intacte.`
                : `Altération détectée à l'entrée n° ${verif.rupture}.`}
            </div>
            <div className="text-muted-foreground">Contrôle effectué le {verif.at}.</div>
          </div>
        </div>
      )}

      <LienStatistiques theme="audit" texte="Volume du journal, actes tracés et intégrité de la chaîne" />

      <Panel bodyClassName="p-0">
        <div className="grid gap-3 border-b p-4 sm:grid-cols-[1fr_260px]">
          <label className="field-dgmm flex h-10 items-center gap-2 rounded-md bg-card px-3">
            <Search className="size-4 text-muted-foreground" />
            <span className="sr-only">Rechercher</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Acteur, action, marin, empreinte…"
              className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <label>
            <span className="sr-only">Catégorie</span>
            <select className={selectClass} value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Toutes les actions</option>
              {CATEGORIES.map(([l]) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">N°</th>
                <th className="px-3 py-2.5 font-semibold">Date et heure</th>
                <th className="px-3 py-2.5 font-semibold">Acteur</th>
                <th className="px-3 py-2.5 font-semibold">Action</th>
                <th className="px-3 py-2.5 font-semibold">Cible</th>
                <th className="px-3 py-2.5 font-semibold">Poste</th>
                <th className="px-4 py-2.5 font-semibold">Empreinte</th>
              </tr>
            </thead>
            <tbody className="stagger divide-y">
              {pg.visibles.map((e) => (
                <tr key={e.seq} className={cn(verif?.rupture === e.seq && "bg-destructive/10")}>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{e.seq}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs tabular-nums">
                    {new Date(e.date).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{e.acteur}</div>
                    <div className="text-[11px] text-muted-foreground">{e.role}</div>
                  </td>
                  <td className="px-3 py-2">{e.action}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{e.cible}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {e.poste}
                  </td>
                  <td className="px-4 py-2 font-mono text-[11px]" title={`Précédente : ${e.prev}`}>
                    {e.hash.slice(0, 12)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination {...pg} />
        <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">
          {rows.length} entrée(s) affichée(s). L'adresse IP n'est pas accessible depuis le
          navigateur : elle sera enregistrée par le serveur une fois la base de données branchée.
        </div>
      </Panel>
    </>
  );
}
