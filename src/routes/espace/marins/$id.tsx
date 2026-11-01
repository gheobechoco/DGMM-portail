import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  Paperclip,
  Pencil,
  Printer,
  Stethoscope,
  UserX,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { RequirePerm } from "@/components/dgmm/Guard";
import { EmptyState, Info, Panel } from "@/components/dgmm/Page";
import { StatusPill } from "@/components/dgmm/Brand";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { can } from "@/lib/dgmm/rules";
import type { Account } from "@/lib/dgmm/auth";
import {
  DOC_LABELS,
  age,
  delivrerLivret,
  dossierIncomplet,
  eligibleLivret,
  formatDate,
  fullName,
  lastCertificate,
  manquants,
  marinCertStatus,
  setValidationAdmin,
  useMarins,
  useVisites,
  type DocKey,
  type Marin,
  type Visite,
} from "@/lib/dgmm/store";

export const Route = createFileRoute("/espace/marins/$id")({
  head: () => ({ meta: [{ title: "Dossier marin — GDM | DGMM" }] }),
  component: () => <RequirePerm perm="marins">{(s) => <Fiche session={s} />}</RequirePerm>,
});

const VERDICT: Record<string, string> = {
  apte: "Apte",
  apte_restrictions: "Apte avec restrictions",
  inapte: "Inapte",
  "": "—",
};

function Fiche({ session }: { session: Account }) {
  const { id } = Route.useParams();
  const marins = useMarins();
  const visites = useVisites();
  const m = marins.find((x) => x.id === Number(id));
  if (!m) {
    return (
      <div className="rounded-xl border bg-card shadow-card">
        <EmptyState icon={UserX} title="Dossier introuvable">
          <Link to="/espace/marins" className="text-primary hover:underline">
            Retour à la liste
          </Link>
        </EmptyState>
      </div>
    );
  }
  const mv = visites
    .filter((v) => v.marinId === m.id)
    .sort((a, b) => b.creeLe.localeCompare(a.creeLe));
  const cert = lastCertificate(visites, m.id);
  const st = marinCertStatus(visites, m.id);
  const a = age(m);

  return (
    <>
      <Link
        to="/espace/marins"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" /> Gens de mer
      </Link>

      <section className="overflow-hidden rounded-xl border bg-card shadow-card">
        <div className="bg-navy-gradient px-5 py-5 text-primary-foreground sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="grid size-16 shrink-0 place-items-center rounded-full border-2 border-gold bg-primary-foreground/10 font-display text-xl font-bold">
              {m.nom[0]}
              {m.prenom[0]}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-bold">{fullName(m)}</h1>
              <p className="mt-0.5 text-sm text-primary-foreground/75">
                {m.profession}
                {a !== null && ` · ${a} ans`} · {m.nationalite}
              </p>
              <p className="mt-1 font-mono text-xs text-gold">
                NIP {m.nip}
                {m.livret && ` · Livret ${m.livret}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {can(session.role, "marins.creer") && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <Link to="/espace/marins/modifier/$id" params={{ id }}>
                    <Pencil /> Modifier
                  </Link>
                </Button>
              )}
              {can(session.role, "visites") && (
                <Button asChild size="sm" variant="gold">
                  <Link to="/espace/visites/nouvelle" search={{ marin: m.id }}>
                    <Stethoscope /> Nouvelle visite
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <StatusCell label="Validation administrative">
            <StatusPill status={m.validationAdmin} />
          </StatusCell>
          <StatusCell label="Aptitude médicale">
            <StatusPill
              status={m.validationMedicale}
              label={
                m.validationMedicale === "validee"
                  ? "Apte"
                  : m.validationMedicale === "rejetee"
                    ? "Inapte"
                    : undefined
              }
            />
          </StatusCell>
          <StatusCell label="Certificat STCW">
            <StatusPill status={st} />
            {cert && (
              <span className="text-xs text-muted-foreground">
                jusqu'au {formatDate(cert.stcw.validJusquau)}
              </span>
            )}
          </StatusCell>
        </div>
      </section>

      {can(session.role, "marins.valider_admin") && m.validationAdmin === "en_attente" && (
        <ValidationBar m={m} />
      )}

      <Tabs defaultValue="dossier" className="mt-6">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="dossier">Dossier</TabsTrigger>
          <TabsTrigger value="documents">
            Pièces ({Object.values(m.documents).filter(Boolean).length})
          </TabsTrigger>
          <TabsTrigger value="visites">Visites médicales ({mv.length})</TabsTrigger>
          <TabsTrigger value="livret">Livret maritime</TabsTrigger>
        </TabsList>

        <TabsContent value="dossier" className="mt-4 grid gap-6 lg:grid-cols-2">
          <Panel title="État civil">
            <dl className="grid grid-cols-2 gap-4">
              <Info label="Nom">{m.nom}</Info>
              <Info label="Prénom(s)">{m.prenom}</Info>
              <Info label="Sexe">
                {m.sexe === "M" ? "Masculin" : m.sexe === "F" ? "Féminin" : ""}
              </Info>
              <Info label="Date de naissance">{formatDate(m.dateNaissance)}</Info>
              <Info label="Nationalité">{m.nationalite}</Info>
              <Info label="Mariage">
                {m.dateMariage
                  ? `${formatDate(m.dateMariage)}${m.lieuMariage ? ` · ${m.lieuMariage}` : ""}`
                  : ""}
              </Info>
            </dl>
          </Panel>
          <Panel title="Coordonnées">
            <dl className="grid grid-cols-2 gap-4">
              <Info label="Téléphone">{m.tel1}</Info>
              <Info label="Téléphone 2">{m.tel2}</Info>
              <Info label="E-mail">{m.email}</Info>
              <Info label="Quartier">{m.quartier}</Info>
            </dl>
          </Panel>
          <Panel title="Situation maritime">
            <dl className="grid grid-cols-2 gap-4">
              <Info label="Fonction">{m.profession}</Info>
              <Info label="Armateur">{m.entreprise}</Info>
              <Info label="Quartier d'inscription">{m.quartierInscription}</Info>
              <Info label="Identifiant marin">{m.login}</Info>
            </dl>
          </Panel>
          <Panel title="Signalement">
            <dl className="grid grid-cols-2 gap-4">
              <Info label="Taille">{m.taille ? `${m.taille} cm` : ""}</Info>
              <Info label="Yeux">{m.couleurYeux}</Info>
              <Info label="Cheveux">{m.couleurCheveux}</Info>
              <Info label="Signe particulier">{m.signeParticulier}</Info>
            </dl>
          </Panel>
          <p className="text-xs text-muted-foreground lg:col-span-2">
            Créé le {formatDate(m.creeLe)} par {m.creePar} · modifié le {formatDate(m.modifieLe)}
          </p>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Panel title="Pièces justificatives">
            <ul className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(DOC_LABELS) as DocKey[]).map((k) => {
                const f = m.documents[k];
                return (
                  <li key={k} className="flex items-center gap-3 rounded-lg border p-3">
                    <span
                      className={`grid size-9 place-items-center rounded-md ${f ? "bg-success/12 text-success" : "bg-muted text-muted-foreground"}`}
                    >
                      {f ? <FileCheck2 className="size-4" /> : <Paperclip className="size-4" />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{DOC_LABELS[k]}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {f ?? "Non fourni"}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="visites" className="mt-4">
          <VisitesTable visites={mv} />
        </TabsContent>

        <TabsContent value="livret" className="mt-4">
          <LivretPanel m={m} canIssue={can(session.role, "marins.livret")} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function StatusCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-3">
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function ValidationBar({ m }: { m: Marin }) {
  const miss = dossierIncomplet(m) ? manquants(m) : [];
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning/8 p-4 sm:flex-row sm:items-center">
      <CircleAlert className="size-5 shrink-0 text-warning" />
      <div className="flex-1 text-sm">
        <div className="font-semibold text-primary">
          Dossier en attente de validation administrative
        </div>
        <div className="text-muted-foreground">
          {miss.length
            ? `Éléments manquants : ${miss.join(", ")}.`
            : "Toutes les pièces requises sont présentes."}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => {
            setValidationAdmin(m.id, "rejetee");
            toast.error("Dossier rejeté");
          }}
        >
          <XCircle /> Rejeter
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setValidationAdmin(m.id, "validee");
            toast.success("Dossier validé", {
              description: "Le marin peut passer la visite médicale d'aptitude.",
            });
          }}
        >
          <CheckCircle2 /> Valider
        </Button>
      </div>
    </div>
  );
}

export function VisitesTable({ visites }: { visites: Visite[] }) {
  if (!visites.length) {
    return (
      <div className="rounded-xl border bg-card shadow-card">
        <EmptyState icon={Stethoscope} title="Aucune visite médicale">
          Aucune visite d'aptitude n'a encore été enregistrée pour ce marin.
        </EmptyState>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-semibold">N° visite</th>
            <th className="px-3 py-2.5 font-semibold">Date</th>
            <th className="px-3 py-2.5 font-semibold">Praticien</th>
            <th className="px-3 py-2.5 font-semibold">Décision</th>
            <th className="px-3 py-2.5 font-semibold">Valide jusqu'au</th>
            <th className="px-4 py-2.5 font-semibold">État</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {visites.map((v) => (
            <tr key={v.id} className="hover:bg-muted/40">
              <td className="px-4 py-2.5">
                <Link
                  to="/espace/visites/$id"
                  params={{ id: String(v.id) }}
                  className="font-mono text-xs font-semibold text-primary hover:underline"
                >
                  {v.numero}
                </Link>
              </td>
              <td className="px-3 py-2.5 tabular-nums">{formatDate(v.creeLe)}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{v.praticien}</td>
              <td className="px-3 py-2.5">{VERDICT[v.stcw.verdict]}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatDate(v.stcw.validJusquau)}</td>
              <td className="px-4 py-2.5">
                {v.signee ? (
                  <StatusPill status="validee" label="Signée" />
                ) : (
                  <StatusPill status="en_attente" label="Brouillon" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LivretPanel({ m, canIssue }: { m: Marin; canIssue: boolean }) {
  const visites = useVisites();
  const st = marinCertStatus(visites, m.id);
  const checks: [string, boolean][] = [
    ["Validation administrative", m.validationAdmin === "validee"],
    ["Aptitude médicale validée", m.validationMedicale === "validee"],
    ["Certificat STCW en cours de validité", st === "valide" || st === "expire_bientot"],
    ["Dossier complet (signalement, photo, pièce d'identité)", !dossierIncomplet(m)],
  ];
  const ok = eligibleLivret(m, visites);
  const miss = manquants(m);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Panel
        title="Conditions de délivrance"
        description="Le livret maritime sécurisé n'est délivré qu'aux marins remplissant toutes les conditions."
      >
        <ul className="space-y-2.5">
          {checks.map(([label, pass]) => (
            <li key={label} className="flex items-center gap-2.5 text-sm">
              <span
                className={`grid size-5 place-items-center rounded-full ${pass ? "bg-success text-success-foreground" : "bg-destructive/12 text-destructive"}`}
              >
                {pass ? <Check className="size-3" /> : <XCircle className="size-3" />}
              </span>
              <span className={pass ? "" : "text-muted-foreground"}>{label}</span>
            </li>
          ))}
        </ul>
        {miss.length > 0 && (
          <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            À compléter : {miss.join(", ")}.
          </p>
        )}
      </Panel>
      <Panel title="Livret maritime">
        <div className="flex flex-col items-center text-center">
          <BookOpenCheck
            className={`size-10 ${m.livret ? "text-secondary" : "text-muted-foreground"}`}
          />
          <div className="mt-2 font-mono text-lg font-bold text-primary">
            {m.livret || "Non délivré"}
          </div>
          <div className="mt-4 flex w-full flex-col gap-2">
            {m.livret ? (
              <Button asChild variant="outline">
                <Link to="/espace/livrets/$id" params={{ id: String(m.id) }}>
                  <Printer /> Voir / imprimer le livret
                </Link>
              </Button>
            ) : canIssue ? (
              <Button
                variant="gold"
                disabled={!ok}
                onClick={() => {
                  const n = delivrerLivret(m.id);
                  toast.success(`Livret ${n} délivré`);
                }}
              >
                <BookOpenCheck /> Délivrer le livret
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                La délivrance relève du gestionnaire de la Marine Marchande.
              </p>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
