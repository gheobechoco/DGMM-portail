import { User } from "lucide-react";
import { StatusPill } from "@/components/dgmm/Brand";
import { cn } from "@/lib/utils";
import { VERDICT_LABELS, type EtatCertificat, type Marin, type Verdict } from "@/lib/dgmm/store";

/** Photo d'identité du marin, ou ses initiales / une silhouette à défaut. */
export function MarinPhoto({
  m,
  className,
  initials = true,
}: {
  m?: Marin | undefined;
  className?: string | undefined;
  initials?: boolean;
}) {
  const photo = m?.documents.photo;
  if (photo?.startsWith("data:")) {
    return (
      <img
        src={photo}
        alt={`Photo de ${m?.prenom ?? ""} ${m?.nom ?? ""}`}
        className={cn("object-cover", className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "grid place-items-center bg-primary-soft font-display font-bold text-primary",
        className,
      )}
      aria-hidden
    >
      {initials && m ? `${m.nom[0] ?? ""}${m.prenom[0] ?? ""}` : <User className="size-1/2" />}
    </span>
  );
}

const ETAT: Record<EtatCertificat, { s: Parameters<typeof StatusPill>[0]["status"]; l: string }> = {
  valide: { s: "valide", l: "Valide" },
  expire_bientot: { s: "expire_bientot", l: "À renouveler" },
  expire: { s: "expire", l: "Expiré" },
  revoque: { s: "rejetee", l: "Révoqué" },
  inapte: { s: "rejetee", l: "Inaptitude" },
  brouillon: { s: "en_attente", l: "Brouillon" },
};
export function EtatCertificatPill({ etat }: { etat: EtatCertificat }) {
  return <StatusPill status={ETAT[etat].s} label={ETAT[etat].l} />;
}

const VERDICT_PILL: Record<Verdict, Parameters<typeof StatusPill>[0]["status"]> = {
  apte: "validee",
  apte_restrictions: "en_attente",
  inapte_temporaire: "expire",
  inapte: "rejetee",
  "": "aucun",
};
export function VerdictPill({ verdict }: { verdict: Verdict }) {
  return <StatusPill status={VERDICT_PILL[verdict]} label={VERDICT_LABELS[verdict]} />;
}

/* ---------- Barre de progression du dossier ---------- */

export function StatutStepper({ m, examenRealise }: { m: Marin; examenRealise: boolean }) {
  type S = "fait" | "encours" | "bloque" | "afaire";
  const steps: { label: string; s: S }[] = [
    { label: "Enrôlé", s: "fait" },
    { label: "Examen médical réalisé", s: examenRealise ? "fait" : "afaire" },
    {
      label: "Aptitude médicale",
      s:
        m.validationMedicale === "validee"
          ? "fait"
          : m.validationMedicale === "rejetee"
            ? "bloque"
            : "afaire",
    },
    {
      label: "Visa administratif DGMM",
      s:
        m.validationAdmin === "validee"
          ? "fait"
          : m.validationAdmin === "rejetee"
            ? "bloque"
            : "afaire",
    },
    { label: "Fascicule émis", s: m.livret ? "fait" : "afaire" },
  ];
  const first = steps.findIndex((x) => x.s !== "fait");
  if (first >= 0 && steps[first]!.s === "afaire") steps[first]!.s = "encours";
  const done = steps.filter((x) => x.s === "fait").length;
  return (
    <nav aria-label={`Avancement du dossier : ${done} étapes sur 5`} className="overflow-x-auto">
      <ol className="flex min-w-[420px] items-start">
        {steps.map((st, i) => (
          <li
            key={st.label}
            className="relative flex flex-1 flex-col items-center text-center"
            aria-current={st.s === "encours" ? "step" : undefined}
          >
            {i > 0 && (
              <span className="absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2 overflow-hidden bg-border" aria-hidden>
                {/* La ligne se remplit d'une étape à l'autre, dans l'ordre du dossier. */}
                {steps[i - 1]!.s === "fait" && (
                  <span className="stepper-ligne block h-full bg-secondary" style={{ animationDelay: `${(i - 1) * 260}ms` }} />
                )}
              </span>
            )}
            <span
              style={{ animationDelay: `${i * 260}ms` }}
              className={cn(
                "stepper-pastille relative z-10 grid size-7 place-items-center rounded-full border-2 text-xs font-bold",
                st.s === "encours" && "stepper-encours",
                st.s === "fait" && "border-secondary bg-secondary text-secondary-foreground",
                st.s === "encours" && "border-gold bg-gold/20 text-gold-foreground",
                st.s === "bloque" &&
                  "border-destructive bg-destructive text-destructive-foreground",
                st.s === "afaire" && "border-border bg-card text-muted-foreground",
              )}
            >
              {st.s === "fait" ? "✓" : st.s === "bloque" ? "✕" : i + 1}
            </span>
            <span
              className={cn(
                "mt-1.5 px-1 text-[11px] font-medium leading-tight",
                st.s === "afaire" ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {st.label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
