import { DgmmLogo } from "@/components/dgmm/Logo";
import { Tricolor } from "@/components/dgmm/Brand";

/** En-tête officiel des documents imprimables (certificat, livret). */
export function OfficialHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string | undefined;
}) {
  return (
    <div>
      <Tricolor />
      <div className="flex items-center gap-4 border-b px-6 py-4">
        <DgmmLogo className="size-16 shrink-0" />
        <div className="flex-1 leading-tight">
          <div className="font-display text-xs font-bold uppercase tracking-[0.14em] text-primary">
            République Gabonaise
          </div>
          <div className="text-[11px] italic text-secondary">Union – Travail – Justice</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Ministère des Transports · Direction Générale de la Marine Marchande
          </div>
        </div>
      </div>
      <div className="px-6 pt-5 text-center">
        <h1 className="font-display text-xl font-bold uppercase tracking-wide text-primary">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
