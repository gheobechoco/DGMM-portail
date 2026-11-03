import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowLeft, FileSignature, Plane, Plus, UserX } from "lucide-react";
import { PublicShell } from "@/components/dgmm/PublicShell";
import { EmptyState, Field, Panel, StatCard, inputClass, selectClass } from "@/components/dgmm/Page";
import { Button } from "@/components/ui/button";
import { ContratDocument, Echeancier, ListeControles, StatutContrat } from "@/components/dgmm/ContratVue";
import { cn } from "@/lib/utils";
import { armateurSession, useArmateur } from "@/lib/dgmm/auth";
import { armateur as getArmateur, type Navire } from "@/lib/dgmm/maritime";
import { fullName, useMarins, useVisites } from "@/lib/dgmm/store";
import {
  NAVIGATION_LIBELLE,
  REGLES,
  controles,
  declarerVersement,
  organiserRapatriement,
  proposerContrat,
  statut,
  useContrats,
  type Contrat,
  type Navigation,
} from "@/lib/dgmm/contrats";

export const Route = createFileRoute("/armateur/contrats")({
  head: () => ({ meta: [{ title: "Contrats d'engagement — Espace Armateurs | DGMM" }] }),
  component: ContratsArmateur,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);

function ContratsArmateur() {
  const a = useArmateur();
  const marins = useMarins();
  const visites = useVisites();
  const contrats = useContrats().filter((c) => a && c.armateur === a.entreprise);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [creer, setCreer] = useState(false);
  if (!a) {
    return (
      <PublicShell titre="Espace Armateurs">
        <Panel><p className="text-sm">Connectez-vous à l'Espace Armateurs pour gérer vos contrats. <Link to="/armateur" className="font-semibold text-primary hover:underline">Se connecter</Link></p></Panel>
      </PublicShell>
    );
  }
  const effectif = marins.filter((m) => m.entreprise === a.entreprise);
  const sansContrat = effectif.filter((m) => !contrats.some((c) => c.marinId === m.id && statut(c) === "actif"));
  const c = contrats.find((x) => x.id === ouvert);

  return (
    <PublicShell titre="Espace Armateurs" utilisateur={<><div className="font-semibold">{a.entreprise}</div><div className="text-primary-foreground/70">{a.contact}</div></>} onLogout={() => armateurSession.write(null)}>
      <Link to="/armateur" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" /> Tableau de bord</Link>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Contrats d'engagement maritime</div>
          <h1 className="font-display text-2xl font-bold text-primary">{a.entreprise}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Le contrat suit le modèle officiel de la DGMM : vous renseignez les conditions, le marin signe sur son espace, puis l'inspecteur valide.</p>
        </div>
        <Button variant="gold" onClick={() => { setCreer(true); setOuvert(null); }}><Plus /> Nouveau contrat</Button>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="En vigueur" value={contrats.filter((x) => statut(x) === "actif").length} icon={FileSignature} tone="success" />
        <StatCard label="En cours de signature" value={contrats.filter((x) => ["attente_marin", "attente_dgmm"].includes(statut(x))).length} icon={FileSignature} tone="warning" />
        <StatCard label="Marins rattachés sans contrat" value={sansContrat.length} icon={UserX} tone={sansContrat.length ? "danger" : "primary"} hint={sansContrat.slice(0, 3).map(fullName).join(", ")} />
        <StatCard label="Rapatriements à organiser" value={contrats.filter((x) => x.rapatriement?.statut === "demande").length} icon={Plane} />
      </div>
      {creer && <NouveauContrat entreprise={a.entreprise} navires={getArmateur(a.entreprise)?.navires ?? a.navires ?? []} onFini={(id) => { setCreer(false); setOuvert(id); }} onAnnuler={() => setCreer(false)} />}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Panel bodyClassName="p-0">
          {contrats.length === 0 ? (
            <EmptyState icon={FileSignature} title="Aucun contrat">Créez le premier contrat d'engagement de vos marins.</EmptyState>
          ) : (
            <ul className="divide-y">
              {contrats.map((x) => (
                <li key={x.id}>
                  <button type="button" onClick={() => { setOuvert(x.id); setCreer(false); }} className={cn("flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-muted/40", ouvert === x.id && "bg-gold/10")}>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-primary">{x.marinNom}</div>
                      <div className="text-xs text-muted-foreground">{x.numero} · {x.fonction} · jusqu'au {new Date(x.dateFin).toLocaleDateString("fr-FR")}</div>
                      {x.rapatriement?.statut === "demande" && <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-warning"><Plane className="size-3.5" /> Rapatriement demandé</div>}
                    </div>
                    <StatutContrat c={x} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {c && (
          <div className="space-y-4">
            {c.rapatriement?.statut === "demande" && (
              <Panel title="Demande de rapatriement">
                <p className="text-sm">{c.marinNom} demande son rapatriement : {c.rapatriement.motif}</p>
                <Button className="mt-3" size="sm" variant="secondary" onClick={() => { organiserRapatriement(c.id); toast.success("Rapatriement marqué comme organisé"); }}><Plane /> Rapatriement organisé</Button>
              </Panel>
            )}
            {statut(c) === "actif" && (
              <Panel title="Salaire et cotisations" description="Déclarez chaque mois le versement : le marin et la DGMM le voient aussitôt.">
                <Echeancier c={c} onDeclarer={(mois) => { declarerVersement(c.id, mois); toast.success("Versement déclaré"); }} />
              </Panel>
            )}
            <ContratDocument c={c} />
          </div>
        )}
      </div>
    </PublicShell>
  );
}

function NouveauContrat({ entreprise, navires, onFini, onAnnuler }: { entreprise: string; navires: Navire[]; onFini: (id: number) => void; onAnnuler: () => void }) {
  const marins = useMarins();
  const visites = useVisites();
  const flotte = navires;
  const debut = new Date();
  const fin = new Date(); fin.setMonth(fin.getMonth() + 6);
  const [nip, setNip] = useState("");
  const [f, setF] = useState({ navire: flotte[0]?.nom ?? "", fonction: "", navigation: "cabotage" as Navigation, dateDebut: iso(debut), dateFin: iso(fin), salaireBase: "250000", primeRisque: "0", indemniteNourriture: "60000", indemniteLogement: "50000", heuresHebdo: "56", congesJoursMois: "2.5", portRapatriement: "Port-Gentil", rapatriementArmateur: true, numeroCNSS: "" });
  const up = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));
  const marin = marins.find((m) => m.nip.toUpperCase() === nip.trim().toUpperCase());
  const brouillon: Contrat | null = useMemo(() => marin ? {
    id: 0, numero: "CEM (projet)", marinId: marin.id, nip: marin.nip, marinNom: fullName(marin), armateur: entreprise, navire: f.navire, fonction: f.fonction || marin.profession,
    navigation: f.navigation, dateDebut: f.dateDebut, dateFin: f.dateFin, salaireBase: Number(f.salaireBase) || 0, primeRisque: Number(f.primeRisque) || 0,
    indemniteNourriture: Number(f.indemniteNourriture) || 0, indemniteLogement: Number(f.indemniteLogement) || 0, heuresHebdo: Number(f.heuresHebdo) || 0,
    congesJoursMois: Number(String(f.congesJoursMois).replace(",", ".")) || 0, portRapatriement: f.portRapatriement, rapatriementArmateur: f.rapatriementArmateur, numeroCNSS: f.numeroCNSS,
    creeLe: "", signatures: {}, versements: [],
  } : null, [marin, f, entreprise]);
  const ctrl = brouillon ? controles(brouillon, marin, visites) : [];
  const envoyer = (e: FormEvent) => {
    e.preventDefault();
    if (!brouillon || !marin) return;
    const { id: _i, numero: _n, creeLe: _c, signatures: _s, versements: _v, ...d } = brouillon;
    const c = proposerContrat(d);
    toast.success(`Contrat ${c.numero} signé et envoyé au marin`, { description: "Il le recevra dans son Espace Marin pour signature." });
    onFini(c.id);
  };
  const effectif = marins.filter((m) => m.entreprise === entreprise);
  return (
    <Panel title="Nouveau contrat d'engagement" description="Seules les conditions variables sont à saisir : les clauses sont celles du modèle DGMM." className="mb-6">
      <form onSubmit={envoyer} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Marin (NIP)" htmlFor="cem-nip" required hint={marin ? `${fullName(marin)} · ${marin.profession}` : "Saisissez ou choisissez un NIP"}>
            <input id="cem-nip" list="cem-effectif" className={inputClass} value={nip} onChange={(e) => setNip(e.target.value)} placeholder="GAB-2024-001284" />
            <datalist id="cem-effectif">{effectif.map((m) => <option key={m.id} value={m.nip}>{fullName(m)}</option>)}</datalist>
          </Field>
          <Field label="Navire" htmlFor="cem-navire">
            <select id="cem-navire" className={selectClass} value={f.navire} onChange={(e) => up("navire", e.target.value)}><option value="">À désigner</option>{flotte.map((n) => <option key={n.imo}>{n.nom}</option>)}</select>
          </Field>
          <Field label="Fonction à bord" htmlFor="cem-fonction"><input id="cem-fonction" className={inputClass} value={f.fonction} onChange={(e) => up("fonction", e.target.value)} placeholder={marin?.profession ?? "Matelot"} /></Field>
          <Field label="Type de navigation" htmlFor="cem-nav"><select id="cem-nav" className={selectClass} value={f.navigation} onChange={(e) => up("navigation", e.target.value)}>{(Object.keys(NAVIGATION_LIBELLE) as Navigation[]).map((k) => <option key={k} value={k}>{NAVIGATION_LIBELLE[k]}</option>)}</select></Field>
          <Field label="Début" htmlFor="cem-debut"><input id="cem-debut" type="date" className={inputClass} value={f.dateDebut} onChange={(e) => up("dateDebut", e.target.value)} /></Field>
          <Field label="Fin" htmlFor="cem-fin" hint={`${REGLES.dureeMaxMois} mois au plus`}><input id="cem-fin" type="date" className={inputClass} value={f.dateFin} onChange={(e) => up("dateFin", e.target.value)} /></Field>
          <Field label="Salaire de base mensuel (FCFA)" htmlFor="cem-salaire"><input id="cem-salaire" inputMode="numeric" className={inputClass} value={f.salaireBase} onChange={(e) => up("salaireBase", e.target.value)} /></Field>
          <Field label="Prime de risque mensuelle (FCFA)" htmlFor="cem-prime" hint="Obligatoire en offshore selon votre convention"><input id="cem-prime" inputMode="numeric" className={inputClass} value={f.primeRisque} onChange={(e) => up("primeRisque", e.target.value)} /></Field>
          <Field label="Indemnité de nourriture (FCFA)" htmlFor="cem-nourriture"><input id="cem-nourriture" inputMode="numeric" className={inputClass} value={f.indemniteNourriture} onChange={(e) => up("indemniteNourriture", e.target.value)} /></Field>
          <Field label="Indemnité de logement (FCFA)" htmlFor="cem-logement"><input id="cem-logement" inputMode="numeric" className={inputClass} value={f.indemniteLogement} onChange={(e) => up("indemniteLogement", e.target.value)} /></Field>
          <Field label="Heures de travail par semaine" htmlFor="cem-heures"><input id="cem-heures" inputMode="numeric" className={inputClass} value={f.heuresHebdo} onChange={(e) => up("heuresHebdo", e.target.value)} /></Field>
          <Field label="Jours de congés par mois" htmlFor="cem-conges"><input id="cem-conges" inputMode="decimal" className={inputClass} value={f.congesJoursMois} onChange={(e) => up("congesJoursMois", e.target.value)} /></Field>
          <Field label="Port de rapatriement" htmlFor="cem-port"><input id="cem-port" className={inputClass} value={f.portRapatriement} onChange={(e) => up("portRapatriement", e.target.value)} /></Field>
          <Field label="N° d'affiliation CNSS du marin" htmlFor="cem-cnss"><input id="cem-cnss" className={inputClass} value={f.numeroCNSS} onChange={(e) => up("numeroCNSS", e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input id="cem-rapat" type="checkbox" checked={f.rapatriementArmateur} onChange={(e) => up("rapatriementArmateur", e.target.checked)} /> Le rapatriement est à la charge de la compagnie</label>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="mb-2 text-sm font-semibold text-primary">Contrôle avant envoi</div>
            {brouillon ? <ListeControles controles={ctrl} /> : <p className="text-sm text-muted-foreground">Choisissez d'abord le marin.</p>}
          </div>
          <p className="text-xs text-muted-foreground">En envoyant, vous signez le contrat au nom de {entreprise}. Il ne pourra plus être modifié : toute correction passera par un nouveau contrat.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={onAnnuler}>Annuler</Button>
            <Button type="submit" variant="gold" disabled={!brouillon || ctrl.some((k) => !k.ok)} title={ctrl.some((k) => !k.ok) ? "Corrigez les points en rouge" : undefined}><FileSignature /> Signer et envoyer au marin</Button>
          </div>
        </div>
      </form>
    </Panel>
  );
}
