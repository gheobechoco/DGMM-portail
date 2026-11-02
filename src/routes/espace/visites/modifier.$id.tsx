import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, FileX } from "lucide-react";
import { toast } from "sonner";
import { RequirePerm } from "@/components/dgmm/Guard";
import { EmptyState, PageHeader } from "@/components/dgmm/Page";
import { VisiteForm } from "@/components/dgmm/VisiteForm";
import { can } from "@/lib/dgmm/rules";
import { saveVisite, useMarins, useVisites } from "@/lib/dgmm/store";

export const Route = createFileRoute("/espace/visites/modifier/$id")({
  head: () => ({ meta: [{ title: "Modifier la visite — GDM | DGMM" }] }),
  component: Modifier,
});

function Modifier() {
  const { id } = Route.useParams();
  const marins = useMarins();
  const visite = useVisites().find((v) => v.id === Number(id));
  const navigate = useNavigate();
  return (
    <RequirePerm perm="visites.saisir">
      {(session) =>
        !visite || visite.signee ? (
          <div className="rounded-xl border bg-card shadow-card">
            <EmptyState icon={FileX} title={visite ? "Certificat signé" : "Visite introuvable"}>
              {visite ? "Un certificat signé ne peut plus être modifié." : null}
            </EmptyState>
          </div>
        ) : (
          <>
            <Link
              to="/espace/visites/$id"
              params={{ id }}
              className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="size-4" /> Visite {visite.numero}
            </Link>
            <PageHeader eyebrow={`Visite ${visite.numero}`} title="Compléter la visite médicale" />
            <VisiteForm
              key={visite.id}
              initial={visite}
              marins={marins}
              canSign={can(session.role, "visites.signer")}
              brouillonCree={!visite.signee}
              signataire={session.nom}
              onCancel={() => navigate({ to: "/espace/visites/$id", params: { id } })}
              onSubmit={(v) => {
                const saved = saveVisite({ ...v, id: visite.id });
                toast.success(
                  saved.signee ? `Certificat ${saved.numero} signé` : "Brouillon mis à jour",
                );
                navigate({ to: "/espace/visites/$id", params: { id } });
              }}
            />
          </>
        )
      }
    </RequirePerm>
  );
}
