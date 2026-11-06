import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { BookOpenCheck, BookX, Printer } from "lucide-react";
import { toast } from "sonner";
import { RequirePerm } from "@/components/dgmm/Guard";
import { EmptyState, PageHeader, Panel, StatCard } from "@/components/dgmm/Page";
import { SectionStatistiques } from "@/components/dgmm/Statistiques";
import { StatusPill } from "@/components/dgmm/Brand";
import { Button } from "@/components/ui/button";
import {
  delivrerLivret,
  eligibleLivret,
  fullName,
  manquants,
  marinCertStatus,
  useMarins,
  useVisites,
} from "@/lib/dgmm/store";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/espace/livrets/")({
  head: () => ({ meta: [{ title: "Livrets maritimes — GDM | DGMM" }] }),
  component: () => (
    <RequirePerm perm="livrets.delivrer">{(s) => <Livrets auteur={s.nom} />}</RequirePerm>
  ),
});

function Livrets({ auteur }: { auteur: string }) {
  const marins = useMarins();
  const visites = useVisites();
  const { aDelivrer, bloques, delivres } = useMemo(() => {
    const sans = marins.filter(
      (m) => !m.livret && m.validationAdmin === "validee" && m.validationMedicale === "validee",
    );
    return {
      aDelivrer: sans.filter((m) => eligibleLivret(m, visites)),
      bloques: sans.filter((m) => !eligibleLivret(m, visites)),
      delivres: marins.filter((m) => m.livret).sort((a, b) => a.livret.localeCompare(b.livret)),
    };
  }, [marins, visites]);

  return (
    <>
      <PageHeader
        eyebrow="Titres maritimes"
        title="Fascicules de marin"
        subtitle="Génération du fascicule (livret maritime) après validation du Directeur des Gens de Mer — sécurisé par QR code."
      />
      <SectionStatistiques
        titre="Statistiques des livrets"
        description="État des demandes prêtes, dossiers à compléter et livrets déjà délivrés."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Prêts à délivrer"
            value={aDelivrer.length}
            icon={BookOpenCheck}
            tone="success"
          />
          <StatCard
            label="Dossiers à compléter"
            value={bloques.length}
            icon={ClipboardList}
            tone="warning"
            hint="validés mais incomplets ou certificat expiré"
          />
          <StatCard label="Livrets délivrés" value={delivres.length} icon={BookOpenCheck} />
        </div>
      </SectionStatistiques>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Prêts à délivrer" bodyClassName="p-0">
          {aDelivrer.length === 0 ? (
            <EmptyState icon={BookOpenCheck} title="Aucun livret en attente" />
          ) : (
            <ul className="stagger divide-y">
              {aDelivrer.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/espace/marins/$id"
                      params={{ id: String(m.id) }}
                      className="block truncate text-sm font-semibold text-primary hover:underline"
                    >
                      {fullName(m)}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">
                      {m.profession} · {m.nip}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="gold"
                    onClick={() =>
                      toast.success(
                        `Livret ${delivrerLivret(m.id, auteur)} délivré à ${fullName(m)}`,
                      )
                    }
                  >
                    Délivrer
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Dossiers à compléter"
          description="Validés, mais une condition de délivrance manque."
          bodyClassName="p-0"
        >
          {bloques.length === 0 ? (
            <EmptyState icon={BookX} title="Aucun dossier bloqué" />
          ) : (
            <ul className="stagger divide-y">
              {bloques.map((m) => {
                const st = marinCertStatus(visites, m.id);
                const miss = manquants(m);
                return (
                  <li key={m.id}>
                    <Link
                      to="/espace/marins/$id"
                      params={{ id: String(m.id) }}
                      className="block px-5 py-3 hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-primary">
                          {fullName(m)}
                        </span>
                        {st !== "valide" && st !== "expire_bientot" && (
                          <StatusPill
                            status={st}
                            label={st === "aucun" ? "Sans certificat" : "Certificat expiré"}
                          />
                        )}
                      </div>
                      {miss.length > 0 && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          Manque : {miss.join(", ")}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Livrets délivrés" className="mt-6" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 font-semibold">N° livret</th>
                <th className="px-3 py-2.5 font-semibold">Titulaire</th>
                <th className="px-3 py-2.5 font-semibold">Fonction</th>
                <th className="px-3 py-2.5 font-semibold">Aptitude</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="stagger divide-y">
              {delivres.map((m) => (
                <tr key={m.id} className="hover:bg-muted/40">
                  <td className="px-5 py-2.5 font-mono text-xs font-semibold text-primary">
                    {m.livret}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      to="/espace/marins/$id"
                      params={{ id: String(m.id) }}
                      className="font-medium hover:underline"
                    >
                      {fullName(m)}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{m.profession}</td>
                  <td className="px-3 py-2.5">
                    <StatusPill status={marinCertStatus(visites, m.id)} />
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/espace/livrets/$id" params={{ id: String(m.id) }}>
                        <Printer /> Attestation
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
