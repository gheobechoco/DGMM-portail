import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { selectClass } from "@/components/dgmm/Page";
import { cn } from "@/lib/utils";

/* ---------- Filtre en liste déroulante (remplace les rangées de boutons) ---------- */

export interface OptionFiltre<T extends string> {
  value: T;
  label: string;
  /** Nombre d'éléments correspondants, affiché entre parenthèses. */
  n?: number | undefined;
}

export function FiltreSelect<T extends string>({
  id, label, value, options, onChange, className,
}: {
  id: string;
  label: string;
  value: T;
  options: OptionFiltre<T>[];
  onChange: (v: T) => void;
  className?: string | undefined;
}) {
  return (
    <label htmlFor={id} className={cn("flex min-w-44 flex-col gap-1 text-xs font-medium text-muted-foreground", className)}>
      <span className="inline-flex items-center gap-1"><Filter className="size-3" aria-hidden /> {label}</span>
      <select id={id} className={cn(selectClass, "h-9 text-sm text-foreground")} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}{o.n !== undefined ? ` (${o.n})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Rangée de filtres alignés. */
export function BarreFiltres({ children, className }: { children: React.ReactNode; className?: string | undefined }) {
  return <div className={cn("mb-4 flex flex-wrap items-end gap-3", className)}>{children}</div>;
}

/* ---------- Pagination des longues listes ---------- */

export function usePagination<T>(items: T[], parPage = 8) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / parPage));
  // Revenir à la première page quand la liste change (filtre, recherche).
  useEffect(() => setPage(1), [items.length]);
  const courante = Math.min(page, pages);
  const visibles = useMemo(() => items.slice((courante - 1) * parPage, courante * parPage), [items, courante, parPage]);
  return { visibles, page: courante, pages, setPage, total: items.length, parPage };
}

export function Pagination({
  page, pages, setPage, total, parPage, className,
}: {
  page: number;
  pages: number;
  setPage: (p: number) => void;
  total: number;
  parPage: number;
  className?: string | undefined;
}) {
  if (pages <= 1) return null;
  const debut = (page - 1) * parPage + 1;
  const fin = Math.min(total, page * parPage);
  const bouton = "inline-flex h-8 items-center gap-1 rounded-md border bg-card px-2.5 text-xs font-semibold transition-colors hover:border-gold disabled:pointer-events-none disabled:opacity-40";
  return (
    <nav aria-label="Pagination" className={cn("flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 text-xs text-muted-foreground", className)}>
      <span>{debut}–{fin} sur {total}</span>
      <span className="flex items-center gap-1.5">
        <button type="button" className={bouton} onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Page précédente"><ChevronLeft className="size-3.5" /> Précédent</button>
        <span className="px-1 tabular-nums">Page {page} / {pages}</span>
        <button type="button" className={bouton} onClick={() => setPage(page + 1)} disabled={page >= pages} aria-label="Page suivante">Suivant <ChevronRight className="size-3.5" /></button>
      </span>
    </nav>
  );
}
