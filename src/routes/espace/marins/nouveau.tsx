import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { RequirePerm } from "@/components/dgmm/Guard";
import { MarinForm } from "@/components/dgmm/MarinForm";
import { PageHeader } from "@/components/dgmm/Page";
import { saveMarin } from "@/lib/dgmm/store";

export const Route = createFileRoute("/espace/marins/nouveau")({
  head: () => ({ meta: [{ title: "Enrôler un marin — GDM | DGMM" }] }),
  component: Nouveau,
});

function Nouveau() {
  const navigate = useNavigate();
  return (
    <RequirePerm perm="marins.creer">
      {(session) => (
        <>
          <Link
            to="/espace/marins"
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="size-4" /> Gens de mer
          </Link>
          <PageHeader
            eyebrow="Enrôlement"
            title="Nouveau marin"
            subtitle="Le dossier sera soumis à la validation administrative puis à la visite médicale d'aptitude."
          />
          <MarinForm
            submitLabel="Enregistrer le dossier"
            onCancel={() => navigate({ to: "/espace/marins" })}
            onSubmit={(v) => {
              const m = saveMarin(v, session.nom);
              toast.success(`Dossier ${m.nip} créé`, {
                description: `Identifiants du marin : ${m.login} / ${m.mdp}`,
                duration: 10000,
              });
              navigate({ to: "/espace/marins/$id", params: { id: String(m.id) } });
            }}
          />
        </>
      )}
    </RequirePerm>
  );
}
