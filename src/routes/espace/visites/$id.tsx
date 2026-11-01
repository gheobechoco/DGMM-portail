import { Link, createFileRoute } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Check, FileX, Minus, PenLine, Printer } from "lucide-react";
import { RequirePerm } from "@/components/dgmm/Guard";
import { EmptyState, Info } from "@/components/dgmm/Page";
import { OfficialHeader } from "@/components/dgmm/OfficialHeader";
import { StatusPill } from "@/components/dgmm/Brand";
import { Button } from "@/components/ui/button";
import { certificateStatus } from "@/lib/dgmm/rules";
import { formatDate, fullName, useMarins, useVisites, type OuiNon } from "@/lib/dgmm/store";

export const Route = createFileRoute("/espace/visites/$id")({
  head: () => ({ meta: [{ title: "Certificat médical — GDM | DGMM" }] }),
  component: () => <RequirePerm perm="marins">{() => <Certificat />}</RequirePerm>,
});

const QUESTIONS: [string, string][] = [
  ["identiteVerifiee", "Documents d'identité vérifiés"],
  ["acuiteVisuelle", "Acuité visuelle conforme (A-I/9)"],
  ["auditiveSansAide", "Audition conforme sans prothèse"],
  ["acuiteAuditive", "Acuité auditive conforme (A-I/9)"],
  ["couleurs", "Perception des couleurs satisfaisante"],
  ["veille", "Apte au service de veille"],
  ["aidesVisuelles", "Aides visuelles nécessaires"],
  ["exemptAffection", "Exempt d'affection incompatible avec le service en mer"],
];
const VERDICT: Record<string, string> = {
  apte: "APTE",
  apte_restrictions: "APTE AVEC RESTRICTIONS",
  inapte: "INAPTE",
  "": "Non renseigné",
};

function Answer({ v }: { v: OuiNon }) {
  if (!v)
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="size-3" /> —
      </span>
    );
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold ${v === "oui" ? "text-secondary" : "text-primary"}`}
    >
      {v === "oui" && <Check className="size-3" />}
      {v === "oui" ? "Oui" : "Non"}
    </span>
  );
}

function Certificat() {
  const { id } = Route.useParams();
  const v = useVisites().find((x) => x.id === Number(id));
  const m = useMarins().find((x) => x.id === v?.marinId);
  if (!v) {
    return (
      <div className="rounded-xl border bg-card shadow-card">
        <EmptyState icon={FileX} title="Visite introuvable" />
      </div>
    );
  }
  const st =
    v.signee && v.stcw.verdict !== "inapte" ? certificateStatus(v.stcw.validJusquau) : null;
  const verifyUrl =
    typeof window !== "undefined" && m
      ? `${window.location.origin}/verifier/${encodeURIComponent(m.nip)}`
      : "";
  const verdictColor =
    v.stcw.verdict === "apte"
      ? "border-success text-success"
      : v.stcw.verdict === "inapte"
        ? "border-destructive text-destructive"
        : "border-warning text-warning";

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/espace/visites"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" /> Visites médicales
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {!v.signee ? (
            <StatusPill status="en_attente" label="Brouillon non signé" />
          ) : (
            st && <StatusPill status={st} />
          )}
          {!v.signee && (
            <Button asChild size="sm" variant="gold">
              <Link to="/espace/visites/modifier/$id" params={{ id }}>
                <PenLine /> Compléter / signer
              </Link>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer /> Imprimer
          </Button>
        </div>
      </div>

      <article className="print-sheet mx-auto max-w-3xl overflow-hidden rounded-xl border bg-card shadow-card">
        <OfficialHeader
          title="Certificat médical d'aptitude"
          subtitle="Délivré conformément à la règle I/9 de la Convention STCW et à la Convention du travail maritime"
        />
        <div className="space-y-6 p-6">
          <div className="flex justify-between gap-4 text-xs">
            <span>
              N° <span className="font-mono font-semibold text-primary">{v.numero}</span>
            </span>
            <span className="text-muted-foreground">Examen du {formatDate(v.creeLe)}</span>
          </div>

          <section>
            <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase tracking-wider text-secondary">
              Titulaire
            </h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Info label="Nom et prénoms">{fullName(m)}</Info>
              <Info label="Date de naissance">{formatDate(m?.dateNaissance)}</Info>
              <Info label="Nationalité">{m?.nationalite}</Info>
              <Info label="NIP">{m?.nip}</Info>
              <Info label="Fonction">{m?.profession}</Info>
              <Info label="Sexe">
                {m?.sexe === "F" ? "Féminin" : m?.sexe === "M" ? "Masculin" : ""}
              </Info>
            </dl>
          </section>

          <section>
            <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase tracking-wider text-secondary">
              Examen clinique
            </h2>
            <dl className="grid grid-cols-3 gap-4 sm:grid-cols-6">
              <Info label="Taille">{v.examens.taille && `${v.examens.taille} cm`}</Info>
              <Info label="Poids">{v.examens.poids && `${v.examens.poids} kg`}</Info>
              <Info label="Tension">{v.examens.tension}</Info>
              <Info label="Pouls">{v.examens.pouls}</Info>
              <Info label="Vision">{v.examens.vision}</Info>
              <Info label="Audition">{v.examens.audition}</Info>
            </dl>
            {(v.examens.observations || v.complementaires || v.recommandations) && (
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                {v.examens.observations && (
                  <p>
                    <span className="block text-xs text-muted-foreground">Observations</span>
                    {v.examens.observations}
                  </p>
                )}
                {v.complementaires && (
                  <p>
                    <span className="block text-xs text-muted-foreground">
                      Examens complémentaires
                    </span>
                    {v.complementaires}
                  </p>
                )}
                {v.recommandations && (
                  <p>
                    <span className="block text-xs text-muted-foreground">Recommandations</span>
                    {v.recommandations}
                  </p>
                )}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase tracking-wider text-secondary">
              Déclaration du médecin agréé
            </h2>
            <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {QUESTIONS.map(([k, label]) => (
                <li
                  key={k}
                  className="flex items-center justify-between gap-3 border-b border-dashed pb-1.5"
                >
                  <span>{label}</span>
                  <Answer v={v.stcw[k as keyof typeof v.stcw] as OuiNon} />
                </li>
              ))}
            </ul>
            {v.stcw.couleurs === "oui" && v.stcw.dateTestCouleurs && (
              <p className="mt-2 text-xs text-muted-foreground">
                Dernier test de perception des couleurs : {formatDate(v.stcw.dateTestCouleurs)}
              </p>
            )}
          </section>

          <section className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
            <div>
              <div
                className={`inline-block rounded-md border-2 px-4 py-2 font-display text-lg font-bold tracking-wide ${verdictColor}`}
              >
                {VERDICT[v.stcw.verdict]}
              </div>
              {v.stcw.details && (
                <p className="mt-2 text-sm">
                  <span className="text-muted-foreground">Précisions : </span>
                  {v.stcw.details}
                </p>
              )}
              {v.stcw.verdict !== "inapte" && (
                <dl className="mt-4 grid grid-cols-2 gap-4">
                  <Info label="Date de délivrance">{formatDate(v.stcw.dateDelivrance)}</Info>
                  <Info label="Date d'expiration">{formatDate(v.stcw.validJusquau)}</Info>
                </dl>
              )}
              <div className="mt-5 text-sm">
                <div className="text-xs text-muted-foreground">Médecin agréé</div>
                <div className="font-semibold text-primary">
                  {v.signee ? v.signataire : v.praticien}
                </div>
                <div className={`mt-1 text-xs ${v.signee ? "text-secondary" : "text-warning"}`}>
                  {v.signee
                    ? `Signé électroniquement le ${formatDate(v.traiteLe)}`
                    : "Document non signé — sans valeur officielle"}
                </div>
              </div>
            </div>
            {v.signee && verifyUrl && (
              <div className="flex flex-col items-center gap-1 justify-self-center">
                <QRCodeSVG value={verifyUrl} size={112} fgColor="#0a192f" level="M" />
                <span className="text-[10px] text-muted-foreground">Vérifier l'authenticité</span>
              </div>
            )}
          </section>
        </div>
      </article>
    </>
  );
}
