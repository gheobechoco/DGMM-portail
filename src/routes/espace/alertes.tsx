import { BarreFiltres, FiltreSelect, Pagination, usePagination } from "@/components/dgmm/Listes";
import { Aide } from "@/components/dgmm/Aide";
import { LienStatistiques } from "@/components/dgmm/Statistiques";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ClipboardCheck, EyeOff, FileSignature, Hourglass, Send, ShieldAlert, Siren, Users } from "lucide-react";
import { RequirePerm } from "@/components/dgmm/Guard";
import { EmptyState, PageHeader, Panel, StatCard, textareaClass } from "@/components/dgmm/Page";
import { Button } from "@/components/ui/button";
import { FilAlerte, PastilleNiveau, PastilleStatut } from "@/components/dgmm/AlerteVue";
import { StatutContrat } from "@/components/dgmm/ContratVue";
import { cn } from "@/lib/utils";
import { can } from "@/lib/dgmm/rules";
import type { Account } from "@/lib/dgmm/auth";
import { STATIONS } from "@/lib/dgmm/maritime";
import { fullName, marinCertStatus, useMarins, useRoles, useVisites } from "@/lib/dgmm/store";
import { statut as statutContrat, useContrats } from "@/lib/dgmm/contrats";
import { useInscriptions } from "@/lib/dgmm/inscriptions";
import { nomNormalise } from "@/lib/dgmm/registre";
import { etatNavire, registreNavires, useInspections } from "@/lib/dgmm/navires";
import { PastilleEtat } from "@/components/dgmm/NavireBits";
import { cloturer, destinataires, emetteurDe, heuresSansReponse, marquerLu, programmerInspection, repondre, useAlertes, visiblePour, type Niveau, type StatutAlerte } from "@/lib/dgmm/alertes";

export const Route = createFileRoute("/espace/alertes")({
  head: () => ({ meta: [{ title: "Alertes des gens de mer — GDM | DGMM" }] }),
  component: () => <RequirePerm perm="alertes">{(s) => <Alertes session={s} />}</RequirePerm>,
});

const DELAI_ROUGE = 24; // heures : au-delà, une alerte rouge sans réponse est signalée en retard

function Alertes({ session }: { session: Account }) {
  const toutes = useAlertes();
  const alertes = useMemo(() => toutes.filter((a) => visiblePour(a, session)), [toutes, session]);
  const traiter = can(session.role, "alertes.traiter");
  const qui = emetteurDe(session);
  const [niveau, setNiveau] = useState<Niveau | "tous">("tous");
  const [etat, setEtat] = useState<StatutAlerte | "ouvertes">("ouvertes");
  const [ouvert, setOuvert] = useState<number | null>(null);
  const liste = alertes
    .filter((a) => (niveau === "tous" || a.niveau === niveau) && (etat === "ouvertes" ? a.statut !== "cloturee" : a.statut === etat))
    .sort((x, y) => ({ rouge: 0, orange: 1, vert: 2 })[x.niveau] - ({ rouge: 0, orange: 1, vert: 2 })[y.niveau] || y.creeLe.localeCompare(x.creeLe));
  const pg = usePagination(liste, 8);
  const a = alertes.find((x) => x.id === ouvert);
  useEffect(() => { if (a) marquerLu(a.id, qui); }, [a, qui]);
  const ouvertes = alertes.filter((x) => x.statut !== "cloturee");
  const rougesEnRetard = ouvertes.filter((x) => x.niveau === "rouge" && (heuresSansReponse(x) ?? 0) >= DELAI_ROUGE);

  return (
    <>
      <PageHeader
        eyebrow="Sécurité et droits des marins"
        title="Alertes des gens de mer"
        aides={["feux", "anonymat"]}
        stats={<LienStatistiques theme="alertes" texte="Alertes par gravité, délais de réponse et anonymat" />}
      />
      <BarreFiltres>
        <FiltreSelect<Niveau | "tous">
          id="filtre-gravite"
          label="Gravité"
          value={niveau}
          onChange={setNiveau}
          options={[
            { value: "tous", label: "Toutes gravités", n: alertes.length },
            { value: "rouge", label: "Rouge — danger grave", n: alertes.filter((x) => x.niveau === "rouge").length },
            { value: "orange", label: "Orange — technique", n: alertes.filter((x) => x.niveau === "orange").length },
            { value: "vert", label: "Vert — social", n: alertes.filter((x) => x.niveau === "vert").length },
          ]}
        />
        <FiltreSelect<StatutAlerte | "ouvertes">
          id="filtre-etat"
          label="État"
          value={etat}
          onChange={setEtat}
          options={[
            { value: "ouvertes", label: "Ouvertes", n: alertes.filter((x) => x.statut !== "cloturee").length },
            { value: "recue", label: "Reçues", n: alertes.filter((x) => x.statut === "recue").length },
            { value: "en_traitement", label: "En traitement", n: alertes.filter((x) => x.statut === "en_traitement").length },
            { value: "inspection_programmee", label: "Inspection programmée", n: alertes.filter((x) => x.statut === "inspection_programmee").length },
            { value: "cloturee", label: "Clôturées", n: alertes.filter((x) => x.statut === "cloturee").length },
          ]}
        />
      </BarreFiltres>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
        <Panel bodyClassName="p-0">
          {liste.length === 0 ? (
            <EmptyState icon={Siren} title="Aucune alerte dans cette catégorie" />
          ) : (
            <ul className="divide-y">
              {pg.visibles.map((x) => {
                const h = heuresSansReponse(x);
                return (
                  <li key={x.id}>
                    <button type="button" onClick={() => setOuvert(x.id)} className={cn("w-full px-5 py-3 text-left hover:bg-muted/40", ouvert === x.id && "bg-gold/10", x.niveau === "rouge" && x.statut !== "cloturee" && "border-l-4 border-l-destructive")}>
                      <div className="flex flex-wrap items-center gap-2"><PastilleNiveau n={x.niveau} /><PastilleStatut a={x} />{x.anonyme && <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><EyeOff className="size-3" /> Anonyme</span>}</div>
                      <div className="mt-1.5 font-semibold text-primary">{x.categorie}</div>
                      <div className="text-xs text-muted-foreground">{x.numero} · {[x.navire, x.armateur, x.lieu].filter(Boolean).join(" · ")}</div>
                      {h !== null && <div className={cn("mt-1 text-xs font-semibold", x.niveau === "rouge" && h >= DELAI_ROUGE ? "text-destructive" : "text-warning")}>Sans réponse depuis {h < 48 ? `${h} h` : `${Math.floor(h / 24)} jours`}</div>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <Pagination {...pg} />
        </Panel>
        {a ? <Detail key={a.id} id={a.id} session={session} traiter={traiter} /> : <Panel><EmptyState icon={Siren} title="Choisissez une alerte">Le détail, les preuves, l'équipage du navire et les contrats de la compagnie s'affichent ici.</EmptyState></Panel>}
      </div>
    </>
  );
}

function Detail({ id, session, traiter }: { id: number; session: Account; traiter: boolean }) {
  const a = useAlertes().find((x) => x.id === id)!;
  const roles = useRoles();
  const marins = useMarins();
  const visites = useVisites();
  const contrats = useContrats();
  const [texte, setTexte] = useState("");
  const [port, setPort] = useState(STATIONS[2]?.ville ?? "Port-Gentil");
  const [date, setDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [conclusion, setConclusion] = useState("");
  const qui = emetteurDe(session);

  // Croisement : dernier rôle d'équipage déclaré pour ce navire, et contrats de la compagnie.
  const role = roles.filter((r) => a.navire && r.navire.toLowerCase() === a.navire.toLowerCase()).sort((x, y) => y.appareillage.localeCompare(x.appareillage))[0];
  const armateur = role?.armateur ?? a.armateur;
  const equipage = (role?.membres ?? []).map((mb) => ({ ...mb, m: marins.find((m) => m.id === mb.marinId) }));
  const contratsArmateur = contrats.filter((c) => armateur && c.armateur.toLowerCase() === armateur.toLowerCase());
  // Navire signalé au registre : état de ses certificats et accès direct à son inspection.
  const { armateurs: demandesArm } = useInscriptions();
  const inspections = useInspections();
  const ficheNavire = a.navire ? registreNavires(demandesArm).find((n) => nomNormalise(n.nom) === nomNormalise(a.navire)) : undefined;
  const securite = ficheNavire ? etatNavire(inspections, ficheNavire.id) : null;
  const inspecteur = can(session.role, "navires.inspection");

  return (
    <div className="space-y-4">
      <Panel title={<span className="flex flex-wrap items-center gap-2">{a.numero} <PastilleNiveau n={a.niveau} /> <PastilleStatut a={a} /></span>} description={`${a.categorie} · faits du ${new Date(a.dateFaits).toLocaleDateString("fr-FR")} · reçu le ${new Date(a.creeLe).toLocaleString("fr-FR")}`}>
        <dl className="mb-3 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-muted-foreground">Navire</dt><dd className="font-medium">{a.navire || "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Compagnie</dt><dd className="font-medium">{a.armateur || "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Lieu</dt><dd className="font-medium">{a.lieu || "—"}</dd></div>
        </dl>
        <p className="whitespace-pre-line text-sm">{a.description}</p>
        {a.pieces.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {a.pieces.map((p, i) => p.type.startsWith("image/") ? (
              <a key={i} href={p.data} target="_blank" rel="noreferrer" className="block size-24 overflow-hidden rounded-lg border"><img src={p.data} alt={p.nom} className="size-full object-cover" /></a>
            ) : (
              <video key={i} src={p.data} controls className="h-24 rounded-lg border" />
            ))}
          </div>
        )}
        <div className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <div><strong className="text-foreground">Déclarant :</strong> {a.anonyme ? "anonyme (aucune donnée d'identité conservée)" : a.declarant}</div>
          <div><strong className="text-foreground">Transmis à :</strong> {destinataires().join(" · ")}</div>
        </div>
      </Panel>

      <Panel title="Croisement avec l'équipage et les contrats" description="Pour une intervention ciblée : qui était à bord, et sous quel contrat.">
        {role ? (
          <>
            <p className="text-sm">Dernier rôle d'équipage déclaré par <strong>{role.armateur}</strong> pour {role.navire} (appareillage du {new Date(role.appareillage).toLocaleDateString("fr-FR")}) :</p>
            <ul className="mt-2 divide-y rounded-lg border text-sm">
              {equipage.map(({ m, fonction, marinId }) => {
                const c = contrats.find((x) => x.marinId === marinId && x.armateur === role.armateur && statutContrat(x) === "actif");
                const cert = m ? marinCertStatus(visites, m.id) : "aucun";
                return (
                  <li key={marinId} className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <span className="min-w-0 flex-1"><span className="font-medium">{m ? fullName(m) : `Marin n° ${marinId}`}</span> <span className="text-xs text-muted-foreground">· {fonction}</span></span>
                    <span className={cn("text-xs font-semibold", cert === "valide" || cert === "expire_bientot" ? "text-success" : "text-destructive")}>{cert === "valide" || cert === "expire_bientot" ? "Apte" : "Aptitude non valide"}</span>
                    {c ? <StatutContrat c={c} /> : <span className="rounded-full bg-destructive/12 px-2 py-0.5 text-xs font-semibold text-destructive">Sans contrat en vigueur</span>}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun rôle d'équipage déclaré pour ce navire dans le portail.</p>
        )}
        {armateur && (
          <p className="mt-3 flex items-center gap-2 text-sm"><FileSignature className="size-4 text-muted-foreground" /> {armateur} : {contratsArmateur.filter((c) => statutContrat(c) === "actif").length} contrat(s) en vigueur, {contratsArmateur.filter((c) => c.rapatriement?.statut === "demande").length} rapatriement(s) demandé(s).</p>
        )}
      </Panel>

      <Panel title="Certificats de sécurité du navire" description={a.niveau === "vert" ? "Alerte sociale : le navire n'est pas forcément en cause." : "Alerte technique ou danger : vérifiez les certificats et inspectez le navire."}>
        {ficheNavire && securite ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-primary">{ficheNavire.nom}</span>
            <PastilleEtat etat={securite.etat} jours={securite.jours} />
            {securite.derniere && <span className="text-xs text-muted-foreground">Dernière inspection le {new Date(securite.derniere.date + "T12:00:00").toLocaleDateString("fr-FR")} à {securite.derniere.port}</span>}
            <Button asChild size="sm" variant={a.niveau === "rouge" ? "destructive" : "outline"} className="ml-auto">
              <Link to="/espace/navires" search={{ navire: ficheNavire.id, inspecter: inspecteur && a.statut !== "cloturee" ? true : undefined }}><ClipboardCheck /> {inspecteur && a.statut !== "cloturee" ? "Ouvrir l'inspection du navire" : "Voir la fiche du navire"}</Link>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Navire non trouvé au registre gabonais{a.navire ? ` (« ${a.navire} »)` : ""} : programmez l'inspection ci-dessous et identifiez le navire sur place.</p>
        )}
      </Panel>

      {traiter && a.statut !== "cloturee" && (
        <Panel title="Actions">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-lg border p-3">
              <div className="text-sm font-semibold text-primary">Programmer une inspection</div>
              <div className="flex flex-wrap gap-2">
                <select id="insp-port" className="field-dgmm h-9 flex-1 rounded-md bg-card px-2 text-sm" value={port} onChange={(e) => setPort(e.target.value)}>{STATIONS.map((s) => <option key={s.code}>{s.ville}</option>)}</select>
                <input id="insp-date" type="date" className="field-dgmm h-9 rounded-md bg-card px-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <Button size="sm" variant={a.niveau === "rouge" ? "destructive" : "secondary"} onClick={() => { programmerInspection(a.id, port, date, session.nom); toast.success(`Inspection programmée à ${port}`); }}><ClipboardCheck /> {a.niveau === "rouge" ? "Inspection d'urgence" : "Programmer"}</Button>
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <div className="text-sm font-semibold text-primary">Clôturer le dossier</div>
              <input id="conclusion" className="field-dgmm h-9 w-full rounded-md bg-card px-3 text-sm" value={conclusion} onChange={(e) => setConclusion(e.target.value)} placeholder="Ex. salaires régularisés, canot remplacé" />
              <Button size="sm" variant="outline" disabled={!conclusion.trim()} onClick={() => { cloturer(a.id, session.nom, conclusion.trim()); toast.success("Dossier clôturé"); }}><CheckCircle2 /> Clôturer</Button>
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Échanges avec le déclarant" description={a.anonyme ? "Le déclarant lit vos réponses avec son code de suivi." : undefined}>
        <FilAlerte a={a} />
        {a.statut !== "cloturee" && (
          <form onSubmit={(e) => { e.preventDefault(); if (texte.trim()) { repondre(a.id, qui, session.nom, texte.trim()); setTexte(""); toast.success("Réponse envoyée"); } }} className="mt-4 space-y-2">
            <label htmlFor="reponse" className="sr-only">Réponse</label>
            <textarea id="reponse" className={cn(textareaClass, "min-h-20")} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Votre réponse, visible par le déclarant" />
            <Button type="submit" size="sm" disabled={!texte.trim()}><Send /> Répondre</Button>
          </form>
        )}
      </Panel>
    </div>
  );
}
