import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Ban, Check, ExternalLink, FileX, Minus, PenLine, Printer } from "lucide-react";
import { toast } from "sonner";
import { RequirePerm } from "@/components/dgmm/Guard";
import { EmptyState, Info, textareaClass } from "@/components/dgmm/Page";
import { OfficialHeader } from "@/components/dgmm/OfficialHeader";
import { Cachet } from "@/components/dgmm/Cachet";
import { EtatCertificatPill, MarinPhoto } from "@/components/dgmm/MarinBits";
import { ALL_QUESTIONS, imc } from "@/components/dgmm/VisiteForm";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/dgmm/rules";
import type { Account } from "@/lib/dgmm/auth";
import {
  VERDICT_LABELS,
  codeValidation,
  etatCertificat,
  formatDate,
  fullName,
  isInapte,
  revoquerCertificat,
  useMarins,
  useVisites,
  type OuiNon,
} from "@/lib/dgmm/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/espace/visites/$id")({
  head: () => ({ meta: [{ title: "Certificat médical — GDM | DGMM" }] }),
  component: () => <RequirePerm perm="marins">{(s) => <Certificat session={s} />}</RequirePerm>,
});

function Answer({ v }: { v: OuiNon | undefined }) {
  if (!v)
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="size-3" /> —
      </span>
    );
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold",
        v === "oui" ? "text-secondary" : "text-primary",
      )}
    >
      {v === "oui" && <Check className="size-3" />}
      {v === "oui" ? "Oui" : "Non"}
    </span>
  );
}

const VERDICT_COLOR: Record<string, string> = {
  apte: "border-success text-success",
  apte_restrictions: "border-warning text-warning",
  inapte_temporaire: "border-[oklch(0.62_0.17_45)] text-[oklch(0.5_0.17_45)]",
  inapte: "border-destructive text-destructive",
  "": "border-border text-muted-foreground",
};

function Certificat({ session }: { session: Account }) {
  const { id } = Route.useParams();
  const v = useVisites().find((x) => x.id === Number(id));
  const m = useMarins().find((x) => x.id === v?.marinId);
  const [revoque, setRevoque] = useState(false);
  const [motif, setMotif] = useState("");
  if (!v) {
    return (
      <div className="rounded-xl border bg-card shadow-card">
        <EmptyState icon={FileX} title="Visite introuvable" />
      </div>
    );
  }
  const etat = etatCertificat(v);
  const code = m ? codeValidation(v, m.nip) : "";
  const verifyPath = `/verifier/certificat/${encodeURIComponent(code)}`;
  const verifyUrl =
    typeof window !== "undefined" ? `${window.location.origin}${verifyPath}` : verifyPath;
  const bmi = imc(v.examens.taille, v.examens.poids);
  const canPrint = can(session.role, "certificats.imprimer") && v.signee;

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
          <EtatCertificatPill etat={etat} />
          {!v.signee && can(session.role, "visites.saisir") && (
            <Button asChild size="sm" variant="gold">
              <Link to="/espace/visites/modifier/$id" params={{ id }}>
                <PenLine />{" "}
                {can(session.role, "visites.signer") ? "Compléter / signer" : "Compléter"}
              </Link>
            </Button>
          )}
          {v.signee && !v.revoquee && can(session.role, "visites.signer") && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setRevoque((r) => !r)}
            >
              <Ban /> Révoquer
            </Button>
          )}
          {v.signee && (
            <Button asChild size="sm" variant="ghost">
              <a href={verifyPath} target="_blank" rel="noreferrer">
                <ExternalLink /> Page de vérification
              </a>
            </Button>
          )}
          {canPrint && (
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer /> Imprimer
            </Button>
          )}
        </div>
      </div>

      {revoque && (
        <div className="no-print mx-auto mb-4 max-w-3xl rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <label htmlFor="motif" className="text-sm font-semibold text-destructive">
            Motif de la révocation
          </label>
          <textarea
            id="motif"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            className={cn(textareaClass, "mt-1 min-h-16")}
            placeholder="Ex. erreur d'identité, aggravation de l'état de santé…"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setRevoque(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!motif.trim()}
              onClick={() => {
                revoquerCertificat(v.id, motif.trim(), session.nom);
                setRevoque(false);
                toast.error(`Certificat ${v.numero} révoqué`, {
                  description: "La vérification par QR code l'indique désormais.",
                });
              }}
            >
              Confirmer la révocation
            </Button>
          </div>
        </div>
      )}

      <article className="print-sheet relative mx-auto max-w-3xl overflow-hidden rounded-xl border bg-card shadow-card">
        {(etat === "revoque" || etat === "brouillon") && (
          <div
            className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
            aria-hidden
          >
            <span className="-rotate-[24deg] rounded-lg border-4 border-destructive/40 px-6 py-2 font-display text-5xl font-black uppercase tracking-widest text-destructive/25">
              {etat === "revoque" ? "Révoqué" : "Brouillon"}
            </span>
          </div>
        )}
        <OfficialHeader
          title="Certificat médical d'aptitude"
          subtitle="Délivré conformément à la règle I/9 et à la section A-I/9 du Code STCW (OMI) et à la Convention du travail maritime"
        />
        <div className="space-y-6 p-6">
          <div className="flex justify-between gap-4 text-xs">
            <span>
              N° <span className="font-mono font-semibold text-primary">{v.numero}</span>
            </span>
            <span className="text-muted-foreground">Examen du {formatDate(v.creeLe)}</span>
          </div>

          <section className="grid gap-5 sm:grid-cols-[110px_1fr]">
            <MarinPhoto m={m} className="aspect-[3/4] w-[110px] rounded-md border text-2xl" />
            <div>
              <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase tracking-wider text-secondary">
                Titulaire
              </h2>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Info label="Nom et prénoms">{fullName(m)}</Info>
                <Info label="Date de naissance">{formatDate(m?.dateNaissance)}</Info>
                <Info label="Nationalité">{m?.nationalite}</Info>
                <Info label="NIP">{m?.nip}</Info>
                <Info label="Profession">{m?.profession}</Info>
                <Info label="Livret maritime">{m?.livret}</Info>
              </dl>
            </div>
          </section>

          <section>
            <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase tracking-wider text-secondary">
              Examen clinique
            </h2>
            <dl className="grid grid-cols-3 gap-4 sm:grid-cols-6">
              <Info label="Taille">{v.examens.taille && `${v.examens.taille} cm`}</Info>
              <Info label="Poids">{v.examens.poids && `${v.examens.poids} kg`}</Info>
              <Info label="IMC">{bmi ? bmi.valeur.toLocaleString("fr-FR") : ""}</Info>
              <Info label="Tension">{v.examens.tension}</Info>
              <Info label="Pouls">{v.examens.pouls && `${v.examens.pouls} bpm`}</Info>
              <Info label="Audition">{v.examens.audition}</Info>
              <Info label="Vision sans corr.">{v.examens.vision}</Info>
              <Info label="Vision avec corr.">{v.examens.visionCorrigee}</Info>
            </dl>
          </section>

          <section>
            <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase tracking-wider text-secondary">
              Déclaration du médecin agréé (A-I/9)
            </h2>
            <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {ALL_QUESTIONS.map(([k, label]) => (
                <li
                  key={k}
                  className="flex items-center justify-between gap-3 border-b border-dashed pb-1.5"
                >
                  <span>{label}</span>
                  <Answer v={v.stcw[k] as OuiNon | undefined} />
                </li>
              ))}
            </ul>
            {v.stcw.dateTestCouleurs && (
              <p className="mt-2 text-xs text-muted-foreground">
                Test d'Ishihara réalisé le {formatDate(v.stcw.dateTestCouleurs)}
              </p>
            )}
          </section>

          <section className="grid items-end gap-6 sm:grid-cols-[1fr_auto]">
            <div>
              <div
                className={cn(
                  "inline-block rounded-md border-2 px-4 py-2 font-display text-lg font-bold uppercase tracking-wide",
                  VERDICT_COLOR[v.stcw.verdict],
                )}
              >
                {VERDICT_LABELS[v.stcw.verdict]}
              </div>
              {v.stcw.details && (
                <p className="mt-2 text-sm">
                  <span className="text-muted-foreground">
                    {isInapte(v.stcw.verdict) ? "Motif : " : "Restrictions : "}
                  </span>
                  {v.stcw.details}
                </p>
              )}
              {v.revoquee && (
                <p className="mt-2 text-sm font-semibold text-destructive">
                  Certificat révoqué : {v.motifRevocation}
                </p>
              )}
              {!isInapte(v.stcw.verdict) && v.stcw.verdict && (
                <dl className="mt-4 grid grid-cols-2 gap-4">
                  <Info label="Date de délivrance">{formatDate(v.stcw.dateDelivrance)}</Info>
                  <Info label="Échéance">{formatDate(v.stcw.validJusquau)}</Info>
                </dl>
              )}
              <div className="mt-5 flex items-center gap-4">
                <Cachet className="size-24 shrink-0" />
                <div className="text-sm">
                  <div className="text-xs text-muted-foreground">Médecin agréé</div>
                  <div className="font-semibold text-primary">
                    {v.signee ? v.signataire : v.praticien}
                  </div>
                  <div className={cn("mt-1 text-xs", v.signee ? "text-secondary" : "text-warning")}>
                    {v.signee
                      ? `Signé numériquement le ${formatDate(v.traiteLe)}`
                      : "Non signé — sans valeur officielle"}
                  </div>
                </div>
              </div>
            </div>
            {v.signee && code && (
              <div className="flex flex-col items-center gap-1 justify-self-center">
                <QRCodeSVG value={verifyUrl} size={120} fgColor="#0a192f" level="M" />
                <span className="font-mono text-[10px] text-muted-foreground">{code}</span>
                <span className="text-[10px] text-muted-foreground">
                  Scanner pour vérifier l'authenticité
                </span>
              </div>
            )}
          </section>
        </div>
      </article>
    </>
  );
}
