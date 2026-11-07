import { useId, useMemo, type ReactNode } from "react";
import {
  ArrowDownToLine,
  ChartNoAxesCombined,
  Clock3,
  ShieldAlert,
  Ship,
  Users,
} from "lucide-react";
import { CircularGauge, CountUp } from "@/components/dgmm/Anim";
import { Panel, StatCard } from "@/components/dgmm/Page";
import { Progress } from "@/components/ui/progress";
import {
  calculerIndicateursPublics,
  useStatistiquesDgmm,
  useVerificationsPubliques,
} from "@/lib/dgmm/statistiques";
import { lastCertificate, useMarins, useRoles, useVisites, type Marin } from "@/lib/dgmm/store";

function Barre({
  valeur,
  maximum,
  couleur = "bg-secondary",
}: {
  valeur: number;
  maximum: number;
  couleur?: string | undefined;
}) {
  const pct = maximum ? Math.min(100, (valeur / maximum) * 100) : 0;
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${couleur}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Barres({
  lignes,
  palette = ["bg-primary", "bg-secondary", "bg-success", "bg-warning"],
}: {
  lignes: { nom: string; nombre: number }[];
  palette?: string[];
}) {
  const maximum = Math.max(1, ...lignes.map((ligne) => ligne.nombre));
  if (!lignes.length)
    return <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>;
  return (
    <ul className="space-y-4">
      {lignes.map((ligne, index) => (
        <li key={ligne.nom}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{ligne.nom}</span>
            <span className="font-semibold tabular-nums text-primary">
              <CountUp value={ligne.nombre} />
            </span>
          </div>
          <Barre
            valeur={ligne.nombre}
            maximum={maximum}
            couleur={palette[index % palette.length]}
          />
        </li>
      ))}
    </ul>
  );
}

function BarresComparees({
  lignes,
}: {
  lignes: { nom: string; embarquements: number; debarquements: number }[];
}) {
  const maximum = Math.max(
    1,
    ...lignes.flatMap((ligne) => [ligne.embarquements, ligne.debarquements]),
  );
  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-secondary" /> Embarquements
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-gold" /> Débarquements
        </span>
      </div>
      <ul className="space-y-2.5">
        {lignes.map((ligne) => (
          <li key={ligne.nom} className="grid grid-cols-[44px_1fr] items-center gap-3 text-xs">
            <span className="capitalize text-muted-foreground">{ligne.nom}</span>
            <div className="space-y-1">
              <Barre valeur={ligne.embarquements} maximum={maximum} couleur="bg-secondary" />
              <Barre valeur={ligne.debarquements} maximum={maximum} couleur="bg-gold" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SectionStatistiques({
  titre,
  description,
  children,
}: {
  titre: string;
  description: string;
  children: ReactNode;
}) {
  const titreId = useId();
  return (
    <section className="mt-8 border-t pt-6" aria-labelledby={titreId}>
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/8 text-primary">
          <ChartNoAxesCombined className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h2
            id={titreId}
            className="font-display text-sm font-bold uppercase tracking-[0.14em] text-primary"
          >
            {titre}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

export function BarometreBleu() {
  const marins = useMarins();
  const verifications = useVerificationsPubliques();
  const stats = useMemo(() => calculerIndicateursPublics(marins), [marins]);
  const total = verifications.length;
  const conformes = verifications.filter((v) => v.resultat === "conforme").length;
  const anomalies = total - conformes;
  const taux = total ? Math.round((conformes / total) * 100) : 0;
  return (
    <section className="w-full max-w-6xl" aria-labelledby="barometre-bleu">
      <div className="mb-3 flex items-center gap-2 text-primary-foreground">
        <ChartNoAxesCombined className="size-5 text-gold" />
        <h2 id="barometre-bleu" className="font-display text-lg font-bold">
          Baromètre de l'Économie Bleue
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Navires actifs recensés"
          value={stats.naviresActifs}
          icon={Ship}
          tone="gold"
        />
        <StatCard
          label="Marins gabonais en mer"
          value={stats.marinsGabonaisActifs}
          icon={Users}
          tone="success"
        />
        <StatCard
          label="Contrôles PSC sur cet appareil"
          value={total}
          icon={ShieldAlert}
          tone={anomalies ? "warning" : "primary"}
          hint={`${anomalies} anomalie(s) · ${taux}% conformes`}
        />
      </div>
      <p className="mt-2 text-xs text-primary-foreground/65">
        Données de démonstration locales à cet appareil; elles ne constituent pas un décompte
        national consolidé.
      </p>
    </section>
  );
}

export function BarometreControle() {
  const verifications = useVerificationsPubliques();
  const checks = useMemo(
    () =>
      verifications.reduce(
        (counts, verification) => {
          counts.total += 1;
          if (verification.resultat === "conforme") counts.conformes += 1;
          else counts.anomalies += 1;
          return counts;
        },
        { total: 0, anomalies: 0, conformes: 0 },
      ),
    [verifications],
  );
  const taux = checks.total ? Math.round((checks.conformes / checks.total) * 100) : 0;
  return (
    <Panel
      title="Baromètre de contrôle & anti-fraude"
      description="Compteurs locaux de démonstration sur cet appareil; aucune donnée de localisation n'est collectée."
    >
      <div className="grid items-center gap-5 sm:grid-cols-[auto_1fr]">
        <CircularGauge value={taux} label="Part des contrôles conformes" size={104}>
          <div className="text-center">
            <div className="font-display text-xl font-bold text-primary">
              <CountUp value={checks.total} />
            </div>
            <div className="text-[10px] text-muted-foreground">contrôles</div>
          </div>
        </CircularGauge>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Conformes" value={checks.conformes} icon={Ship} tone="success" />
          <StatCard label="Anomalies" value={checks.anomalies} icon={ShieldAlert} tone="danger" />
        </div>
      </div>
      <div className="mt-5 border-t pt-4">
        <h3 className="mb-2 text-sm font-semibold text-primary">
          Contrôles récents sur cet appareil
        </h3>
        {verifications.length ? (
          <ul className="divide-y">
            {[...verifications]
              .slice(-5)
              .reverse()
              .map((verification, index) => (
                <li
                  key={`${verification.date}-${verification.canal}-${index}`}
                  className="flex items-center justify-between gap-3 py-2 text-xs"
                >
                  <span className="text-muted-foreground">
                    {new Date(verification.date).toLocaleString("fr-FR")} ·{" "}
                    {verification.canal === "qr"
                      ? "QR"
                      : verification.canal === "nip"
                        ? "NIP / livret"
                        : "Certificat"}
                  </span>
                  <span
                    className={
                      verification.resultat === "conforme"
                        ? "font-semibold text-success"
                        : "font-semibold text-destructive"
                    }
                  >
                    {verification.resultat === "conforme" ? "Conforme" : "Anomalie"}
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            Aucun contrôle enregistré dans ce navigateur pour le moment.
          </p>
        )}
      </div>
    </Panel>
  );
}

export function TableauRgalien({ mode }: { mode: "agent" | "directeur" }) {
  const stats = useStatistiquesDgmm();
  const maxAge = Math.max(1, ...stats.ages.map((ligne) => ligne.nombre));
  const downloadCsv = () => {
    const lignes = [
      ["Indicateur", "Valeur"],
      ["Marins enregistrés", String(stats.marinsActifsEnMer)],
      ["Navires actifs", String(stats.naviresActifs)],
      ["Gabonisation en mer (%)", String(stats.tauxGabonisation)],
      ["Dossiers en attente de visa", String(stats.attenteVisa.nombre)],
      ["Délai moyen de visa (jours)", String(stats.attenteVisa.joursMoyens)],
      ["Certificats à renouveler sous 30 jours", String(stats.certificats.dans30Jours)],
      ...stats.ages.map(({ nom, nombre }) => [`Âges — ${nom}`, String(nombre)]),
    ];
    const csv = `\uFEFF${lignes.map((ligne) => ligne.map((cellule) => `"${cellule.replaceAll('"', '""')}"`).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `dgmm-synthese-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="mt-6 space-y-6">
      {mode === "directeur" ? (
        <>
          <Panel
            title="Pilotage régalien & souveraineté"
            description="Photographie calculée à partir des rôles et dossiers présents dans le registre local."
            actions={
              <button
                type="button"
                onClick={downloadCsv}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold text-primary transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowDownToLine className="size-4" /> Exporter la synthèse CSV
              </button>
            }
          >
            <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
              <div className="flex flex-col items-center gap-2">
                <CircularGauge
                  value={stats.tauxGabonisation}
                  label="Gabonisation des équipages en mer"
                  size={126}
                />
                <span className="text-xs text-muted-foreground">
                  Repère de pilotage indicatif : 62% (à confirmer par règle réglementaire)
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <StatCard label="Navires actifs" value={stats.naviresActifs} icon={Ship} />
                <StatCard
                  label="Marins gabonais en mer"
                  value={stats.marinsGabonaisActifs}
                  icon={Users}
                  tone="success"
                />
                <StatCard
                  label="Visa en attente"
                  value={stats.attenteVisa.nombre}
                  icon={Clock3}
                  tone={stats.attenteVisa.depasses14Jours > 0 ? "danger" : "warning"}
                  hint={`${stats.attenteVisa.depasses14Jours} dossier(s) > 14 j · moyenne ${stats.attenteVisa.joursMoyens} j`}
                />
                <StatCard
                  label="Embarquements à viser"
                  value={stats.activitePortuaire.enAttenteVisa}
                  icon={ShieldAlert}
                  tone="warning"
                />
              </div>
            </div>
            {stats.flotte.length > 0 && (
              <div className="mt-6 border-t pt-5">
                <h3 className="mb-3 text-sm font-semibold text-primary">
                  Composition des équipages actifs
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {stats.flotte.map((navire) => (
                    <div key={navire.nom} className="rounded-lg border p-3">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="font-semibold text-primary">{navire.nom}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {navire.gabonais}/{navire.membres}
                        </span>
                      </div>
                      <Barre
                        valeur={navire.tauxGabonisation}
                        maximum={100}
                        couleur={navire.tauxGabonisation < 62 ? "bg-destructive" : "bg-success"}
                      />
                      <span className="mt-1 block text-right text-xs text-muted-foreground">
                        {navire.tauxGabonisation}% gabonais
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Le seuil de 62% est un repère de démonstration fourni dans le cahier des charges,
                  pas une règle de conformité paramétrée.
                </p>
              </div>
            )}
          </Panel>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Pyramide des âges" description="Marins enregistrés par tranche d'âge">
              <Barres
                lignes={stats.ages}
                palette={["bg-secondary", "bg-primary", "bg-gold", "bg-muted-foreground"]}
              />
              <span className="sr-only">Échelle maximale {maxAge} marins</span>
            </Panel>
            <Panel
              title="Cartographie des compétences"
              description="Regroupement indicatif selon la profession déclarée"
            >
              <Barres lignes={stats.metiers} />
              <p className="mt-3 text-xs text-muted-foreground">
                Les titres « Capitaine 3000 GT » et « Chef mécanicien » ne sont pas structurés
                séparément dans le registre actuel.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Les visas de reconnaissance des brevets étrangers ne sont pas enregistrés comme
                entité distincte.
              </p>
            </Panel>
          </div>
          <Panel
            title="Alertes MLC 2006"
            description="Détection indicative à partir des embarquements en cours"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard
                label="Marins en mer depuis plus de 11 mois"
                value={stats.conformiteMlc.depasse11Mois}
                icon={Clock3}
                tone={stats.conformiteMlc.depasse11Mois ? "danger" : "success"}
              />
              <StatCard
                label="Visas DGMM en attente > 14 jours"
                value={stats.attenteVisa.depasses14Jours}
                icon={ShieldAlert}
                tone="danger"
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              L'échéance contractuelle n'est pas enregistrée; l'alerte « en mer hors contrat » n'est
              donc pas calculable.
            </p>
          </Panel>
        </>
      ) : (
        <Panel
          title="Efficacité de la station maritime"
          description="Indicateurs disponibles à partir des pré-inscriptions et mouvements enregistrés"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Pré-inscriptions à traiter"
              value={stats.preInscription.enAttente}
              icon={Users}
              tone="warning"
            />
            <StatCard
              label="Dossiers convertis"
              value={stats.preInscription.converties}
              icon={ChartNoAxesCombined}
              tone="success"
            />
            <StatCard
              label="Délai PRE → NIP"
              value={
                stats.preInscription.delaiMoyenJours === null
                  ? "—"
                  : `${stats.preInscription.delaiMoyenJours} j`
              }
              icon={Clock3}
              hint="dépôt de la pré-inscription → création du NIP"
            />
            <StatCard
              label="Rôles à viser"
              value={stats.activitePortuaire.enAttenteVisa}
              icon={ShieldAlert}
              tone="warning"
            />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-primary">
                Motifs de rejet documentés
              </h3>
              <Barres
                lignes={stats.preInscription.rejets}
                palette={["bg-destructive", "bg-warning", "bg-secondary"]}
              />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-primary">
                Comparatif mensuel des mouvements
              </h3>
              <BarresComparees lignes={stats.mouvements.mensuels} />
              <p className="mt-3 text-xs text-muted-foreground">
                Les stations sont rattachées au marin; une station de traitement distincte n'est pas
                conservée.
              </p>
              <h3 className="mb-3 mt-5 border-t pt-4 text-sm font-semibold text-primary">
                Répartition par station d'attache
              </h3>
              <Barres lignes={stats.mouvements.stations} />
              <h3 className="mb-3 mt-5 border-t pt-4 text-sm font-semibold text-primary">
                Livrets par station d'attache
              </h3>
              <Barres lignes={stats.livretsParStation} />
              <p className="mt-3 text-xs text-muted-foreground">
                La station d'émission et le stock de formulaires vierges sécurisés ne sont pas
                conservés séparément; le graphique utilise la station d'attache du marin.
              </p>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

export function TableauClinique() {
  const stats = useStatistiquesDgmm();
  const apte =
    stats.clinique.verdicts.find((ligne) => ligne.nom === "Apte sans restriction")?.nombre ?? 0;
  const restrictions =
    stats.clinique.verdicts.find((ligne) => ligne.nom === "Apte avec restriction")?.nombre ?? 0;
  const inaptes = stats.clinique.verdicts
    .filter((ligne) => ligne.nom.includes("Inapte"))
    .reduce((sum, ligne) => sum + ligne.nombre, 0);
  const den = apte + restrictions + inaptes;
  return (
    <Panel
      title="Tableau clinique STCW"
      description="Synthèse agrégée des certificats médicaux signés; détails individuels restent dans les dossiers autorisés."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Certificats signés" value={stats.clinique.totalSignes} icon={Users} />
        <StatCard
          label="Déficiences Ishihara"
          value={stats.clinique.deficiencesIshihara}
          icon={ShieldAlert}
          tone="warning"
        />
        <StatCard
          label="Restriction machine documentée"
          value={stats.clinique.restrictionsMachine}
          icon={Ship}
          tone="danger"
        />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-primary">Répartition des décisions</h3>
          <ul className="space-y-3">
            {[
              { label: "Apte sans restriction", valeur: apte, couleur: "bg-success" },
              { label: "Apte avec restriction", valeur: restrictions, couleur: "bg-warning" },
              { label: "Inapte", valeur: inaptes, couleur: "bg-destructive" },
            ].map((ligne) => (
              <li key={ligne.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{ligne.label}</span>
                  <span className="tabular-nums">
                    {den ? Math.round((ligne.valeur / den) * 100) : 0}% · {ligne.valeur}
                  </span>
                </div>
                <Barre valeur={ligne.valeur} maximum={den} couleur={ligne.couleur} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Le taux est calculé par marin (dernier certificat), afin de ne pas recompter les
            renouvellements.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-primary">
            Causes repérées dans les observations
          </h3>
          <Barres
            lignes={stats.clinique.causes}
            palette={["bg-secondary", "bg-warning", "bg-destructive", "bg-primary"]}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Classification indicative par mots-clés; les absences aux convocations ne sont pas
            suivies dans le modèle actuel.
          </p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground">
        <Clock3 className="size-4 text-secondary" />
        Délai moyen création → signature :{" "}
        <strong className="text-primary">{stats.clinique.delaiSignatureMoyenJours} jour(s)</strong>
      </div>
    </Panel>
  );
}

export function TableauArmateur({ entreprise }: { entreprise: string }) {
  const marins = useMarins();
  const visites = useVisites();
  const roles = useRoles().filter((role) => role.armateur === entreprise);
  const equipe = useMemo(
    () => marins.filter((marin) => marin.entreprise === entreprise),
    [marins, entreprise],
  );
  const indicateurs = equipe.map((marin) => {
    const valide = (marin.embarquements ?? [])
      .filter((emb) => emb.armateur === entreprise && emb.statut === "valide_dgmm")
      .sort((a, b) => b.embarquement.localeCompare(a.embarquement))[0];
    if (!valide?.debarquement) return false;
    const retour = (marin.embarquements ?? []).some(
      (emb) =>
        emb.armateur === entreprise &&
        emb.statut === "valide_dgmm" &&
        emb.embarquement > valide.debarquement,
    );
    return !retour && Date.now() - new Date(valide.debarquement).getTime() >= 180 * 86_400_000;
  });
  const turnover = indicateurs.length
    ? Math.round((indicateurs.filter(Boolean).length / indicateurs.length) * 100)
    : 0;
  const membresIds = new Set(roles.flatMap((role) => role.membres.map((membre) => membre.marinId)));
  const effectif = marins.filter(
    (marin) => marin.entreprise === entreprise || membresIds.has(marin.id),
  );
  const echeances = effectif
    .map((marin) => lastCertificate(visites, marin.id))
    .filter((visite) => !!visite?.signee && !visite.revoquee)
    .map((visite) =>
      Math.ceil(
        (new Date(`${visite!.stcw.validJusquau}T23:59:59`).getTime() - Date.now()) / 86_400_000,
      ),
    );
  const expirations = {
    dans30: echeances.filter((jours) => jours >= 0 && jours <= 30).length,
    dans60: echeances.filter((jours) => jours >= 0 && jours <= 60).length,
    dans90: echeances.filter((jours) => jours >= 0 && jours <= 90).length,
  };
  const rolesAttente = roles.filter((role) =>
    marins.some((marin) =>
      (marin.embarquements ?? []).some(
        (emb) => emb.roleId === role.id && emb.statut === "en_attente_validation",
      ),
    ),
  ).length;
  const navires = new Set(
    equipe.flatMap((marin) =>
      (marin.embarquements ?? [])
        .filter(
          (emb) =>
            emb.armateur === entreprise && (!emb.debarquement || emb.statut !== "valide_dgmm"),
        )
        .map((emb) => emb.navire),
    ),
  ).size;
  return (
    <Panel
      title="Performance flotte & prédictif"
      description="Données calculées pour votre compagnie; les règles de safe manning ne sont pas encore enregistrées dans le portail."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Marins sans reprise > 180 j"
          value={`${turnover}%`}
          icon={Users}
          tone={turnover ? "warning" : "success"}
          hint="parmi les marins rattachés"
        />
        <StatCard
          label="Embarquements en attente DGMM"
          value={rolesAttente}
          icon={Clock3}
          tone="warning"
        />
        <StatCard label="Navires avec équipage actif" value={navires} icon={Ship} />
        <StatCard
          label="Certificats ≤ 30 j (portail)"
          value={expirations.dans30}
          icon={ShieldAlert}
          tone="danger"
        />
      </div>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-primary">Alertes de renouvellement</h3>
          <Barres
            lignes={[
              { nom: "Sous 30 jours", nombre: expirations.dans30 },
              { nom: "Sous 60 jours", nombre: expirations.dans60 },
              { nom: "Sous 90 jours", nombre: expirations.dans90 },
            ]}
            palette={["bg-destructive", "bg-warning", "bg-secondary"]}
          />
        </div>
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-primary">Indicateurs à compléter</p>
          <p className="mt-1">
            Le minimum de sécurité par navire et l'historique des corrections/rejets de rôle ne sont
            pas stockés. Le taux de validation du premier coup ne peut donc pas être calculé de
            façon fiable.
          </p>
        </div>
      </div>
    </Panel>
  );
}

export function JaugeCarriere({ marin }: { marin: Marin }) {
  const visites = useVisites();
  const maintenant = Date.now();
  const debutPeriode = maintenant - 3 * 365 * 86_400_000;
  const jours = (marin.embarquements ?? [])
    .filter((emb) => emb.statut === "valide_dgmm")
    .reduce((sum, emb) => {
      const debut = Math.max(new Date(emb.embarquement).getTime(), debutPeriode);
      const fin = Math.min(
        emb.debarquement ? new Date(emb.debarquement).getTime() : maintenant,
        maintenant,
      );
      if (!Number.isFinite(debut) || !Number.isFinite(fin) || fin < debut) return sum;
      return sum + Math.ceil((fin - debut) / 86_400_000);
    }, 0);
  const joursMer = Math.min(3 * 365, jours);
  const joursTerre = Math.max(0, 3 * 365 - joursMer);
  const cert = lastCertificate(visites, marin.id);
  const joursCertificat = cert
    ? Math.ceil(
        (new Date(`${cert.stcw.validJusquau}T23:59:59`).getTime() - Date.now()) / 86_400_000,
      )
    : null;
  const progression = Math.min(100, Math.round((jours / 360) * 100));
  return (
    <Panel
      title="Ma jauge de carrière STCW"
      description="Temps de mer officiel validé et échéances de vos titres."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Service en mer validé"
          value={`${jours} j`}
          icon={Ship}
          hint="cible illustrative : 360 jours"
        />
        <StatCard
          label="Visite STCW"
          value={joursCertificat === null ? "—" : `${joursCertificat} j`}
          icon={Clock3}
          hint={cert ? "avant échéance" : "certificat absent"}
          tone={
            joursCertificat === null || joursCertificat < 0
              ? "danger"
              : joursCertificat <= 90
                ? "warning"
                : "success"
          }
        />
        <StatCard
          label="Visa DGMM"
          value={marin.validationAdmin === "validee" ? "Accordé" : "En attente"}
          icon={ShieldAlert}
          tone={marin.validationAdmin === "validee" ? "success" : "warning"}
        />
        <StatCard
          label="Livret maritime"
          value={marin.livret ? "Délivré" : "En attente"}
          icon={Ship}
          tone={marin.livret ? "success" : "warning"}
        />
      </div>
      <div className="mt-4 rounded-lg border p-4">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span>Ratio mer / terre sur les 3 dernières années</span>
          <strong className="tabular-nums text-primary">
            {joursMer} j / {joursTerre} j
          </strong>
        </div>
        <Barre valeur={joursMer} maximum={3 * 365} couleur="bg-secondary" />
      </div>
      <div className="mt-5">
        <div className="mb-2 flex justify-between text-sm">
          <span>Progression vers un brevet supérieur</span>
          <strong className="tabular-nums">{jours} / 360 j</strong>
        </div>
        <Progress
          value={progression}
          aria-label={`Progression indicative ${progression} pour cent`}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Le seuil réglementaire dépend du brevet, du navire et de la jauge; 360 jours est
          uniquement un exemple de visualisation. Le temps sans embarquement enregistré n'est pas
          nécessairement un congé à terre.
        </p>
      </div>
    </Panel>
  );
}
