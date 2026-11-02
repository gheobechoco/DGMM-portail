import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  CheckCircle2,
  CircleAlert,
  Eye,
  FileCheck2,
  FilePen,
  PenLine,
  Paperclip,
  Pencil,
  Printer,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  UserX,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { RequirePerm } from "@/components/dgmm/Guard";
import { EmptyState, Info, Panel, textareaClass } from "@/components/dgmm/Page";
import { StatusPill } from "@/components/dgmm/Brand";
import {
  EtatCertificatPill,
  MarinPhoto,
  StatutStepper,
  VerdictPill,
} from "@/components/dgmm/MarinBits";
import { DocViewer } from "@/components/dgmm/DocViewer";
import { Aide } from "@/components/dgmm/Aide";
import { BioItem } from "@/components/dgmm/BioItem";
import { station as stationRef } from "@/lib/dgmm/maritime";
import { useChanged } from "@/components/dgmm/Anim";
import { SeaService } from "@/components/dgmm/SeaService";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { can } from "@/lib/dgmm/rules";
import type { Account } from "@/lib/dgmm/auth";
import {
  DOC_LABELS,
  PIECES_VISA,
  age,
  delivrerLivret,
  dossierIncomplet,
  eligibleLivret,
  etatCertificat,
  formatDate,
  fullName,
  lastCertificate,
  manquants,
  motifLivret,
  motifVisa,
  parseDoc,
  marinCertStatus,
  setValidationAdmin,
  useMarins,
  useVisites,
  type DocKey,
  type Evenement,
  type Marin,
  type Visite,
} from "@/lib/dgmm/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/espace/marins/$id")({
  head: () => ({ meta: [{ title: "Fiche marin — GDM | DGMM" }] }),
  component: () => <RequirePerm perm="marins">{(s) => <Fiche session={s} />}</RequirePerm>,
});

function Fiche({ session }: { session: Account }) {
  const { id } = Route.useParams();
  const marins = useMarins();
  const visites = useVisites();
  const m = marins.find((x) => x.id === Number(id));
  // Confirmation visuelle (rebond + flash) quand un statut change.
  const flashAdmin = useChanged(m?.validationAdmin);
  const flashMed = useChanged(m?.validationMedicale);
  const flashCert = useChanged(marinCertStatus(visites, Number(id)));
  const flashLivret = useChanged(m?.livret);
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
  const ecriture = can(session.role, "marins.creer");
  const draft = mv.find((v) => !v.signee);

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
            <MarinPhoto
              m={m}
              className="size-20 shrink-0 rounded-xl border-2 border-gold text-xl"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold">{fullName(m)}</h1>
                {!ecriture && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/10 px-2 py-0.5 text-[11px] font-semibold">
                    <Eye className="size-3" /> Lecture seule
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-primary-foreground/75">
                {m.profession}
                {a !== null && ` · ${a} ans`} · {m.nationalite}
                {m.entreprise && ` · ${m.entreprise}`}
              </p>
              <p className="mt-1 font-mono text-xs text-gold">
                NIP {m.nip}
                {m.livret && ` · Livret ${m.livret}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ecriture && (
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
              {can(session.role, "visites.saisir") && m.validationAdmin !== "rejetee" && (
                <Button asChild size="sm" variant="gold">
                  {draft ? (
                    <Link to="/espace/visites/modifier/$id" params={{ id: String(draft.id) }}>
                      <FilePen /> Reprendre la visite
                    </Link>
                  ) : (
                    <Link to="/espace/visites/nouvelle" search={{ marin: m.id }}>
                      <Stethoscope /> Nouvelle visite
                    </Link>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 divide-y sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <StatusCell label="Validation administrative" flash={flashAdmin}>
            <StatusPill key={m.validationAdmin} status={m.validationAdmin} pop={flashAdmin} />
          </StatusCell>
          <StatusCell label="Validation médicale" flash={flashMed}>
            <StatusPill
              key={m.validationMedicale}
              pop={flashMed}
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
          <StatusCell label="Certificat STCW" flash={flashCert}>
            <StatusPill key={st} status={st} pop={flashCert} />
            {cert && (
              <span className="text-xs text-muted-foreground">
                → {formatDate(cert.stcw.validJusquau)}
              </span>
            )}
          </StatusCell>
          <StatusCell label="Livret maritime" flash={flashLivret}>
            {m.livret ? (
              <span className="font-mono text-sm font-semibold text-primary">{m.livret}</span>
            ) : (
              <StatusPill status="aucun" label="Non délivré" />
            )}
          </StatusCell>
        </div>
        <div className="border-t px-5 py-4">
          <StatutStepper m={m} examenRealise={mv.some((v) => v.signee)} />
        </div>
      </section>

      {can(session.role, "marins.valider_admin") && m.validationAdmin === "en_attente" && (
        <ValidationPanel m={m} visites={visites} auteur={session.nom} />
      )}

      <Tabs defaultValue="dossier" className="mt-6">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="dossier">Dossier</TabsTrigger>
          <TabsTrigger value="documents">
            Pièces ({Object.values(m.documents).filter(Boolean).length})
          </TabsTrigger>
          <TabsTrigger value="visites">Visites médicales ({mv.length})</TabsTrigger>
          <TabsTrigger value="navigation">Navigation ({m.embarquements?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="livret">Livret</TabsTrigger>
          <TabsTrigger value="historique">Historique ({m.historique?.length ?? 0})</TabsTrigger>
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
              <Info label="Situation matrimoniale">
                {m.situationMatrimoniale}
                {m.dateMariage &&
                  ` · ${formatDate(m.dateMariage)}${m.lieuMariage ? `, ${m.lieuMariage}` : ""}`}
              </Info>
            </dl>
          </Panel>
          <Panel title="Contact">
            <dl className="grid grid-cols-2 gap-4">
              <Info label="Téléphone">{m.tel1}</Info>
              <Info label="Téléphone 2">{m.tel2}</Info>
              <Info label="E-mail">{m.email}</Info>
              <Info label="Quartier">{m.quartier}</Info>
            </dl>
          </Panel>
          <Panel title="Activité maritime">
            <dl className="grid grid-cols-2 gap-4">
              <Info label="Profession">{m.profession}</Info>
              <Info label="Entreprise maritime">{m.entreprise}</Info>
              <Info label="Quartier d'inscription">{m.quartierInscription}</Info>
              <Info label="Station d'attache">{stationRef(m.station)?.nom ?? ""}</Info>
              <Info label="Identifiant marin">{m.login}</Info>
            </dl>
          </Panel>
          <Panel
            title={
              <span className="inline-flex items-center gap-1.5">
                Description physique <Aide terme="description" />
              </span>
            }
          >
            <dl className="grid grid-cols-2 gap-4">
              <Info label="Taille">{m.taille ? `${m.taille} cm` : ""}</Info>
              <Info label="Poids">{m.poids ? `${m.poids} kg` : ""}</Info>
              <Info label="Yeux">{m.couleurYeux}</Info>
              <Info label="Cheveux">{m.couleurCheveux}</Info>
            </dl>
            <div className="mt-4">
              <dt className="text-xs text-muted-foreground">Signes particuliers</dt>
              <dd className="mt-0.5 text-sm font-medium">{m.signeParticulier || "—"}</dd>
            </div>
          </Panel>
          <Panel
            title={
              <span className="inline-flex items-center gap-1.5">
                Photo et signature du titulaire <Aide terme="identification" />
              </span>
            }
            className="lg:col-span-2"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <BioItem
                ok={!!m.documents.photo}
                titre="Photo d'identité"
                detail={
                  m.documents.photo?.startsWith("data:")
                    ? "Format passeport 35 × 45"
                    : m.documents.photo
                      ? "Enregistrée"
                      : "À joindre"
                }
              >
                <MarinPhoto m={m} className="h-16 w-[50px] rounded-md border text-xs" />
              </BioItem>
              <BioItem
                ok={!!m.signature}
                titre="Signature du titulaire"
                detail={m.signature ? "Enregistrée" : "À recueillir"}
              >
                {m.signature ? (
                  <img
                    src={m.signature}
                    alt={`Signature de ${fullName(m)}`}
                    className="h-12 max-w-[140px] rounded bg-white object-contain px-1"
                  />
                ) : (
                  <PenLine className="size-8 text-muted-foreground" />
                )}
              </BioItem>
            </div>
          </Panel>
          <p className="text-xs text-muted-foreground lg:col-span-2">
            Créé le {formatDate(m.creeLe)} par {m.creePar} · modifié le {formatDate(m.modifieLe)}
          </p>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Panel title="Pièces justificatives">
            <DocsList m={m} />
          </Panel>
        </TabsContent>

        <TabsContent value="visites" className="mt-4">
          <VisitesTable visites={mv} />
        </TabsContent>

        <TabsContent value="navigation" className="mt-4">
          <SeaService m={m} canEdit={can(session.role, "embarquements")} auteur={session.nom} />
        </TabsContent>

        <TabsContent value="livret" className="mt-4">
          <LivretPanel m={m} canIssue={can(session.role, "marins.livret")} auteur={session.nom} />
        </TabsContent>

        <TabsContent value="historique" className="mt-4">
          <Panel
            title="Historique du dossier"
            description="Toutes les étapes administratives et médicales, de la plus récente à la plus ancienne."
          >
            <Timeline events={m.historique ?? []} />
          </Panel>
        </TabsContent>
      </Tabs>
    </>
  );
}

function StatusCell({
  label,
  children,
  flash,
}: {
  label: string;
  children: ReactNode;
  flash?: boolean | undefined;
}) {
  return (
    <div className={cn("px-5 py-3", flash && "flash-success")}>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function DocsList({ m }: { m: Marin }) {
  const [voir, setVoir] = useState<DocKey | null>(null);
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(DOC_LABELS) as DocKey[]).map((k) => {
          const f = m.documents[k];
          const d = parseDoc(f);
          const photo = k === "photo" && d?.image;
          return (
            <li key={k}>
              <button
                type="button"
                disabled={!f}
                onClick={() => setVoir(k)}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors enabled:hover:border-gold enabled:hover:bg-muted/40 disabled:cursor-default"
              >
                {photo ? (
                  <MarinPhoto m={m} className="h-12 w-10 rounded-md" />
                ) : (
                  <span
                    className={cn(
                      "grid size-10 place-items-center rounded-md",
                      f ? "bg-success/12 text-success" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {f ? <FileCheck2 className="size-4" /> : <Paperclip className="size-4" />}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{DOC_LABELS[k]}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {photo ? "Format passeport 35×45" : (d?.nom ?? "Non fourni")}
                  </div>
                </div>
                {f && <Eye className="size-4 text-muted-foreground" aria-label="Aperçu" />}
              </button>
            </li>
          );
        })}
      </ul>
      <DocViewer
        titre={voir ? DOC_LABELS[voir] : ""}
        value={voir ? m.documents[voir] : undefined}
        open={!!voir}
        onOpenChange={(o) => !o && setVoir(null)}
      />
    </>
  );
}

/** Étape 5 : contrôle des pièces puis validation (ou rejet motivé) du dossier. */
function ValidationPanel({
  m,
  visites,
  auteur,
}: {
  m: Marin;
  visites: Visite[];
  auteur: string;
}) {
  const [rejet, setRejet] = useState(false);
  const [motif, setMotif] = useState("");
  const [voir, setVoir] = useState<DocKey | null>(null);
  const pieces: [string, DocKey][] = [
    ...PIECES_VISA.map((k): [string, DocKey] => [DOC_LABELS[k], k]),
    ["Justificatif de domicile (facultatif)", "residence"],
    ["Contrat d'engagement (facultatif)", "contrat"],
  ];
  const cert = lastCertificate(visites, m.id);
  const certOk = ["valide", "expire_bientot"].includes(marinCertStatus(visites, m.id));
  const bio: [string, boolean][] = [
    [
      certOk && cert
        ? `Certificat d'aptitude ${cert.numero} (${cert.signataire})`
        : "Certificat d'aptitude du Médecin des Gens de Mer",
      certOk,
    ],
    ["Signature du titulaire", !!m.signature],
  ];
  const miss = manquants(m).filter((x) => !["Photo d'identité", "Pièce d'identité"].includes(x));
  const bloquant = motifVisa(m, visites);
  const required = !bloquant;
  return (
    <section className="mt-4 rounded-xl border border-warning/40 bg-warning/8 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-warning" />
        <div className="flex-1">
          <h2 className="flex items-center gap-1.5 font-display font-semibold text-primary">
            Visa administratif DGMM <Aide terme="visa" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Circuit DGMM : la visite médicale d'aptitude précède le dépôt des pièces. Contrôlez
            les pièces (cliquez pour les visualiser) avant d'apposer le visa administratif.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {pieces.map(([label, k]) => {
              const ok = !!m.documents[k];
              return (
                <li key={label} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "grid size-5 place-items-center rounded-full",
                      ok
                        ? "bg-success text-success-foreground"
                        : "bg-destructive/12 text-destructive",
                    )}
                  >
                    {ok ? <Check className="size-3" /> : <XCircle className="size-3" />}
                  </span>
                  <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
                  {ok && (
                    <button
                      type="button"
                      onClick={() => setVoir(k)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <Eye className="size-3" /> Voir
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {bio.map(([label, ok]) => (
              <li key={label} className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full",
                    ok ? "bg-success text-success-foreground" : "bg-warning/15 text-warning",
                  )}
                >
                  {ok ? <Check className="size-3" /> : <PenLine className="size-3" />}
                </span>
                <span className={ok ? "" : "text-muted-foreground"}>
                  {label}
                  {!ok && " — à recueillir"}
                </span>
              </li>
            ))}
          </ul>
          <DocViewer
            titre={voir ? DOC_LABELS[voir] : ""}
            value={voir ? m.documents[voir] : undefined}
            open={!!voir}
            onOpenChange={(o) => !o && setVoir(null)}
          />
          {bloquant && (
            <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs font-medium text-destructive">
              Visa impossible : {bloquant}
            </p>
          )}
          {miss.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              À compléter avant le livret : {miss.join(", ")}.
            </p>
          )}
          {rejet && (
            <div className="mt-3">
              <label htmlFor="motif" className="text-sm font-medium">
                Motif du rejet
              </label>
              <textarea
                id="motif"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                className={cn(textareaClass, "mt-1 min-h-16")}
                placeholder="Ex. pièce d'identité illisible"
              />
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {rejet ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => setRejet(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!motif.trim()}
              onClick={() => {
                setValidationAdmin(m.id, "rejetee", auteur, motif.trim());
                toast.error("Dossier rejeté", { description: motif.trim() });
              }}
            >
              <XCircle /> Confirmer le rejet
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setRejet(true)}
            >
              <XCircle /> Rejeter
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!required}
              title={bloquant ?? undefined}
              onClick={() => {
                setValidationAdmin(m.id, "validee", auteur);
                toast.success("Visa administratif DGMM apposé", {
                  description: "Le dossier pourra être livré dès la validation médicale.",
                });
              }}
            >
              <CheckCircle2 /> Apposer le visa DGMM
            </Button>
          </>
        )}
      </div>
    </section>
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
            <th className="px-3 py-2.5 font-semibold">Médecin</th>
            <th className="px-3 py-2.5 font-semibold">Verdict</th>
            <th className="px-3 py-2.5 font-semibold">Échéance</th>
            <th className="px-4 py-2.5 font-semibold">Certificat</th>
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
              <td className="px-3 py-2.5 text-muted-foreground">{v.signataire || v.praticien}</td>
              <td className="px-3 py-2.5">
                {v.stcw.verdict ? <VerdictPill verdict={v.stcw.verdict} /> : "—"}
              </td>
              <td className="px-3 py-2.5 tabular-nums">{formatDate(v.stcw.validJusquau)}</td>
              <td className="px-4 py-2.5">
                <EtatCertificatPill etat={etatCertificat(v)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const EVENT_ICONS: Record<Evenement["type"], LucideIcon> = {
  creation: UserPlus,
  modification: Pencil,
  admin: ShieldCheck,
  medical: Stethoscope,
  livret: BookOpenCheck,
};
const EVENT_TONES: Record<Evenement["type"], string> = {
  creation: "bg-primary-soft text-primary",
  modification: "bg-muted text-muted-foreground",
  admin: "bg-secondary/12 text-secondary",
  medical: "bg-success/12 text-success",
  livret: "bg-gold/25 text-gold-foreground",
};

function Timeline({ events }: { events: Evenement[] }) {
  if (!events.length) return <EmptyState icon={FilePen} title="Aucun événement enregistré" />;
  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <ol className="relative space-y-5 border-l pl-6">
      {sorted.map((e, i) => {
        const Icon = EVENT_ICONS[e.type];
        return (
          <li key={i} className="relative">
            <span
              className={cn(
                "absolute -left-[37px] grid size-7 place-items-center rounded-full ring-4 ring-card",
                EVENT_TONES[e.type],
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="text-sm font-medium text-foreground">{e.action}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(e.date).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}{" "}
              · {e.auteur}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function LivretPanel({ m, canIssue, auteur }: { m: Marin; canIssue: boolean; auteur: string }) {
  const visites = useVisites();
  const st = marinCertStatus(visites, m.id);
  const checks: [string, boolean][] = [
    ["Validation administrative DGMM", m.validationAdmin === "validee"],
    ["Validation médicale (centre agréé)", m.validationMedicale === "validee"],
    ["Certificat STCW en cours de validité", st === "valide" || st === "expire_bientot"],
    [
      "Dossier complet (description physique, photo, signature, CNI/Passeport)",
      !dossierIncomplet(m),
    ],
  ];
  const ok = eligibleLivret(m, visites);
  const miss = manquants(m);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Panel
        title="Conditions de délivrance"
        description="Le livret n'est délivré qu'après la double validation administrative et médicale."
      >
        <ul className="space-y-2.5">
          {checks.map(([label, pass]) => (
            <li key={label} className="flex items-center gap-2.5 text-sm">
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full",
                  pass
                    ? "bg-success text-success-foreground"
                    : "bg-destructive/12 text-destructive",
                )}
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
            className={cn("size-10", m.livret ? "text-secondary" : "text-muted-foreground")}
          />
          <div className="mt-2 font-mono text-lg font-bold text-primary">
            {m.livret || "Non délivré"}
          </div>
          <div className="mt-4 flex w-full flex-col gap-2">
            {m.livret ? (
              <Button asChild variant="outline">
                <Link to="/espace/livrets/$id" params={{ id: String(m.id) }}>
                  <Printer /> Attestation de délivrance
                </Link>
              </Button>
            ) : canIssue ? (
              <Button
                variant="gold"
                disabled={!ok}
                onClick={() => {
                  const n = delivrerLivret(m.id, auteur);
                  toast.success(`Livret ${n} délivré`);
                }}
              >
                <BookOpenCheck /> Générer le n° de livret
              </Button>
            ) : null}
            {!m.livret && !ok && (
              <p className="flex items-start gap-1.5 rounded-md bg-destructive/8 px-3 py-2 text-left text-xs text-destructive">
                <XCircle className="mt-px size-3.5 shrink-0" /> {motifLivret(m, visites)}
              </p>
            )}
            {!m.livret && !canIssue && (
              <p className="text-xs text-muted-foreground">
                La délivrance relève du Gestionnaire Marine Marchande.
              </p>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
