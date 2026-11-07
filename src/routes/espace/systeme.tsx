import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Activity,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  Eye,
  FileClock,
  HardDrive,
  KeyRound,
  MonitorSmartphone,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Ship,
  Sparkles,
  Upload,
  Users,
  Wrench,
  XCircle,
} from "lucide-react";
import { RequirePerm } from "@/components/dgmm/Guard";
import { PageHeader, Panel, StatCard, textareaClass } from "@/components/dgmm/Page";
import { SectionStatistiques, LienStatistiques } from "@/components/dgmm/Statistiques";
import { DgmmLogo } from "@/components/dgmm/Logo";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ACCOUNTS, comptesArmateurs, type Account } from "@/lib/dgmm/auth";
import { traiterDemandeArmateur, useInscriptions } from "@/lib/dgmm/inscriptions";
import { DossierCompagnie, FlotteDemande, flotteDecidee } from "@/components/dgmm/FlotteDemande";
import { SEGMENT_PAR_CATEGORIE } from "@/lib/dgmm/registre";
import { can, isOverdueRegistration, type Permission, type Role } from "@/lib/dgmm/rules";
import { ARMATEURS, AVURNAV, STATIONS, TEXTES, TOUS_NAVIRES } from "@/lib/dgmm/maritime";
import { estSombre, setPrefs, usePrefs } from "@/lib/dgmm/prefs";
import { HABILLAGES, habillageActif, prochaineDate, type HabillageId } from "@/lib/dgmm/saisons";
import { reinitialiserSysteme, setSysteme, useSysteme, type Systeme } from "@/lib/dgmm/systeme";
import {
  CLE_DONNEES,
  dossierIncomplet,
  exporterDonnees,
  importerDonnees,
  journaliser,
  marinCertStatus,
  resetDemo,
  useAudit,
  useMarins,
  useRoles,
  useVisites,
  verifierAudit,
} from "@/lib/dgmm/store";

export const Route = createFileRoute("/espace/systeme")({
  head: () => ({ meta: [{ title: "Administration système — GDM | DGMM" }] }),
  component: () => <RequirePerm perm="systeme">{(s) => <Console session={s} />}</RequirePerm>,
});

const DAY = 86400000;

/* ---------- Petits éléments ---------- */

type Etat = "ok" | "attention" | "erreur" | "info";
const ETAT_STYLE: Record<Etat, { cls: string; icon: typeof CheckCircle2; txt: string }> = {
  ok: { cls: "bg-success/12 text-success", icon: CheckCircle2, txt: "OK" },
  attention: { cls: "bg-warning/15 text-warning", icon: AlertTriangle, txt: "À surveiller" },
  erreur: { cls: "bg-destructive/12 text-destructive", icon: XCircle, txt: "Problème" },
  info: { cls: "bg-muted text-muted-foreground", icon: Activity, txt: "Info" },
};

function Pastille({ etat, label }: { etat: Etat; label?: string | undefined }) {
  const s = ETAT_STYLE[etat];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        s.cls,
      )}
    >
      <Icon className="size-3.5" /> {label ?? s.txt}
    </span>
  );
}

function Ligne({
  titre,
  detail,
  etat,
  action,
}: {
  titre: ReactNode;
  detail?: ReactNode;
  etat: Etat;
  action?: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-primary">{titre}</div>
        {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
      </div>
      {action}
      <Pastille etat={etat} />
    </li>
  );
}

function octets(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / 1024 / 1024).toFixed(2)} Mo`;
}

const REGLES: Record<HabillageId, string> = {
  "nouvel-an": "1er janvier",
  renovation: "12 mars",
  "droits-femme": "17 avril",
  travail: "1er mai",
  "gens-de-mer": "25 juin",
  independance: "16 et 17 août",
  liberation: "30 août",
  "journee-mer": "Dernier jeudi de septembre",
  "octobre-rose": "Tout le mois d'octobre",
  "novembre-bleu": "Tout le mois de novembre",
  sida: "1er décembre",
  noel: "Du 20 au 26 décembre",
};

const ANIMATION_LABEL: Record<string, string> = {
  feux: "Feux d'artifice",
  etincelles: "Étincelles dorées",
  petales: "Pétales",
  feuilles: "Feuilles",
  clochettes: "Clochettes de muguet",
  bulles: "Bulles",
  confettis: "Confettis tricolores",
  envol: "Envol d'oiseaux",
  vagues: "Vagues",
  rubans: "Rubans",
  neige: "Neige",
};

/* ---------- Page ---------- */

function Console({ session }: { session: Account }) {
  const sys = useSysteme();
  const actif = habillageActif(sys, new Date(), null);
  const nbDemandes = useInscriptions().armateurs.filter((d) => d.statut === "en_attente").length;
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Console système"
        subtitle="État détaillé du portail, réglages globaux, comptes et droits, sauvegardes et maintenance."
        actions={
          <div className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2">
            <DgmmLogo className="size-10" />
            <div className="text-xs leading-tight">
              <div className="font-semibold text-primary">Sceau affiché aujourd'hui</div>
              <div className="text-muted-foreground">
                {actif ? actif.evenement : "Sceau officiel, sans habillage"}
              </div>
            </div>
          </div>
        }
      />
      <Tabs defaultValue="etat">
        <TabsList className="mb-5 flex h-auto flex-wrap justify-start">
          <TabsTrigger value="etat">
            <Activity className="mr-1.5 size-4" /> État du système
          </TabsTrigger>
          <TabsTrigger value="habillages">
            <Sparkles className="mr-1.5 size-4" /> Habillages et animations
          </TabsTrigger>
          <TabsTrigger value="comptes">
            <Users className="mr-1.5 size-4" /> Comptes et droits
          </TabsTrigger>
          <TabsTrigger value="demandes">
            <Building2 className="mr-1.5 size-4" /> Demandes armateurs
            {nbDemandes ? ` (${nbDemandes})` : ""}
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            <Wrench className="mr-1.5 size-4" /> Maintenance et données
          </TabsTrigger>
        </TabsList>
        <TabsContent value="etat">
          <EtatSysteme />
        </TabsContent>
        <TabsContent value="habillages">
          <Habillages session={session} />
        </TabsContent>
        <TabsContent value="comptes">
          <Comptes />
        </TabsContent>
        <TabsContent value="demandes">
          <DemandesArmateurs session={session} />
        </TabsContent>
        <TabsContent value="maintenance">
          <Maintenance session={session} />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ---------- 1. État du système ---------- */

function EtatSysteme() {
  const marins = useMarins();
  const visites = useVisites();
  const roles = useRoles();
  const audit = useAudit();
  const sys = useSysteme();
  const prefs = usePrefs();
  const [stockage, setStockage] = useState<{ cles: [string, number][]; total: number }>({
    cles: [],
    total: 0,
  });
  const [sessions, setSessions] = useState<[string, string, string | null][]>([]);
  const [env, setEnv] = useState<[string, string][]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const cles: [string, number][] = [];
    let total = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        const n = (k.length + (localStorage.getItem(k)?.length ?? 0)) * 2;
        total += n;
        if (k.startsWith("dgmm")) cles.push([k, n]);
      }
    } catch {
      /* stockage inaccessible */
    }
    cles.sort((a, b) => b[1] - a[1]);
    setStockage({ cles, total });
    const lire = (k: string) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    };
    setSessions([
      ["dgmm-session", "Espace professionnel (DGMM)", lire("dgmm-session")],
      ["dgmm-marin-session", "Espace Marin", lire("dgmm-marin-session")],
      ["dgmm-armateur-session", "Espace Armateurs", lire("dgmm-armateur-session")],
    ]);
    const ua = navigator.userAgent;
    const nav = /Edg\//.test(ua)
      ? "Edge"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Autre";
    const os = /Windows/.test(ua)
      ? "Windows"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Mac OS/.test(ua)
            ? "macOS"
            : /Linux/.test(ua)
              ? "Linux"
              : "Autre";
    setEnv([
      ["Navigateur", `${nav} · ${os}`],
      ["Langue", navigator.language],
      ["Fuseau horaire", Intl.DateTimeFormat().resolvedOptions().timeZone],
      [
        "Écran",
        `${window.screen.width} × ${window.screen.height} px · fenêtre ${window.innerWidth} × ${window.innerHeight}`,
      ],
      ["Connexion réseau", navigator.onLine ? "En ligne" : "Hors ligne"],
      [
        "Mouvement réduit demandé",
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
          ? "Oui (animations coupées)"
          : "Non",
      ],
    ]);
  }, [tick]);

  const now = new Date();
  const rupture = useMemo(() => verifierAudit(audit), [audit]);
  const signees = visites.filter((v) => v.signee && !v.revoquee).length;
  const brouillons = visites.filter((v) => !v.signee);
  const anomalies = useMemo(() => {
    const st = (id: number) => marinCertStatus(visites, id, now);
    return [
      {
        titre: "Visa accordé sans certificat médical valide",
        detail: "Le circuit DGMM exige la visite médicale avant le visa.",
        n: marins.filter(
          (m) =>
            m.validationAdmin === "validee" && !["valide", "expire_bientot"].includes(st(m.id)),
        ).length,
        lien: { cert: "expire" as const },
      },
      {
        titre: "Fascicule délivré, certificat expiré",
        detail: "Ces marins ne peuvent plus embarquer avant une nouvelle visite.",
        n: marins.filter((m) => m.livret && st(m.id) === "expire").length,
        lien: { cert: "expire" as const },
      },
      {
        titre: "Dossiers validés mais incomplets",
        detail: "Description physique, photo, pièce d'identité ou signature manquante.",
        n: marins.filter((m) => m.validationAdmin === "validee" && dossierIncomplet(m)).length,
        lien: { admin: "validee" as const },
      },
      {
        titre: "Inscriptions en attente depuis plus de 7 jours",
        detail: "Visa ou visite médicale non réalisés.",
        n: marins.filter(
          (m) =>
            (m.validationAdmin === "en_attente" || m.validationMedicale === "en_attente") &&
            m.validationAdmin !== "rejetee" &&
            isOverdueRegistration(m.creeLe, now),
        ).length,
        lien: { admin: "en_attente" as const },
      },
      {
        titre: "Brouillons de visite de plus de 7 jours",
        detail: "Visites commencées et jamais signées.",
        n: brouillons.filter((v) => now.getTime() - new Date(v.creeLe).getTime() > 7 * DAY).length,
        lien: null,
      },
      {
        titre: "Certificats révoqués",
        detail: "Annulés par un médecin ; le QR les signale comme non valables.",
        n: visites.filter((v) => v.revoquee).length,
        lien: null,
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marins, visites]);
  const nbAnomalies = anomalies.reduce((s, a) => s + (a.n > 0 && a.lien !== null ? 1 : 0), 0);
  // Le stockage local d'un navigateur est limité à environ 5 Mo par site.
  const LIMITE = 5 * 1024 * 1024;
  const pctStockage = Math.min(100, (stockage.total / LIMITE) * 100);

  return (
    <div className="space-y-6">
      <LienStatistiques theme="systeme" texte="Volumes des données et état du journal de contrôle" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Santé du système"
          description="Contrôles recalculés à chaque ouverture de la page."
          bodyClassName="p-0"
          actions={
            <Button size="sm" variant="outline" onClick={() => setTick((t) => t + 1)}>
              <RotateCcw /> Actualiser
            </Button>
          }
        >
          <ul className="divide-y">
            <Ligne
              titre="Intégrité du journal d'audit"
              detail={
                rupture === null
                  ? `${audit.length} entrées, empreintes chaînées cohérentes.`
                  : `Altération détectée à l'entrée n° ${rupture}.`
              }
              etat={rupture === null ? "ok" : "erreur"}
              action={
                <Link
                  to="/espace/audit"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Ouvrir le journal
                </Link>
              }
            />
            <Ligne
              titre="Données du portail"
              detail={`Schéma ${CLE_DONNEES} · ${octets(stockage.cles.find(([k]) => k === CLE_DONNEES)?.[1] ?? 0)}`}
              etat="ok"
            />
            <Ligne
              titre="Espace de stockage du navigateur"
              detail={`${octets(stockage.total)} utilisés sur environ 5 Mo (${pctStockage.toFixed(1)} %)`}
              etat={pctStockage > 80 ? "erreur" : pctStockage > 60 ? "attention" : "ok"}
            />
            <Ligne
              titre="Cohérence des dossiers"
              detail={
                nbAnomalies
                  ? `${nbAnomalies} type(s) d'anomalie à traiter (détail ci-contre).`
                  : "Aucune anomalie bloquante."
              }
              etat={nbAnomalies ? "attention" : "ok"}
            />
            <Ligne
              titre="Mode maintenance"
              detail={
                sys.maintenance.actif
                  ? sys.maintenance.message
                  : "Désactivé : aucun message affiché aux utilisateurs."
              }
              etat={sys.maintenance.actif ? "attention" : "ok"}
            />
            <Ligne
              titre="Habillage du sceau"
              detail={
                sys.habillageMode === "calendrier"
                  ? "Suit le calendrier des journées spéciales."
                  : sys.habillageMode === "force"
                    ? `Forcé : ${HABILLAGES[sys.habillageForce].evenement}.`
                    : "Désactivé : sceau officiel partout."
              }
              etat="info"
            />
          </ul>
        </Panel>

        <Panel
          title="Cohérence des données"
          description="Situations qui sortent du circuit DGMM."
          bodyClassName="p-0"
        >
          <ul className="divide-y">
            {anomalies.map((a) => (
              <Ligne
                key={a.titre}
                titre={
                  <span>
                    {a.titre} <span className="ml-1 font-display tabular-nums">{a.n}</span>
                  </span>
                }
                detail={a.detail}
                etat={a.n === 0 ? "ok" : a.lien === null ? "info" : "attention"}
                action={
                  a.n > 0 && a.lien ? (
                    <Link
                      to="/espace/marins"
                      search={a.lien}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Voir
                    </Link>
                  ) : undefined
                }
              />
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Sessions ouvertes sur ce poste" bodyClassName="p-0">
          <ul className="divide-y">
            {sessions.map(([k, label, v]) => (
              <Ligne
                key={k}
                titre={label}
                detail={v ? `Compte : ${v}` : "Aucune session"}
                etat={v ? "ok" : "info"}
                action={
                  v && k !== "dgmm-session" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        try {
                          localStorage.removeItem(k);
                        } catch {
                          /* */
                        }
                        setTick((t) => t + 1);
                        toast.success(`${label} : session fermée`);
                      }}
                    >
                      Fermer
                    </Button>
                  ) : undefined
                }
              />
            ))}
          </ul>
        </Panel>
        <Panel title="Stockage par catégorie" bodyClassName="p-0">
          <ul className="divide-y">
            {stockage.cles.map(([k, n]) => (
              <li key={k} className="px-5 py-2.5">
                <div className="flex justify-between text-sm">
                  <span className="font-mono text-xs">{k}</span>
                  <span className="tabular-nums text-muted-foreground">{octets(n)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-secondary"
                    style={{
                      width: `${Math.max(2, (n / Math.max(1, stockage.cles[0]?.[1] ?? 1)) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Environnement du poste" bodyClassName="p-0">
          <dl className="divide-y">
            {[
              ...env,
              ["Thème", estSombre(prefs) ? "Nuit" : "Jour"],
              ["Densité", prefs.densite === "compact" ? "Compacte" : "Confort"],
              ["Contraste élevé", prefs.contraste === "eleve" ? "Oui" : "Non"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 px-5 py-2.5 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <Panel title="Référentiels" description="Tables de référence intégrées au portail.">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Stations maritimes", STATIONS.length],
            ["Armateurs", ARMATEURS.length],
            ["Navires", TOUS_NAVIRES.length],
            ["Textes réglementaires", TEXTES.length],
            ["Avis AVURNAV", AVURNAV.length],
            ["Comptes DGMM", ACCOUNTS.length],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="font-display text-2xl font-bold tabular-nums text-primary">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}

/* ---------- 2. Habillages et animations ---------- */

function Habillages({ session }: { session: Account }) {
  const sys = useSysteme();
  const maj = (patch: Partial<Systeme>, action: string) => {
    setSysteme(patch);
    journaliser(session.nom, action, "Système");
    toast.success("Réglage enregistré", { description: action });
  };
  const modes: [Systeme["habillageMode"], string, string][] = [
    ["calendrier", "Suivre le calendrier", "Le sceau change seul aux dates prévues."],
    ["force", "Forcer un habillage", "Le même habillage partout, quelle que soit la date."],
    ["desactive", "Désactiver", "Sceau officiel sans décoration, aucune animation."],
  ];
  const ids = Object.keys(HABILLAGES) as HabillageId[];
  return (
    <div className="space-y-6">
      <Panel title="Mode d'habillage du sceau">
        <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Mode d'habillage">
          {modes.map(([m, t, d]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={sys.habillageMode === m}
              onClick={() => maj({ habillageMode: m }, `Habillage du sceau : ${t.toLowerCase()}`)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors hover:border-gold",
                sys.habillageMode === m && "border-gold bg-gold/10",
              )}
            >
              <div className="font-semibold text-primary">{t}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{d}</div>
            </button>
          ))}
        </div>
        {sys.habillageMode === "force" && (
          <label className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium">Habillage forcé</span>
            <select
              id="habillage-force"
              className="field-dgmm h-10 rounded-md bg-card px-3 text-sm"
              value={sys.habillageForce}
              onChange={(e) =>
                maj(
                  { habillageForce: e.target.value as HabillageId },
                  `Habillage forcé : ${HABILLAGES[e.target.value as HabillageId].evenement}`,
                )
              }
            >
              {ids.map((id) => (
                <option key={id} value={id}>
                  {HABILLAGES[id].evenement}
                </option>
              ))}
            </select>
          </label>
        )}
      </Panel>

      <Panel title="Animations d'ambiance">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <label className="flex items-center gap-3 text-sm">
            <Switch
              id="animations"
              checked={sys.animations}
              onCheckedChange={(v) =>
                maj(
                  { animations: v },
                  v ? "Animations d'ambiance activées" : "Animations d'ambiance coupées pour tous",
                )
              }
            />
            <span>
              <span className="font-medium">Autoriser les animations</span>
              <span className="block text-xs text-muted-foreground">
                Chaque utilisateur peut encore les couper sur son poste.
              </span>
            </span>
          </label>
          <div className="flex items-center gap-2 text-sm" role="radiogroup" aria-label="Intensité">
            <span className="mr-1 font-medium">Intensité</span>
            {(["legere", "normale", "forte"] as const).map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={sys.intensite === i}
                disabled={!sys.animations}
                onClick={() =>
                  maj(
                    { intensite: i },
                    `Intensité des animations : ${i === "legere" ? "légère" : i}`,
                  )
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50",
                  sys.intensite === i
                    ? "border-gold bg-gold text-gold-foreground"
                    : "hover:border-gold",
                )}
              >
                {i === "legere" ? "Légère" : i === "normale" ? "Normale" : "Forte"}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <Panel
        title="Calendrier des journées spéciales"
        description="Activez ou retirez un événement ; « Aperçu » montre l'habillage sur votre poste pour cette session."
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Sceau</th>
                <th className="px-3 py-2.5 font-semibold">Événement</th>
                <th className="px-3 py-2.5 font-semibold">Date</th>
                <th className="px-3 py-2.5 font-semibold">Prochaine fois</th>
                <th className="px-3 py-2.5 font-semibold">Animation</th>
                <th className="px-3 py-2.5 font-semibold">Actif</th>
                <th className="w-24 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {ids.map((id) => {
                const h = HABILLAGES[id];
                const on = !sys.evenementsInactifs.includes(id);
                const p = prochaineDate(id);
                return (
                  <tr key={id} className={cn(!on && "opacity-55")}>
                    <td className="px-4 py-2">
                      <DgmmLogo className="size-14" apercu={id} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-primary">{h.evenement}</div>
                      <div className="text-xs text-muted-foreground">
                        {h.accessoire}
                        {h.substitution ? ` · ${h.substitution}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">{REGLES[id]}</td>
                    <td className="px-3 py-2 text-xs tabular-nums">
                      {p.toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-2 text-xs">{ANIMATION_LABEL[h.ambiance]}</td>
                    <td className="px-3 py-2">
                      <Switch
                        id={`evt-${id}`}
                        aria-label={`${on ? "Retirer" : "Activer"} ${h.evenement}`}
                        checked={on}
                        onCheckedChange={(v) =>
                          maj(
                            {
                              evenementsInactifs: v
                                ? sys.evenementsInactifs.filter((x) => x !== id)
                                : [...sys.evenementsInactifs, id],
                            },
                            `${h.evenement} : ${v ? "activé" : "retiré"} du calendrier`,
                          )
                        }
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          window.location.href = `/espace/systeme?habillage=${id}`;
                        }}
                      >
                        <Eye /> Aperçu
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-xs text-muted-foreground">
          <span>
            L'aperçu ne change que votre session ; les autres utilisateurs voient les réglages
            ci-dessus.
          </span>
          <a
            href="/espace/systeme?habillage=auto"
            className="font-semibold text-primary hover:underline"
          >
            Quitter l'aperçu
          </a>
        </div>
      </Panel>
    </div>
  );
}

/* ---------- 3. Comptes et droits ---------- */

const PERMS: [Permission, string][] = [
  ["dashboard", "Tableau de bord"],
  ["marins", "Consulter les gens de mer"],
  ["marins.enroler", "Enrôler et instruire un dossier"],
  ["marins.transmettre", "Transmettre un dossier à la Direction"],
  ["marins.viser", "Apposer le visa régalien DGMM"],
  ["livrets.delivrer", "Délivrer le livret maritime"],
  ["visites", "Consulter les visites"],
  ["visites.saisir", "Saisir une visite"],
  ["visites.signer", "Signer un certificat"],
  ["certificats.imprimer", "Imprimer un certificat"],
  ["audit", "Journal d'audit"],
  ["embarquements", "Gérer les embarquements"],
  ["roles.lecture", "Lire les rôles d'équipage"],
  ["systeme", "Administration système"],
];

function Comptes() {
  const marins = useMarins();
  useInscriptions();
  const roles = [...new Map(ACCOUNTS.map((a) => [a.role, a.roleLabel])).entries()] as [
    Role,
    string,
  ][];
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Comptes du personnel" bodyClassName="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Identifiant</th>
                <th className="px-3 py-2.5 font-semibold">Nom</th>
                <th className="px-5 py-2.5 font-semibold">Rôle</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ACCOUNTS.map((a) => (
                <tr key={a.username}>
                  <td className="px-5 py-2.5 font-mono text-xs">{a.username}</td>
                  <td className="px-3 py-2.5">{a.nom}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{a.roleLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Comptes externes" bodyClassName="p-0">
          <ul className="divide-y">
            {comptesArmateurs().map((a) => (
              <Ligne
                key={a.username}
                titre={a.entreprise}
                detail={`Espace Armateurs · identifiant ${a.username} · ${a.contact}`}
                etat="ok"
              />
            ))}
            <Ligne
              titre="Espace Marin"
              detail={`${marins.length} comptes marins (connexion par NIP et mot de passe personnel)`}
              etat="ok"
            />
          </ul>
        </Panel>
      </div>
      <Panel
        title="Matrice des droits"
        description="Ce que chaque rôle peut faire dans le portail. Les droits sont fixés par la réglementation DGMM."
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 text-left font-semibold">Droit</th>
                {roles.map(([r, l]) => (
                  <th key={r} className="px-3 py-2.5 text-center font-semibold">
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {PERMS.map(([p, l]) => (
                <tr key={p}>
                  <td className="px-5 py-2.5">{l}</td>
                  {roles.map(([r]) => (
                    <td key={r} className="px-3 py-2.5 text-center">
                      {can(r, p) ? (
                        <CheckCircle2
                          className="mx-auto size-4 text-success"
                          aria-label="Autorisé"
                        />
                      ) : (
                        <span className="text-muted-foreground" aria-label="Non autorisé">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ---------- 4. Maintenance et données ---------- */

function Maintenance({ session }: { session: Account }) {
  const sys = useSysteme();
  const marins = useMarins();
  const [message, setMessage] = useState(sys.maintenance.message);
  const [confirme, setConfirme] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);

  const telecharger = () => {
    const blob = new Blob([exporterDonnees()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sauvegarde-dgmm-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    journaliser(session.nom, "Sauvegarde complète des données téléchargée", "Système");
    toast.success("Sauvegarde téléchargée", {
      description: `${marins.length} marins, visites, rôles et journal d'audit.`,
    });
  };

  const restaurer = async (f: File) => {
    const err = importerDonnees(await f.text(), session.nom);
    if (err) toast.error("Restauration impossible", { description: err });
    else toast.success("Sauvegarde restaurée", { description: f.name });
    if (fichier.current) fichier.current.value = "";
  };

  return (
    <div className="space-y-6">
      <Panel
        title="Mode maintenance"
        description="Affiche un message en haut de chaque écran pour tous les utilisateurs de ce poste."
      >
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm">
            <Switch
              id="maintenance"
              checked={sys.maintenance.actif}
              onCheckedChange={(v) => {
                setSysteme({ maintenance: { actif: v, message } });
                journaliser(
                  session.nom,
                  v ? "Mode maintenance activé" : "Mode maintenance désactivé",
                  "Système",
                );
                toast.success(v ? "Mode maintenance activé" : "Mode maintenance désactivé");
              }}
            />
            <span className="font-medium">
              {sys.maintenance.actif ? "Message affiché" : "Message masqué"}
            </span>
          </label>
          <label htmlFor="message-maintenance" className="block text-sm font-medium">
            Message
          </label>
          <textarea
            id="message-maintenance"
            className={cn(textareaClass, "min-h-20")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={!message.trim() || message === sys.maintenance.message}
            onClick={() => {
              setSysteme({
                maintenance: { actif: sys.maintenance.actif, message: message.trim() },
              });
              journaliser(session.nom, "Message de maintenance modifié", "Système");
              toast.success("Message enregistré");
            }}
          >
            Enregistrer le message
          </Button>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Sauvegarde"
          description="Fichier JSON complet : marins, visites, rôles d'équipage et journal d'audit chaîné."
        >
          <Button onClick={telecharger}>
            <Download /> Télécharger la sauvegarde
          </Button>
        </Panel>
        <Panel
          title="Restauration"
          description="Remplace toutes les données par celles d'une sauvegarde. L'opération est inscrite au journal."
        >
          <input
            ref={fichier}
            id="restauration"
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void restaurer(f);
            }}
          />
          <Button variant="outline" onClick={() => fichier.current?.click()}>
            <Upload /> Choisir une sauvegarde…
          </Button>
        </Panel>
      </div>

      <Panel
        title="Zone sensible"
        description="Actions irréversibles sur ce poste. Téléchargez une sauvegarde avant."
      >
        <div className="space-y-5">
          <div className="rounded-lg border border-destructive/30 p-4">
            <div className="flex items-start gap-3">
              <Database className="mt-0.5 size-5 text-destructive" />
              <div className="flex-1">
                <div className="font-semibold text-primary">
                  Réinitialiser les données de démonstration
                </div>
                <p className="text-xs text-muted-foreground">
                  Efface tous les dossiers, visites et rôles saisis sur ce poste et recharge le jeu
                  d'exemple.
                </p>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    id="confirme-reset"
                    type="checkbox"
                    checked={confirme}
                    onChange={(e) => setConfirme(e.target.checked)}
                  />
                  J'ai compris que les données actuelles seront remplacées.
                </label>
              </div>
              <Button
                variant="destructive"
                size="sm"
                disabled={!confirme}
                onClick={() => {
                  resetDemo(session.nom);
                  setConfirme(false);
                  toast.success("Données de démonstration rechargées");
                }}
              >
                <RotateCcw /> Réinitialiser
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
            <Settings2 className="size-5 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-primary">Réglages système par défaut</div>
              <p className="text-xs text-muted-foreground">
                Habillage selon le calendrier, animations normales, maintenance désactivée.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                reinitialiserSysteme();
                journaliser(session.nom, "Réglages système remis par défaut", "Système");
                toast.success("Réglages par défaut rétablis");
              }}
            >
              Rétablir
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
            <MonitorSmartphone className="size-5 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-primary">Préférences d'affichage de ce poste</div>
              <p className="text-xs text-muted-foreground">
                Thème, densité, contraste, animations et visite guidée reviennent à leur état
                initial.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPrefs({
                  densite: "confort",
                  contraste: "normal",
                  theme: "systeme",
                  tourVu: false,
                  animationsSaison: true,
                });
                toast.success("Préférences d'affichage réinitialisées");
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      </Panel>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        Toutes les actions de cette console sont inscrites au journal d'audit sous votre nom.{" "}
        <HardDrive className="ml-2 mt-0.5 size-4 shrink-0" /> Les données sont conservées dans le
        navigateur de ce poste.
      </p>
    </div>
  );
}

/* ---------- 5. Demandes d'inscription des armateurs ---------- */

function DemandesArmateurs({ session }: { session: Account }) {
  const { armateurs } = useInscriptions();
  const [refus, setRefus] = useState<number | null>(null);
  const [motif, setMotif] = useState("");
  if (!armateurs.length)
    return (
      <Panel>
        <p className="text-sm text-muted-foreground">
          Aucune demande pour l'instant. Les compagnies s'inscrivent depuis la page publique{" "}
          <Link to="/inscription/armateur" className="font-semibold text-primary hover:underline">
            Inscription armateur
          </Link>
          .
        </p>
      </Panel>
    );
  const STATUT: Record<string, [Etat, string]> = {
    en_attente: ["attention", "À examiner"],
    validee: ["ok", "Compte actif"],
    refusee: ["erreur", "Refusée"],
  };
  return (
    <div className="space-y-4">
      {armateurs.map((d) => {
        const [etat, label] = STATUT[d.statut] ?? ["info", d.statut];
        return (
          <Panel
            key={d.id}
            title={
              <span className="flex flex-wrap items-center gap-2">
                {d.raisonSociale}{" "}
                <span className="font-mono text-xs font-normal text-muted-foreground">
                  {d.numero}
                </span>
              </span>
            }
            description={`Déposée le ${new Date(d.creeLe).toLocaleDateString("fr-FR")} · ${d.segment} · ${d.ville}, siège : ${d.pays}`}
            actions={<Pastille etat={etat} label={label} />}
          >
            <div className="grid gap-4 text-sm md:grid-cols-3">
              <dl className="space-y-1.5">
                <div>
                  <dt className="text-xs text-muted-foreground">RCCM</dt>
                  <dd className="font-mono text-xs">{d.rccm}</dd>
                </div>
                {d.nif && (
                  <div>
                    <dt className="text-xs text-muted-foreground">NIF</dt>
                    <dd className="font-mono text-xs">{d.nif}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-muted-foreground">Identifiant demandé</dt>
                  <dd className="font-mono text-xs">{d.identifiant}</dd>
                </div>
              </dl>
              <dl className="space-y-1.5">
                <div>
                  <dt className="text-xs text-muted-foreground">Responsable</dt>
                  <dd>
                    {d.contactNom}
                    {d.contactFonction ? `, ${d.contactFonction}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Contact</dt>
                  <dd>
                    {d.tel} · {d.email}
                  </dd>
                </div>
              </dl>
              <div>
                <div className="text-xs text-muted-foreground">Flotte déclarée</div>
                <div className="text-sm font-semibold">{d.flotte?.length ?? d.navires.length} navire(s){d.flotte ? ` · ${flotteDecidee(d).approuves} nom(s) approuvé(s)` : ""}</div>
              </div>
            </div>
            <DossierCompagnie d={d} />
            <FlotteDemande d={d} auteur={session.nom} />
            {d.motif && <p className="mt-3 text-xs text-muted-foreground">Motif du refus : {d.motif}</p>}
            {d.statut === "en_attente" && (
              <div className="mt-4 flex flex-wrap items-end justify-end gap-2 border-t pt-4">
                {refus === d.id ? (
                  <>
                    <label className="min-w-60 flex-1 text-xs font-medium">
                      Motif du refus
                      <input
                        id={`refus-${d.id}`}
                        className="field-dgmm mt-1 h-9 w-full rounded-md bg-card px-3 text-sm"
                        value={motif}
                        onChange={(e) => setMotif(e.target.value)}
                        placeholder="Ex. RCCM introuvable au registre"
                      />
                    </label>
                    <Button size="sm" variant="ghost" onClick={() => setRefus(null)}>
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!motif.trim()}
                      onClick={() => {
                        traiterDemandeArmateur(d.id, {
                          statut: "refusee",
                          motif: motif.trim(),
                          traitePar: session.nom,
                        });
                        journaliser(
                          session.nom,
                          `Demande armateur ${d.numero} refusée : ${motif.trim()}`,
                          d.raisonSociale,
                        );
                        setRefus(null);
                        toast.success("Demande refusée");
                      }}
                    >
                      Confirmer le refus
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => { setRefus(d.id); setMotif(""); }}><XCircle /> Refuser</Button>
                    {!flotteDecidee(d).pret && <span className="text-xs text-muted-foreground">{flotteDecidee(d).enAttente ? `${flotteDecidee(d).enAttente} nom(s) de navire à examiner avant validation.` : "Aucun nom approuvé : refusez la demande ou attendez une nouvelle proposition."}</span>}
                    <Button size="sm" variant="secondary" disabled={!flotteDecidee(d).pret} onClick={() => {
                      // Seuls les navires dont le nom est approuvé entrent au registre et dans le compte.
                      const navires = d.flotte ? d.flotte.filter((n) => n.nomStatut === "approuve").map((n) => ({ nom: n.nom, imo: n.imo.replace("IMO", ""), type: SEGMENT_PAR_CATEGORIE[n.categorie], jauge: n.jauge, pavillon: "Gabon" })) : d.navires;
                      traiterDemandeArmateur(d.id, { statut: "validee", traitePar: session.nom, navires });
                      journaliser(session.nom, `Demande armateur ${d.numero} validée : compte ${d.identifiant} ouvert, ${navires.length} navire(s) inscrit(s)`, d.raisonSociale);
                      toast.success("Compte armateur activé", { description: `${d.raisonSociale} peut se connecter avec « ${d.identifiant} ».` });
                    }}><CheckCircle2 /> Valider et ouvrir le compte</Button>
                  </>
                )}
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}
