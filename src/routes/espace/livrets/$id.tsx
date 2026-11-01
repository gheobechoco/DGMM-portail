import { Link, createFileRoute } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, BookX, Printer, User } from "lucide-react";
import { RequirePerm } from "@/components/dgmm/Guard";
import { EmptyState, Info } from "@/components/dgmm/Page";
import { OfficialHeader } from "@/components/dgmm/OfficialHeader";
import { Button } from "@/components/ui/button";
import { formatDate, lastCertificate, useMarins, useVisites } from "@/lib/dgmm/store";

export const Route = createFileRoute("/espace/livrets/$id")({
  head: () => ({ meta: [{ title: "Livret maritime — GDM | DGMM" }] }),
  component: () => <RequirePerm perm="marins">{() => <Livret />}</RequirePerm>,
});

function Livret() {
  const { id } = Route.useParams();
  const m = useMarins().find((x) => x.id === Number(id));
  const visites = useVisites();
  if (!m || !m.livret) {
    return (
      <div className="rounded-xl border bg-card shadow-card">
        <EmptyState icon={BookX} title="Livret non délivré" />
      </div>
    );
  }
  const cert = lastCertificate(visites, m.id);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/verifier/${encodeURIComponent(m.nip)}`
      : "";
  return (
    <>
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <Link
          to="/espace/marins/$id"
          params={{ id }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" /> Dossier du marin
        </Link>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer /> Imprimer
        </Button>
      </div>
      <article className="print-sheet mx-auto max-w-2xl overflow-hidden rounded-xl border bg-card shadow-card">
        <OfficialHeader
          title="Livret professionnel maritime"
          subtitle="Seafarer's identity and record book"
        />
        <div className="grid gap-6 p-6 sm:grid-cols-[140px_1fr]">
          <div className="flex flex-col items-center gap-3">
            <div className="grid aspect-[3/4] w-full place-items-center rounded-md border-2 border-dashed bg-muted text-muted-foreground">
              {m.documents.photo ? (
                <span className="px-2 text-center text-[10px]">{m.documents.photo}</span>
              ) : (
                <User className="size-10" />
              )}
            </div>
            {url && <QRCodeSVG value={url} size={120} fgColor="#0a192f" level="M" />}
            <span className="text-center text-[10px] text-muted-foreground">
              Scanner pour vérifier
            </span>
          </div>
          <div>
            <div className="mb-4 rounded-md bg-primary px-4 py-2 text-primary-foreground">
              <div className="text-[10px] uppercase tracking-widest text-gold">N° du livret</div>
              <div className="font-mono text-xl font-bold">{m.livret}</div>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <Info label="Nom">{m.nom}</Info>
              <Info label="Prénom(s)">{m.prenom}</Info>
              <Info label="Né(e) le">{formatDate(m.dateNaissance)}</Info>
              <Info label="Nationalité">{m.nationalite}</Info>
              <Info label="NIP">{m.nip}</Info>
              <Info label="Quartier d'inscription">{m.quartierInscription}</Info>
              <Info label="Fonction">{m.profession}</Info>
              <Info label="Taille">{m.taille ? `${m.taille} cm` : ""}</Info>
              <Info label="Yeux">{m.couleurYeux}</Info>
              <Info label="Cheveux">{m.couleurCheveux}</Info>
              <Info label="Signe particulier">{m.signeParticulier}</Info>
              <Info label="Aptitude médicale">
                {cert ? `jusqu'au ${formatDate(cert.stcw.validJusquau)}` : "—"}
              </Info>
            </dl>
          </div>
        </div>
        <div className="flex justify-between border-t px-6 py-3 text-[11px] text-muted-foreground">
          <span>Délivré par la Direction Générale de la Marine Marchande</span>
          <span>Le Directeur Général</span>
        </div>
      </article>
    </>
  );
}
