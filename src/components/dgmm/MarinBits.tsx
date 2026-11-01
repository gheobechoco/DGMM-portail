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
