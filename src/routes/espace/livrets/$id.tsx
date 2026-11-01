import { Link, createFileRoute } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, BookX, Check, Printer } from "lucide-react";
import { RequirePerm } from "@/components/dgmm/Guard";
import { EmptyState, Info } from "@/components/dgmm/Page";
import { OfficialHeader } from "@/components/dgmm/OfficialHeader";
import { MarinPhoto } from "@/components/dgmm/MarinBits";
import { Button } from "@/components/ui/button";
import { formatDate, lastCertificate, useMarins, useVisites } from "@/lib/dgmm/store";

export const Route = createFileRoute("/espace/livrets/$id")({
  head: () => ({ meta: [{ title: "Attestation de délivrance du livret — GDM | DGMM" }] }),
  component: () => <RequirePerm perm="marins">{() => <Attestation />}</RequirePerm>,
});

function Attestation() {
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
  const evt = m.historique?.find((e) => e.type === "livret");
  const dateDeliv = evt?.date ?? m.modifieLe;
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
          <ArrowLeft className="size-4" /> Fiche du marin
        </Link>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer /> Imprimer
        </Button>
      </div>
      <article className="print-sheet mx-auto max-w-2xl overflow-hidden rounded-xl border bg-card shadow-card">
        <OfficialHeader
          title="Attestation de délivrance du livret maritime"
          subtitle="Livret professionnel maritime — Seafarer's identity and record book"
        />
        <div className="grid gap-6 p-6 sm:grid-cols-[140px_1fr]">
          <div className="flex flex-col items-center gap-3">
            <MarinPhoto m={m} className="aspect-[3/4] w-full rounded-md border text-2xl" />
            {url && <QRCodeSVG value={url} size={120} fgColor="#0a192f" level="M" />}
            <span className="text-center text-[10px] text-muted-foreground">
              Scanner pour vérifier
            </span>
          </div>
          <div>
            <div className="mb-4 rounded-md bg-primary px-4 py-2 text-primary-foreground">
              <div className="text-[10px] uppercase tracking-widest text-gold">
                N° du livret maritime
              </div>
              <div className="font-mono text-xl font-bold">{m.livret}</div>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <Info label="Nom">{m.nom}</Info>
              <Info label="Prénom(s)">{m.prenom}</Info>
              <Info label="Né(e) le">{formatDate(m.dateNaissance)}</Info>
              <Info label="Nationalité">{m.nationalite}</Info>
              <Info label="NIP">{m.nip}</Info>
              <Info label="Quartier d'inscription">{m.quartierInscription}</Info>
              <Info label="Profession">{m.profession}</Info>
              <Info label="Taille">{m.taille ? `${m.taille} cm` : ""}</Info>
              <Info label="Yeux / cheveux">
                {[m.couleurYeux, m.couleurCheveux].filter(Boolean).join(" / ")}
              </Info>
              <Info label="Signes particuliers">{m.signeParticulier}</Info>
            </dl>
            <div className="mt-5 rounded-md border bg-muted/40 p-3 text-xs">
              <div className="mb-1.5 font-semibold uppercase tracking-wider text-secondary">
                Validations
              </div>
              <ul className="space-y-1">
                <li className="flex items-center gap-1.5">
                  <Check className="size-3 text-secondary" /> Validation administrative DGMM
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="size-3 text-secondary" /> Aptitude médicale STCW
                  {cert &&
                    ` — certificat ${cert.numero}, valable jusqu'au ${formatDate(cert.stcw.validJusquau)} (${cert.signataire})`}
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t px-6 py-4 text-xs text-muted-foreground">
          <span>Délivré à Libreville le {formatDate(dateDeliv)}</span>
          <span className="text-right">
            Pour le Directeur Général de la Marine Marchande
            <br />
            <span className="font-semibold text-primary">
              {evt?.auteur ?? "Le Gestionnaire MM"}
            </span>
          </span>
        </div>
      </article>
    </>
  );
}
