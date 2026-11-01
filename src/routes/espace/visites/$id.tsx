import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Ban, ExternalLink, FileX, PenLine } from "lucide-react";
import { toast } from "sonner";
import { RequirePerm } from "@/components/dgmm/Guard";
import { EmptyState, textareaClass } from "@/components/dgmm/Page";
import { EtatCertificatPill } from "@/components/dgmm/MarinBits";
import { CertificatDocument } from "@/components/dgmm/CertificatDocument";
import { ExportButton } from "@/components/dgmm/Anim";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/dgmm/rules";
import type { Account } from "@/lib/dgmm/auth";
import {
  codeValidation,
  etatCertificat,
  revoquerCertificat,
  useMarins,
  useVisites,
} from "@/lib/dgmm/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/espace/visites/$id")({
  head: () => ({ meta: [{ title: "Certificat médical — GDM | DGMM" }] }),
  component: () => <RequirePerm perm="marins">{(s) => <Certificat session={s} />}</RequirePerm>,
});

function Certificat({ session }: { session: Account }) {
  const { id } = Route.useParams();
  const v = useVisites().find((x) => x.id === Number(id));
  const m = useMarins().find((x) => x.id === v?.marinId);
  const [revoque, setRevoque] = useState(false);
  const [motif, setMotif] = useState("");
  if (!v) {
    return (
      <div className="rounded-xl border bg-card shadow-card">
        <EmptyState icon={FileX} title="Visite introuvable" />
      </div>
    );
  }
  const etat = etatCertificat(v);
  const code = m ? codeValidation(v, m.nip) : "";
  const verifyPath = `/verifier/certificat/${encodeURIComponent(code)}`;
  const canPrint = can(session.role, "certificats.imprimer") && v.signee;

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/espace/visites"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" /> Visites médicales
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <EtatCertificatPill etat={etat} />
          {!v.signee && can(session.role, "visites.saisir") && (
            <Button asChild size="sm" variant="gold">
              <Link to="/espace/visites/modifier/$id" params={{ id }}>
                <PenLine />{" "}
                {can(session.role, "visites.signer") ? "Compléter / signer" : "Compléter"}
              </Link>
            </Button>
          )}
          {v.signee && !v.revoquee && can(session.role, "visites.signer") && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setRevoque((r) => !r)}
            >
              <Ban /> Révoquer
            </Button>
          )}
          {v.signee && (
            <Button asChild size="sm" variant="ghost">
              <a href={verifyPath} target="_blank" rel="noreferrer">
                <ExternalLink /> Page de vérification
              </a>
            </Button>
          )}
          {canPrint && (
            <ExportButton
              size="sm"
              variant="outline"
              onExport={() => window.print()}
              doneLabel="Certificat prêt"
            >
              Exporter le certificat
            </ExportButton>
          )}
        </div>
      </div>

      {revoque && (
        <div className="no-print mx-auto mb-4 max-w-3xl rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <label htmlFor="motif" className="text-sm font-semibold text-destructive">
            Motif de la révocation
          </label>
          <textarea
            id="motif"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            className={cn(textareaClass, "mt-1 min-h-16")}
            placeholder="Ex. erreur d'identité, aggravation de l'état de santé…"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setRevoque(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!motif.trim()}
              onClick={() => {
                revoquerCertificat(v.id, motif.trim(), session.nom);
                setRevoque(false);
                toast.error(`Certificat ${v.numero} révoqué`, {
                  description: "La vérification par QR code l'indique désormais.",
                });
              }}
            >
              Confirmer la révocation
            </Button>
          </div>
        </div>
      )}

      <CertificatDocument v={v} m={m} />
    </>
  );
}
