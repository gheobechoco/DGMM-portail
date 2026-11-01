import { QRCodeSVG } from "qrcode.react";
import { Check, Minus } from "lucide-react";
import { Info } from "@/components/dgmm/Page";
import { OfficialHeader } from "@/components/dgmm/OfficialHeader";
import { Cachet } from "@/components/dgmm/Cachet";
import { MarinPhoto } from "@/components/dgmm/MarinBits";
import { ALL_QUESTIONS, imc } from "@/components/dgmm/VisiteForm";
import {
  VERDICT_LABELS,
  codeValidation,
  empreinte,
  etatCertificat,
  formatDate,
  fullName,
  isInapte,
  type Marin,
  type OuiNon,
  type Visite,
} from "@/lib/dgmm/store";
import { cn } from "@/lib/utils";

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

function horodatage(d: string) {
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Visa administratif DGMM : dernier événement de validation administrative du dossier. */
export function visaDgmm(m: Marin | undefined) {
  if (!m || m.validationAdmin !== "validee") return null;
  return (
    [...(m.historique ?? [])]
      .reverse()
      .find((e) => e.type === "admin" && /accordée/.test(e.action)) ?? {
      date: m.modifieLe,
      auteur: "DGMM",
      action: "",
      type: "admin" as const,
    }
  );
}

/** Document officiel du certificat médical d'aptitude (écran + impression A4). */
export function CertificatDocument({ v, m }: { v: Visite; m: Marin | undefined }) {
  const etat = etatCertificat(v);
  const code = m ? codeValidation(v, m.nip) : "";
  const verifyPath = `/verifier/certificat/${encodeURIComponent(code)}`;
  const verifyUrl =
    typeof window !== "undefined" ? `${window.location.origin}${verifyPath}` : verifyPath;
  const bmi = imc(v.examens.taille, v.examens.poids);
  const signature = v.signee
    ? empreinte(
        `${code}|${v.signataire}|${v.traiteLe}|${v.stcw.verdict}|${v.stcw.validJusquau}`,
      ).toUpperCase()
    : "";
  const visa = visaDgmm(m);
  return (
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
          </div>
          {v.signee && code && (
            <div className="flex flex-col items-center gap-1 justify-self-center">
              <QRCodeSVG value={verifyUrl} size={120} fgColor="#0a192f" level="M" />
              <span className="font-mono text-[10px] text-muted-foreground">{code}</span>
              <span className="text-[10px] text-muted-foreground">
                Scanner pour vérifier · Scan to verify
              </span>
            </div>
          )}
        </section>

        <section className="grid gap-4 border-t pt-5 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <Cachet className="size-24 shrink-0" />
            <div className="min-w-0 text-sm">
              <div className="text-xs text-muted-foreground">
                Médecin-chef · Polyclinique EDELWEISS
              </div>
              <div className="font-semibold text-primary">
                {v.signee ? v.signataire : v.praticien}
              </div>
              {v.signee ? (
                <div className="mt-1 space-y-0.5 text-[11px] text-secondary">
                  <div>Signature électronique horodatée</div>
                  <div className="tabular-nums">{horodatage(v.traiteLe)}</div>
                  <div className="break-all font-mono text-[10px] text-muted-foreground">
                    Empreinte {signature}
                  </div>
                </div>
              ) : (
                <div className="mt-1 text-xs text-warning">Non signé — sans valeur officielle</div>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <DgmmVisa ok={!!visa} />
            <div className="min-w-0 text-sm">
              <div className="text-xs text-muted-foreground">
                Visa de la Direction Générale de la Marine Marchande
              </div>
              {visa ? (
                <>
                  <div className="font-semibold text-primary">{visa.auteur}</div>
                  <div className="mt-1 text-[11px] tabular-nums text-secondary">
                    Visa apposé le {horodatage(visa.date)}
                  </div>
                </>
              ) : (
                <div className="mt-1 text-xs text-warning">Visa administratif en attente</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}

/** Tampon « VISA DGMM ». */
function DgmmVisa({ ok }: { ok: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("size-20 shrink-0", !ok && "opacity-30")}
      role="img"
      aria-label={ok ? "Visa DGMM apposé" : "Visa DGMM en attente"}
    >
      <g transform="rotate(8 50 50)" fill="none" stroke="oklch(0.29 0.055 160)" opacity="0.9">
        <rect x="6" y="22" width="88" height="56" rx="6" strokeWidth="3" />
        <rect x="11" y="27" width="78" height="46" rx="4" strokeWidth="1" />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          fontSize="17"
          fontWeight="800"
          fill="oklch(0.29 0.055 160)"
          stroke="none"
          fontFamily="Inter, sans-serif"
          letterSpacing="1"
        >
          VISA
        </text>
        <text
          x="50"
          y="66"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="oklch(0.29 0.055 160)"
          stroke="none"
          fontFamily="Inter, sans-serif"
          letterSpacing="2"
        >
          DGMM
        </text>
      </g>
    </svg>
  );
}
