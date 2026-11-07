import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { BarreFiltres, FiltreSelect } from "@/components/dgmm/Listes";
import { useMemo, type ReactNode } from "react";
import {
  AlertTriangle, Archive, BadgeCheck, BookOpenCheck, CheckCircle2, ClipboardList, Clock, FileClock, FileSignature, Inbox,
  KeyRound, Plane, ShieldCheck, ShieldX, Ship, Siren, Stethoscope, UserPlus, Users,
} from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/dgmm/Page";
import { Aide, type Terme } from "@/components/dgmm/Aide";
import { SectionStatistiques } from "@/components/dgmm/Statistiques";
import { MedicalDashboard, PilotageDashboard } from "@/components/dgmm/TableauxDeBord";
import { aptitudeAu } from "@/components/dgmm/RoleCard";
import { cn } from "@/lib/utils";
import { useSession, type Account } from "@/lib/dgmm/auth";
import { THEMES_STATS, themesPour, type ThemeStats } from "@/lib/dgmm/themesStats";
import { eligibleLivret, useAudit, useMarins, useRoles, useVisites, verifierAudit } from "@/lib/dgmm/store";
import { useInscriptions } from "@/lib/dgmm/inscriptions";
import { echeancier, statut, useContrats } from "@/lib/dgmm/contrats";
import { NIVEAUX, heuresSansReponse, useAlertes, visiblePour, type Niveau } from "@/lib/dgmm/alertes";
import { ETAT_NAVIRE, etatNavire, registreNavires, useInspections, type EtatNavire } from "@/lib/dgmm/navires";
import { STRUCTURES_MEDICALES, etatAgrement, medecinDeVisite, useMedecins } from "@/lib/dgmm/medecins";

export const Route = createFileRoute("/espace/statistiques")({
  validateSearch: (s: Record<string, unknown>): { theme?: ThemeStats | undefined } => ({
    theme: THEMES_STATS.some((t) => t.id === s["theme"]) ? (s["theme"] as ThemeStats) : undefined,
  }),
  head: () => ({ meta: [{ title: "Statistiques — GDM | DGMM" }] }),
  component: Page,
});

/** Répartition en barres horizontales, lisible sans graphique. */
function Barres({ lignes, couleur = "bg-primary" }: { lignes: { nom: string; n: number; couleur?: string | undefined }[]; couleur?: string }) {
  const max = Math.max(1, ...lignes.map((l) => l.n));
  return (
    <ul className="space-y-2">
      {lignes.map((l) => (
        <li key={l.nom} className="grid grid-cols-[minmax(0,10rem)_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="truncate text-muted-foreground">{l.nom}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-muted"><span className={cn("block h-full rounded-full", l.couleur ?? couleur)} style={{ width: `${(l.n / max) * 100}%` }} /></span>
          <span className="text-right font-semibold tabular-nums text-primary">{l.n}</span>
        </li>
      ))}
    </ul>
  );
}

function Theme({ titre, description, aide, children }: { titre: string; description: string; aide?: Terme | undefined; children: ReactNode }) {
  return (
    <SectionStatistiques titre={titre} description={description} aide={aide}>
      {children}
    </SectionStatistiques>
  );
}

function Page() {
  const session = useSession();
  return session ? <Statistiques session={session} /> : null;
}

function Statistiques({ session }: { session: Account }) {
  const { theme } = Route.useSearch();
  const navigate = useNavigate();
  const themes = themesPour(session.role);
  const actif = themes.find((t) => t.id === theme) ?? themes[0];
  return (
    <>
      <PageHeader
        eyebrow="Statistiques"
        title={actif ? actif.label : "Statistiques"}
        subtitle="Tous les indicateurs du portail, regroupés par thème. Les listes de travail restent sur les pages de chaque module."
      />
      {actif && (
        <BarreFiltres className="mb-0">
          <FiltreSelect id="theme-stats" label="Thème" value={actif.id} onChange={(t) => navigate({ to: "/espace/statistiques", search: { theme: t } })} options={themes.map((t) => ({ value: t.id, label: t.label }))} />
        </BarreFiltres>
      )}
      {!actif && <Panel><p className="text-sm text-muted-foreground">Aucune statistique n'est disponible pour votre profil.</p></Panel>}
      {actif?.id === "pilotage" && <PilotageDashboard session={session} vue="statistiques" />}
      {actif?.id === "medical" && <MedicalDashboard session={session} vue="statistiques" />}
      {actif?.id === "preinscriptions" && <StatsPreinscriptions />}
      {actif?.id === "livrets" && <StatsLivrets />}
      {actif?.id === "equipages" && <StatsEquipages />}
      {actif?.id === "navires" && <StatsNavires />}
      {actif?.id === "contrats" && <StatsContrats />}
      {actif?.id === "alertes" && <StatsAlertes session={session} />}
      {actif?.id === "medecins" && <StatsMedecins />}
      {actif?.id === "audit" && <StatsAudit />}
      {actif?.id === "systeme" && <StatsSysteme />}
    </>
  );
}

function StatsPreinscriptions() {
  const { pre } = useInscriptions();
  const n = (s: string) => pre.filter((p) => p.statut === s).length;
  const parStation = Object.entries(pre.reduce<Record<string, number>>((a, p) => ({ ...a, [p.station]: (a[p.station] ?? 0) + 1 }), {})).map(([nom, v]) => ({ nom, n: v }));
  return (
    <Theme titre="Pré-inscriptions en ligne" description="Demandes déposées par les futurs marins avant leur rendez-vous en station." aide="nip">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="À recevoir" value={n("en_attente")} icon={Inbox} tone="warning" />
        <StatCard label="Dossiers créés" value={n("convertie")} icon={UserPlus} tone="success" />
        <StatCard label="Classées" value={n("classee")} icon={Archive} />
      </div>
      {parStation.length > 0 && <Panel title="Demandes par station"><Barres lignes={parStation} /></Panel>}
    </Theme>
  );
}

function StatsLivrets() {
  const marins = useMarins();
  const visites = useVisites();
  const sans = marins.filter((m) => !m.livret && m.validationAdmin === "validee" && m.validationMedicale === "validee");
  return (
    <Theme titre="Fascicules de marin" description="Livrets prêts à délivrer, dossiers à compléter et livrets déjà délivrés." aide="visa">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Prêts à délivrer" value={sans.filter((m) => eligibleLivret(m, visites)).length} icon={BookOpenCheck} tone="success" />
        <StatCard label="Dossiers à compléter" value={sans.filter((m) => !eligibleLivret(m, visites)).length} icon={ClipboardList} tone="warning" hint="validés mais incomplets ou certificat expiré" />
        <StatCard label="Livrets délivrés" value={marins.filter((m) => m.livret).length} icon={BookOpenCheck} />
      </div>
    </Theme>
  );
}

function StatsEquipages() {
  const roles = useRoles();
  const marins = useMarins();
  const visites = useVisites();
  const conforme = (r: (typeof roles)[number]) =>
    r.membres.length > 0 && r.membres.every((x) => { const { st } = aptitudeAu(marins.find((m) => m.id === x.marinId), visites, r.appareillage); return st === "valide" || st === "expire_bientot"; });
  const ok = roles.filter(conforme).length;
  const parArmateur = Object.entries(roles.reduce<Record<string, number>>((a, r) => ({ ...a, [r.armateur]: (a[r.armateur] ?? 0) + 1 }), {})).map(([nom, n]) => ({ nom, n }));
  return (
    <Theme titre="Rôles d'équipage" description="Rôles déclarés par les armateurs et conformité médicale des équipages à l'appareillage." aide="role">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Rôles déclarés" value={roles.length} icon={Ship} />
        <StatCard label="Équipages aptes" value={ok} icon={CheckCircle2} tone="success" />
        <StatCard label="Équipages non conformes" value={roles.length - ok} icon={AlertTriangle} tone="danger" />
      </div>
      {parArmateur.length > 0 && <Panel title="Rôles par armateur"><Barres lignes={parArmateur} couleur="bg-secondary" /></Panel>}
    </Theme>
  );
}

const COULEUR_ETAT: Record<EtatNavire, string> = { autorise: "bg-success", a_surveiller: "bg-warning", expire: "bg-destructive", attente_visa: "bg-gold", visa_refuse: "bg-destructive", non_inspecte: "bg-muted-foreground" };

function StatsNavires() {
  const { armateurs } = useInscriptions();
  const inspections = useInspections();
  const navires = useMemo(() => registreNavires(armateurs), [armateurs]);
  const etats = navires.map((n) => etatNavire(inspections, n.id));
  const compte = (e: EtatNavire) => etats.filter((x) => x.etat === e).length;
  const critiques = Object.entries(etats.filter((x) => x.critique).reduce<Record<string, number>>((a, x) => ({ ...a, [x.critique!.titre]: (a[x.critique!.titre] ?? 0) + 1 }), {})).map(([nom, n]) => ({ nom, n }));
  return (
    <Theme titre="Sécurité des navires" description="État des certificats de sécurité après inspection et visa du RH (double verrouillage)." aide="doubleVerrou">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Appareillage autorisé" value={compte("autorise") + compte("a_surveiller")} icon={CheckCircle2} tone="success" />
        <StatCard label="En attente de visa RH" value={compte("attente_visa")} icon={Clock} tone="warning" />
        <StatCard label="À renouveler sous 30 j" value={compte("a_surveiller")} icon={AlertTriangle} tone="warning" />
        <StatCard label="Appareillage interdit" value={compte("expire") + compte("visa_refuse") + compte("non_inspecte")} icon={ShieldX} tone="danger" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Navires par état"><Barres lignes={(Object.keys(ETAT_NAVIRE) as EtatNavire[]).map((e) => ({ nom: ETAT_NAVIRE[e].libelle, n: compte(e), couleur: COULEUR_ETAT[e] }))} /></Panel>
        <Panel title="Certificat qui fixe la date de surveillance" description="Le plus court de chaque navire"><Barres lignes={critiques} couleur="bg-warning" /></Panel>
      </div>
    </Theme>
  );
}

function StatsContrats() {
  const contrats = useContrats();
  const st = contrats.map(statut);
  const n = (s: string) => st.filter((x) => x === s).length;
  const retards = contrats.filter((c) => statut(c) === "actif" && echeancier(c).some((e) => e.etat === "retard")).length;
  const rapatriements = contrats.filter((c) => c.rapatriement?.statut === "demande").length;
  return (
    <Theme titre="Contrats d'engagement maritime" description="Circuit de signature (armateur, marin, DGMM), paie et rapatriements." aide="cem">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="En vigueur" value={n("actif")} icon={FileSignature} tone="success" />
        <StatCard label="À valider (DGMM)" value={n("attente_dgmm")} icon={FileClock} tone="warning" />
        <StatCard label="Versements en retard" value={retards} icon={AlertTriangle} tone="danger" hint="salaire ou cotisations non déclarés" />
        <StatCard label="Rapatriements demandés" value={rapatriements} icon={Plane} />
      </div>
      <Panel title="Contrats par étape">
        <Barres lignes={[
          { nom: "Chez le marin", n: n("attente_marin") }, { nom: "À valider DGMM", n: n("attente_dgmm") }, { nom: "En vigueur", n: n("actif"), couleur: "bg-success" },
          { nom: "Terminés", n: n("termine") }, { nom: "Refusés", n: n("refuse_marin") + n("refuse_dgmm"), couleur: "bg-destructive" },
        ]} />
      </Panel>
    </Theme>
  );
}

function StatsAlertes({ session }: { session: Account }) {
  const alertes = useAlertes().filter((a) => visiblePour(a, session));
  const ouvertes = alertes.filter((a) => a.statut !== "cloturee");
  const rougesSansReponse = ouvertes.filter((a) => a.niveau === "rouge" && (heuresSansReponse(a) ?? 0) > 24).length;
  return (
    <Theme titre="Alertes des marins" description="Signalements reçus par gravité et suivi de leur traitement." aide="feux">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Alertes ouvertes" value={ouvertes.length} icon={Siren} />
        <StatCard label="Rouges ouvertes" value={ouvertes.filter((a) => a.niveau === "rouge").length} icon={ShieldX} tone="danger" />
        <StatCard label="Rouges sans réponse > 24 h" value={rougesSansReponse} icon={Clock} tone="danger" />
        <StatCard label="Inspections programmées" value={alertes.filter((a) => a.statut === "inspection_programmee").length} icon={ShieldCheck} tone="success" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Par gravité"><Barres lignes={(Object.keys(NIVEAUX) as Niveau[]).map((k) => ({ nom: NIVEAUX[k].titre, n: alertes.filter((a) => a.niveau === k).length, couleur: k === "vert" ? "bg-success" : k === "orange" ? "bg-warning" : "bg-destructive" }))} /></Panel>
        <Panel title="Anonymat"><Barres lignes={[{ nom: "Anonymes", n: alertes.filter((a) => a.anonyme).length }, { nom: "Identifiés", n: alertes.filter((a) => !a.anonyme).length }]} couleur="bg-secondary" /></Panel>
      </div>
    </Theme>
  );
}

function StatsMedecins() {
  const { medecins, demandes } = useMedecins();
  const visites = useVisites();
  const parStructure = STRUCTURES_MEDICALES.map((s) => ({ nom: s.nom, n: visites.filter((v) => (v.structure ?? medecinDeVisite(v, medecins)?.structure) === s.code).length }));
  return (
    <Theme titre="Médecins des gens de mer" description="Médecins assermentés, échéances d'agrément, demandes et visites par structure." aide="agrement">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Médecins agréés" value={medecins.filter((m) => etatAgrement(m).etat !== "expire").length} icon={BadgeCheck} tone="success" />
        <StatCard label="À renouveler sous 90 j" value={medecins.filter((m) => etatAgrement(m).etat === "a_renouveler").length} icon={AlertTriangle} tone="warning" />
        <StatCard label="Demandes en cours" value={demandes.filter((d) => d.statut === "en_instruction" || d.statut === "attente_directeur").length} icon={Inbox} tone="warning" />
        <StatCard label="Visites rattachées" value={visites.filter((v) => medecinDeVisite(v, medecins)).length} icon={Stethoscope} />
      </div>
      <Panel title="Visites par structure médicale"><Barres lignes={parStructure} couleur="bg-secondary" /></Panel>
    </Theme>
  );
}

function StatsAudit() {
  const audit = useAudit();
  return (
    <Theme titre="Journal d'audit" description="Événements enregistrés et intégrité de la chaîne d'empreintes." aide="journal">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Entrées journalisées" value={audit.length} icon={KeyRound} />
        <StatCard label="Livrets délivrés (tracés)" value={audit.filter((e) => /Délivrance du livret/.test(e.action)).length} icon={ShieldCheck} tone="gold" />
        <StatCard label="Visas administratifs" value={audit.filter((e) => /Visa administratif/.test(e.action)).length} icon={ShieldCheck} tone="success" />
        <StatCard label="Dernière empreinte" value={<span className="font-mono text-base">{audit.at(-1)?.hash.slice(0, 10) ?? "—"}</span>} icon={KeyRound} />
      </div>
    </Theme>
  );
}

function StatsSysteme() {
  const marins = useMarins();
  const visites = useVisites();
  const roles = useRoles();
  const audit = useAudit();
  const rupture = useMemo(() => verifierAudit(audit), [audit]);
  return (
    <Theme titre="Système" description="Volumes des données et état du journal de contrôle." aide="journal">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Gens de mer" value={marins.length} icon={Users} hint={`${marins.filter((m) => m.livret).length} fascicules délivrés`} />
        <StatCard label="Visites médicales" value={visites.length} icon={FileClock} hint={`${visites.filter((v) => v.signee).length} signées`} />
        <StatCard label="Rôles d'équipage" value={roles.length} icon={Ship} />
        <StatCard label="Entrées d'audit" value={audit.length} icon={KeyRound} tone={rupture === null ? "success" : "danger"} hint={rupture === null ? "Chaîne intacte" : `Rupture à l'entrée n° ${rupture}`} />
      </div>
    </Theme>
  );
}
