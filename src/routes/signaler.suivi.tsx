import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Search, Send } from "lucide-react";
import { PublicShell } from "@/components/dgmm/PublicShell";
import { Panel, inputClass, textareaClass } from "@/components/dgmm/Page";
import { Button } from "@/components/ui/button";
import { FilAlerte, PastilleNiveau, PastilleStatut } from "@/components/dgmm/AlerteVue";
import { cn } from "@/lib/utils";
import { repondre, useAlertes } from "@/lib/dgmm/alertes";

export const Route = createFileRoute("/signaler/suivi")({
  validateSearch: (s: Record<string, unknown>): { code?: string | undefined } => ({ code: typeof s["code"] === "string" ? s["code"] : undefined }),
  head: () => ({ meta: [{ title: "Suivre mon signalement — DGMM" }] }),
  component: Suivi,
});

function Suivi() {
  const { code: initial } = Route.useSearch();
  const alertes = useAlertes();
  const [code, setCode] = useState(initial ?? "");
  const [cherche, setCherche] = useState(initial ?? "");
  const [texte, setTexte] = useState("");
  // Les alertes vivent dans le navigateur : on ne cherche qu'après le montage pour que
  // le rendu serveur et le premier rendu client soient identiques.
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);
  const c = cherche.trim().toUpperCase();
  const a = monte && c ? alertes.find((x) => x.code === c) : undefined;
  const chercher = (e: FormEvent) => { e.preventDefault(); setCherche(code); };
  return (
    <PublicShell titre="Signalement">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Suivi</div>
          <h1 className="font-display text-2xl font-bold text-primary">Suivre mon signalement</h1>
        </div>
        <form onSubmit={chercher} className="flex gap-2">
          <label className="sr-only" htmlFor="code-suivi">Code de suivi</label>
          <input id="code-suivi" className={cn(inputClass, "font-mono uppercase tracking-widest")} value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCDE-FGHIJ" />
          <Button type="submit"><Search /> Retrouver</Button>
        </form>
        {monte && c && !a && <p className="text-sm text-destructive">Aucun signalement avec ce code. Vérifiez les lettres et les chiffres.</p>}
        {a && (
          <>
            <Panel title={<span className="flex flex-wrap items-center gap-2">Dossier {a.numero} <PastilleNiveau n={a.niveau} /> <PastilleStatut a={a} /></span>} description={`${a.categorie} · déposé le ${new Date(a.creeLe).toLocaleDateString("fr-FR")}`}>
              <p className="text-sm">{a.description}</p>
              {a.inspection && <p className="mt-3 rounded-md bg-gold/15 px-3 py-2 text-sm font-semibold text-primary">Inspection programmée à {a.inspection.port} le {new Date(a.inspection.date).toLocaleDateString("fr-FR")}.</p>}
              {a.conclusion && <p className="mt-3 rounded-md bg-success/10 px-3 py-2 text-sm">Conclusion : {a.conclusion}</p>}
            </Panel>
            <Panel title="Échanges">
              <FilAlerte a={a} vueDeclarant />
              {a.statut !== "cloturee" && (
                <form onSubmit={(e) => { e.preventDefault(); if (texte.trim()) { repondre(a.id, "declarant", "Déclarant", texte.trim()); setTexte(""); } }} className="mt-4 space-y-2">
                  <label htmlFor="complement" className="text-sm font-medium">Ajouter une précision ou répondre</label>
                  <textarea id="complement" className={cn(textareaClass, "min-h-20")} value={texte} onChange={(e) => setTexte(e.target.value)} />
                  <Button type="submit" size="sm" disabled={!texte.trim()}><Send /> Envoyer</Button>
                </form>
              )}
            </Panel>
          </>
        )}
        <p className="text-sm"><Link to="/signaler" className="font-semibold text-primary hover:underline">Faire un nouveau signalement</Link></p>
      </div>
    </PublicShell>
  );
}
