import type { ReactNode } from "react";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

/** Élément du dossier biométrique (photo, empreintes, signature) avec son état. */
export function BioItem({
  ok,
  titre,
  detail,
  children,
}: {
  ok: boolean;
  titre: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3",
        ok ? "border-success/30 bg-success/5" : "border-dashed",
      )}
    >
      <div className="grid min-h-12 min-w-12 place-items-center">{children}</div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          {ok ? (
            <CheckCircle2 className="size-4 text-success" />
          ) : (
            <CircleDashed className="size-4 text-warning" />
          )}
          {titre}
        </div>
        <div className="truncate text-xs text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}
