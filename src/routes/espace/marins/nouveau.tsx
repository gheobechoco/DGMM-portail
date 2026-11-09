import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { RequirePerm } from "@/components/dgmm/Guard";
import { MarinForm } from "@/components/dgmm/MarinForm";
import { PageHeader } from "@/components/dgmm/Page";
import { journaliser, saveMarin } from "@/lib/dgmm/store";
import { getInscriptions, traiterPreInscription } from "@/lib/dgmm/inscriptions";

export const Route = createFileRoute("/espace/marins/nouveau")({
  head: () => ({ meta: [{ title: "Enrôler un marin — GDM | DGMM" }] }),
  validateSearch: (s: Record<string, unknown>): { demande?: number | undefined } => ({
    demande: Number(s["demande"]) || undefined,
  }),
  component: Nouveau,
});

function Nouveau() {
  const navigate = useNavigate();
  const { demande } = Route.useSearch();
  const pre = demande ? getInscriptions().pre.find((p) => p.id === demande) : undefined;
  return (
    <RequirePerm perm="marins.enroler">
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
            subtitle="Le marin passe la visite médicale d'aptitude, puis l'agent contrôle ses pièces avant le visa administratif."
          />
          {pre && (
            <p className="mb-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm">
              Formulaire pré-rempli depuis la pré-inscription{" "}
              <strong className="font-mono">{pre.numero}</strong>. Vérifiez chaque information avec
              les pièces originales.
            </p>
          )}
          <MarinForm
            preRempli={
              pre
                ? {
                    nom: pre.nom,
                    prenom: pre.prenom,
                    sexe: pre.sexe as "" | "M" | "F",
                    dateNaissance: pre.dateNaissance,
                    nationalite: pre.nationalite,
                    tel1: pre.tel,
                    email: pre.email,
                    profession: pre.profession,
                    station: pre.station,
                    entreprise: pre.entreprise,
                    documents: pre.documents ?? {},
                    piecesEnLigne: (
                      [
                        "piece",
                        "photo",
                        "photoSupplementaire",
                        "naissance",
                        "casier",
                        "stcw",
                      ] as const
                    ).filter((piece) => !!pre.documents?.[piece]),
                  }
                : undefined
            }
            submitLabel="Enregistrer le dossier"
            onCancel={() => navigate({ to: "/espace/marins" })}
            onSubmit={(v) => {
              try {
                const m = saveMarin(v, session.nom);
                if (pre) {
                  traiterPreInscription(pre.id, {
                    statut: "convertie",
                    marinId: m.id,
                    traitePar: session.nom,
                  });
                  journaliser(
                    session.nom,
                    `Pré-inscription ${pre.numero} convertie en dossier`,
                    `${m.nom} ${m.prenom} (${m.nip})`,
                  );
                }
                toast.success(`Dossier ${m.nip} créé`, {
                  description: `Accès Espace Marin à remettre : NIP ${m.nip} · mot de passe ${m.mdp} (visible ensuite sur la fiche)`,
                  duration: 10000,
                });
                navigate({ to: "/espace/marins/$id", params: { id: String(m.id) } });
              } catch (error) {
                toast.error("Dossier non enregistré", {
                  description:
                    error instanceof Error ? error.message : "Le stockage local est indisponible.",
                });
              }
            }}
          />
        </>
      )}
    </RequirePerm>
  );
}
