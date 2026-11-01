import { Link, createFileRoute } from "@tanstack/react-router";
import { CarteSkeleton } from "@/components/dgmm/Skeletons";
import { ArrowLeft, Download, FileX } from "lucide-react";
import { PublicShell } from "@/components/dgmm/PublicShell";
import { EmptyState } from "@/components/dgmm/Page";
import { CertificatDocument } from "@/components/dgmm/CertificatDocument";
import { Button } from "@/components/ui/button";
import { marinSession } from "@/lib/dgmm/auth";
import { useMarins, useVisites } from "@/lib/dgmm/store";

export const Route = createFileRoute("/mon-espace/certificat/$id")({
  ssr: false,
  pendingComponent: CarteSkeleton,
  head: () => ({ meta: [{ title: "Mon certificat d'aptitude — Espace Marin DGMM" }] }),
  component: MonCertificat,
});

/** Certificat du marin connecté, à enregistrer en PDF via l'impression du navigateur. */
function MonCertificat() {
  const { id } = Route.useParams();
  const session = marinSession.use();
  const m = useMarins().find((x) => String(x.id) === session);
  const v = useVisites().find((x) => x.id === Number(id) && x.marinId === m?.id && x.signee);
  return (
    <PublicShell titre="Espace Marin" onLogout={m ? () => marinSession.write(null) : undefined}>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/mon-espace"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" /> Mon espace
        </Link>
        {v && (
          <Button variant="gold" onClick={() => window.print()}>
            <Download /> Télécharger en PDF
          </Button>
        )}
      </div>
      {v ? (
        <>
          <p className="no-print mx-auto mb-4 max-w-3xl text-xs text-muted-foreground">
            Dans la fenêtre d'impression, choisissez « Enregistrer au format PDF ». Le document est
            au format A4 officiel.
          </p>
          <CertificatDocument v={v} m={m} />
        </>
      ) : (
        <div className="rounded-xl border bg-card shadow-card">
          <EmptyState icon={FileX} title="Certificat indisponible">
            Connectez-vous à votre espace pour accéder à vos certificats.
          </EmptyState>
        </div>
      )}
    </PublicShell>
  );
}
