import { cn } from "@/lib/utils";

export function Tricolor({ className }: { className?: string }) {
  return <div className={cn("tricolor h-1 w-full", className)} aria-hidden />;
}

export function RepubliqueBlock({ className, light }: { className?: string; light?: boolean }) {
  return (
    <div className={cn("text-right leading-tight", className)}>
      <div className={cn("font-display text-xs font-bold uppercase tracking-[0.18em]", light ? "text-primary-foreground" : "text-primary")}>
        République Gabonaise
      </div>
      <div className={cn("text-[11px] italic", light ? "text-gold" : "text-secondary")}>Union – Travail – Justice</div>
    </div>
  );
}

const STATUS_STYLES = {
  validee: "bg-success/12 text-success border-success/30",
  en_attente: "bg-warning/12 text-warning border-warning/30",
  transmis_direction: "bg-primary/10 text-primary border-primary/30",
  rejetee: "bg-destructive/10 text-destructive border-destructive/30",
  valide: "bg-success/12 text-success border-success/30",
  expire_bientot: "bg-warning/12 text-warning border-warning/30",
  expire: "bg-destructive/10 text-destructive border-destructive/30",
  aucun: "bg-muted text-muted-foreground border-border",
} as const;
const STATUS_LABELS = {
  validee: "Validé",
  en_attente: "En attente",
  transmis_direction: "Transmis à la Direction",
  rejetee: "Rejeté",
  valide: "Valide",
  expire_bientot: "À renouveler",
  expire: "Expiré",
  aucun: "Aucun",
} as const;

/** Alerte rouge (onde radar) et alerte ambre (respiration) pour attirer l'œil sur l'urgence. */
const ALERTE_ROUGE = new Set(["expire", "rejetee"]);

export function StatusPill({ status, label, pop }: { status: keyof typeof STATUS_STYLES; label?: string | undefined; pop?: boolean | undefined }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        STATUS_STYLES[status],
        status === "expire_bientot" && "pill-breathe",
        pop && "pop-in",
      )}
    >
      <span className={cn("size-1.5 rounded-full bg-current", ALERTE_ROUGE.has(status) && "dot-ping")} />
      {label ?? STATUS_LABELS[status]}
    </span>
  );
}
