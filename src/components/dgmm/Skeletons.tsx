import { Skeleton } from "@/components/ui/skeleton";
import { Tricolor } from "@/components/dgmm/Brand";

/** Silhouette de l'espace professionnel affichée pendant le chargement. */
export function EspaceSkeleton() {
  return (
    <div
      className="min-h-screen bg-background"
      aria-busy="true"
      aria-label="Chargement de l'espace professionnel"
    >
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-sidebar lg:block">
        <Tricolor />
        <div className="flex items-center gap-3 px-5 py-5">
          <Skeleton className="size-11 rounded-full bg-sidebar-accent" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-16 bg-sidebar-accent" />
            <Skeleton className="h-2.5 w-28 bg-sidebar-accent" />
          </div>
        </div>
        <div className="space-y-2 px-4 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full bg-sidebar-accent" />
          ))}
        </div>
      </aside>
      <div className="lg:pl-64">
        <div className="flex h-14 items-center gap-3 border-b bg-card px-6">
          <Skeleton className="h-9 w-full max-w-md" />
          <Skeleton className="ml-auto size-9" />
          <Skeleton className="size-9" />
        </div>
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-xl border bg-card p-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-14" />
              </div>
            ))}
          </div>
          <TableSkeleton />
        </main>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-5 py-4">
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-2.5 w-1/4" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Silhouette d'une page publique (vérification, espaces externes). */
export function CarteSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-label="Chargement">
      <Tricolor />
      <div className="h-14 bg-primary" />
      <div className="mx-auto mt-8 max-w-md space-y-4 rounded-xl border bg-card p-5">
        <Skeleton className="h-14 w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-20 w-16" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
