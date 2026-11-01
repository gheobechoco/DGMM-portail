import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, UserX } from "lucide-react";
import { toast } from "sonner";
import { RequirePerm } from "@/components/dgmm/Guard";
import { MarinForm } from "@/components/dgmm/MarinForm";
import { EmptyState, PageHeader } from "@/components/dgmm/Page";
import { fullName, saveMarin, useMarins } from "@/lib/dgmm/store";

export const Route = createFileRoute("/espace/marins/modifier/$id")({
  head: () => ({ meta: [{ title: "Modifier un dossier — GDM | DGMM" }] }),
  component: Modifier,
});

function Modifier() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const marin = useMarins().find((m) => m.id === Number(id));
  return (
    <RequirePerm perm="marins.creer">
      {(session) =>
        !marin ? (
          <EmptyState icon={UserX} title="Dossier introuvable" />
        ) : (
          <>
            <Link
              to="/espace/marins/$id"
              params={{ id }}
              className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="size-4" /> {fullName(marin)}
            </Link>
            <PageHeader eyebrow={`NIP ${marin.nip}`} title="Modifier le dossier" />
            <MarinForm
              key={marin.id}
              initial={marin}
              submitLabel="Enregistrer les modifications"
              onCancel={() => navigate({ to: "/espace/marins/$id", params: { id } })}
              onSubmit={(v) => {
                saveMarin({ ...v, id: marin.id }, session.nom);
                toast.success("Dossier mis à jour");
                navigate({ to: "/espace/marins/$id", params: { id } });
              }}
            />
          </>
        )
      }
    </RequirePerm>
  );
}
