import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { RequirePerm } from "@/components/dgmm/Guard";
import { PageHeader } from "@/components/dgmm/Page";
import { VisiteForm, emptyVisite } from "@/components/dgmm/VisiteForm";
import { can } from "@/lib/dgmm/rules";
import { saveVisite, useMarins } from "@/lib/dgmm/store";
import { lienMedecin } from "@/lib/dgmm/medecins";

export const Route = createFileRoute("/espace/visites/nouvelle")({
  validateSearch: (s: Record<string, unknown>): { marin?: number | undefined } => ({
    marin: Number(s["marin"]) || undefined,
  }),
  head: () => ({ meta: [{ title: "Nouvelle visite médicale — GDM | DGMM" }] }),
  component: Nouvelle,
});

function Nouvelle() {
  const { marin } = Route.useSearch();
  const marins = useMarins();
  const navigate = useNavigate();
  return (
    <RequirePerm perm="visites.saisir">
      {(session) => (
        <>
          <Link
            to="/espace/visites"
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="size-4" /> Visites médicales
          </Link>
          <PageHeader eyebrow="Aptitude médicale" title="Nouvelle visite médicale" />
          <VisiteForm
            initial={emptyVisite(marin ?? 0, session.nom)}
            marins={marins}
            canSign={can(session.role, "visites.signer")}
            signataire={session.nom}
            onCancel={() => navigate({ to: "/espace/visites" })}
            onSubmit={(v) => {
              const saved = saveVisite({ ...v, ...lienMedecin(v.praticien), signee: false });
              toast.success(`Brouillon ${saved.numero} enregistré`, {
                description: can(session.role, "visites.signer")
                  ? "Vérifiez la saisie, puis signez le certificat pour terminer la visite."
                  : "Le médecin agréé pourra le signer.",
              });
              navigate(
                can(session.role, "visites.signer")
                  ? { to: "/espace/visites/modifier/$id", params: { id: String(saved.id) } }
                  : { to: "/espace/visites/$id", params: { id: String(saved.id) } },
              );
            }}
          />
        </>
      )}
    </RequirePerm>
  );
}
