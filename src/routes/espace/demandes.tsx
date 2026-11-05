import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Archive, CalendarDays, Inbox, MapPin, Phone, QrCode, UserPlus } from "lucide-react";
import { RequirePerm } from "@/components/dgmm/Guard";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/dgmm/Page";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STATIONS } from "@/lib/dgmm/maritime";
import { journaliser, useMarins } from "@/lib/dgmm/store";
import { traiterPreInscription, useInscriptions, type StatutPre } from "@/lib/dgmm/inscriptions";
import type { Account } from "@/lib/dgmm/auth";

export const Route = createFileRoute("/espace/demandes")({
  head: () => ({ meta: [{ title: "Pré-inscriptions — GDM | DGMM" }] }),
  component: () => <RequirePerm perm="marins.enroler">{(s) => <Demandes session={s} />}</RequirePerm>,
});

const LIBELLE: Record<StatutPre, string> = { en_attente: "À recevoir", convertie: "Dossier créé", classee: "Classée" };
const STYLE: Record<StatutPre, string> = {
  en_attente: "bg-warning/15 text-warning",
  convertie: "bg-success/12 text-success",
  classee: "bg-muted text-muted-foreground",
};

function Demandes({ session }: { session: Account }) {
  const { pre } = useInscriptions();
  const marins = useMarins();
  const navigate = useNavigate();
  const [filtre, setFiltre] = useState<StatutPre | "tous">("en_attente");
  const [filtreStation, setFiltreStation] = useState("toutes");
  const [filtreEntreprise, setFiltreEntreprise] = useState("toutes");
  const [codeRecu, setCodeRecu] = useState("");
  const [demandeConvertie, setDemandeConvertie] = useState<number | null>(null);
  const [classer, setClasser] = useState<number | null>(null);
  const [motif, setMotif] = useState("");
  const liste = pre.filter(
    (p) =>
      (filtre === "tous" || p.statut === filtre) &&
      (filtreStation === "toutes" || p.station === filtreStation) &&
      (filtreEntreprise === "toutes" || p.entreprise === filtreEntreprise),
  );
  const entreprises = [...new Set(pre.map((p) => p.entreprise).filter(Boolean))].sort();
  const n = (s: StatutPre) => pre.filter((p) => p.statut === s).length;
  const scanner = (event: FormEvent) => {
    event.preventDefault();
    const numero = codeRecu.trim().toUpperCase().replace(/^DGMM-PRE:/, "");
    const demande = pre.find((p) => p.numero.toUpperCase() === numero);
    setDemandeConvertie(null);
    if (!demande) {
      toast.error("Récépissé inconnu", { description: `Aucune demande trouvée pour ${numero || "ce code"}.` });
      return;
    }
    if (demande.statut === "en_attente") {
      navigate({ to: "/espace/marins/nouveau", search: { demande: demande.id } });
      return;
    }
    if (demande.statut === "convertie" && demande.marinId) {
      setDemandeConvertie(demande.id);
      return;
    }
    toast.error("Demande classée", {
      description: demande.motif || "Cette demande ne peut pas être convertie.",
    });
  };
  const stationsFiltrables = [
    { code: "ST-OWE", label: "Owendo" },
    { code: "ST-POG", label: "Port-Gentil" },
    { code: "ST-GAM", label: "Gamba" },
    { code: "ST-MAY", label: "Mayumba" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Enrôlement"
        title="Pré-inscriptions en ligne"
        subtitle="Demandes déposées par les futurs marins. Recevez la personne à la station, puis créez son dossier à partir de la demande."
        actions={<Link to="/inscription/marin" className="text-sm font-semibold text-primary hover:underline">Voir le formulaire public</Link>}
      />
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="À recevoir" value={n("en_attente")} icon={Inbox} tone="warning" />
        <StatCard label="Dossiers créés" value={n("convertie")} icon={UserPlus} tone="success" />
        <StatCard label="Classées" value={n("classee")} icon={Archive} />
      </div>
      <Panel title="Accès rapide — récépissé marin" className="mb-5">
        <form onSubmit={scanner} className="flex flex-col gap-2 sm:flex-row">
          <label className="field-dgmm flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md bg-card px-3">
            <QrCode className="size-4 text-secondary" />
            <span className="sr-only">Scanner ou saisir un QR Code récépissé</span>
            <input
              value={codeRecu}
              onChange={(e) => setCodeRecu(e.target.value)}
              placeholder="Scanner ou saisir PRE-2026-0004"
              className="h-full min-w-0 flex-1 bg-transparent font-mono text-sm uppercase outline-none"
            />
          </label>
          <Button type="submit" variant="gold" className="h-11">
            <QrCode /> Ouvrir le dossier
          </Button>
        </form>
        {demandeConvertie !== null && (() => {
          const demande = pre.find((p) => p.id === demandeConvertie);
          const marin = marins.find((m) => m.id === demande?.marinId);
          if (!demande?.marinId) return null;
          return (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-success/8 p-3 text-sm">
              <span className="font-medium text-success">
                Dossier déjà créé — NIP {marin?.nip ?? "non disponible"}
              </span>
              <Button asChild size="sm" variant="outline">
                <Link to="/espace/marins/$id" params={{ id: String(demande.marinId) }}>
                  Ouvrir la fiche marin
                </Link>
              </Button>
            </div>
          );
        })()}
      </Panel>
      <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Filtrer les demandes">
        {(["en_attente", "convertie", "classee", "tous"] as const).map((s) => (
          <button key={s} type="button" role="radio" aria-checked={filtre === s} onClick={() => setFiltre(s)} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", filtre === s ? "border-gold bg-gold text-gold-foreground" : "hover:border-gold")}>
            {s === "tous" ? "Toutes" : LIBELLE[s]}
          </button>
        ))}
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-muted-foreground">
          Station maritime
          <select
            value={filtreStation}
            onChange={(e) => setFiltreStation(e.target.value)}
            className="field-dgmm mt-1 h-10 w-full rounded-md bg-card px-3 text-sm font-normal text-foreground"
          >
            <option value="toutes">Toutes les stations</option>
            {stationsFiltrables.map((station) => (
              <option key={station.code} value={station.code}>{station.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Armateur / Compagnie maritime
          <select
            value={filtreEntreprise}
            onChange={(e) => setFiltreEntreprise(e.target.value)}
            className="field-dgmm mt-1 h-10 w-full rounded-md bg-card px-3 text-sm font-normal text-foreground"
          >
            <option value="toutes">Toutes les compagnies</option>
            {entreprises.map((entreprise) => (
              <option key={entreprise} value={entreprise}>{entreprise}</option>
            ))}
          </select>
        </label>
      </div>
      <Panel bodyClassName="p-0">
        {liste.length === 0 ? (
          <EmptyState icon={Inbox} title="Aucune demande">Les pré-inscriptions déposées en ligne apparaîtront ici.</EmptyState>
        ) : (
          <ul className="divide-y">
            {liste.map((p) => {
              const st = STATIONS.find((s) => s.code === p.station);
              return (
                <li key={p.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-primary">{p.nom} {p.prenom}</span>
                        <span className="font-mono text-xs text-muted-foreground">{p.numero}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STYLE[p.statut])}>{LIBELLE[p.statut]}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{p.profession}{p.entreprise ? ` · ${p.entreprise}` : ""}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{st?.ville ?? p.station}</span>
                        <span className="inline-flex items-center gap-1"><Phone className="size-3" />{p.tel}</span>
                        <span className="inline-flex items-center gap-1"><CalendarDays className="size-3" />{p.rdv ? `RDV souhaité le ${new Date(p.rdv).toLocaleDateString("fr-FR")}` : "Pas de date souhaitée"}</span>
                        <span>Déposée le {new Date(p.creeLe).toLocaleDateString("fr-FR")}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Pièces fournies">
                        {([
                          ["CNI", p.documents?.piece ?? p.pieces?.[0]],
                          ["Photo", p.documents?.photo ?? p.pieces?.[1]],
                          ["STCW", p.documents?.stcw ?? p.pieces?.[2]],
                        ] as const).map(([label, piece]) => (
                          <span
                            key={label}
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              piece ? "bg-success/12 text-success" : "bg-muted text-muted-foreground",
                            )}
                          >
                            {label} : {piece ? "Oui" : "Non"}
                          </span>
                        ))}
                      </div>
                      {p.motif && <p className="mt-1 text-xs text-muted-foreground">Motif : {p.motif}</p>}
                    </div>
                    {p.statut === "en_attente" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setClasser(p.id); setMotif(""); }}>Classer</Button>
                        <Button asChild size="sm" variant="gold">
                          <Link to="/espace/marins/nouveau" search={{ demande: p.id }}><UserPlus /> Créer le dossier</Link>
                        </Button>
                      </div>
                    )}
                    {p.statut === "convertie" && p.marinId && (
                      <Button asChild size="sm" variant="outline"><Link to="/espace/marins/$id" params={{ id: String(p.marinId) }}>Ouvrir le dossier</Link></Button>
                    )}
                  </div>
                  {classer === p.id && (
                    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-muted/50 p-3">
                      <label className="min-w-60 flex-1 text-xs font-medium">
                        Motif du classement
                        <input id={`motif-${p.id}`} className="field-dgmm mt-1 h-9 w-full rounded-md bg-card px-3 text-sm" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. personne non présentée au rendez-vous" />
                      </label>
                      <Button size="sm" variant="ghost" onClick={() => setClasser(null)}>Annuler</Button>
                      <Button size="sm" variant="destructive" disabled={!motif.trim()} onClick={() => { traiterPreInscription(p.id, { statut: "classee", motif: motif.trim(), traitePar: session.nom }); journaliser(session.nom, `Pré-inscription ${p.numero} classée : ${motif.trim()}`, `${p.nom} ${p.prenom}`); setClasser(null); toast.success("Demande classée"); }}>Classer la demande</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
