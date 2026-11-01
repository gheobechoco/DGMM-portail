import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpenCheck, FileText, Printer, Ship, Stethoscope } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/dgmm/Brand";
import {
  EtatCertificatPill,
  MarinPhoto,
  StatutStepper,
  VerdictPill,
} from "@/components/dgmm/MarinBits";
import { Info } from "@/components/dgmm/Page";
import { station as stationRef } from "@/lib/dgmm/maritime";
import { can } from "@/lib/dgmm/rules";
import type { Account } from "@/lib/dgmm/auth";
import {
  age,
  etatCertificat,
  formatDate,
  fullName,
  joursEmbarquement,
  lastCertificate,
  useMarins,
  useVisites,
} from "@/lib/dgmm/store";

/**
 * Fiche volante (slide-over) : inspection rapide du livret et du certificat
 * sans quitter la liste filtrée.
 */
export function MarinApercu({
  id,
  onClose,
  session,
}: {
  id: number | null;
  onClose: () => void;
  session: Account;
}) {
  const m = useMarins().find((x) => x.id === id);
  const visites = useVisites();
  const mv = m
    ? visites.filter((v) => v.marinId === m.id).sort((a, b) => b.creeLe.localeCompare(a.creeLe))
    : [];
  const cert = m ? lastCertificate(visites, m.id) : undefined;
  const derniere = mv[0];
  const mer = (m?.embarquements ?? []).reduce((s, e) => s + joursEmbarquement(e), 0);
  const aBord = m?.embarquements?.find((e) => !e.debarquement);
  const a = m ? age(m) : null;

  return (
    <Sheet open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg"
      >
        {m && (
          <>
            <div className="bg-navy-gradient px-5 pb-5 pt-6 text-primary-foreground">
              <div className="flex items-center gap-4 pr-6">
                <MarinPhoto
                  m={m}
                  className="h-20 w-[62px] shrink-0 rounded-lg border-2 border-gold text-lg"
                />
                <div className="min-w-0">
                  <SheetTitle className="font-display text-xl font-bold text-primary-foreground">
                    {fullName(m)}
                  </SheetTitle>
                  <SheetDescription className="text-sm text-primary-foreground/75">
                    {m.profession}
                    {a !== null && ` · ${a} ans`} · {m.nationalite}
                  </SheetDescription>
                  <p className="mt-1 font-mono text-xs text-gold">NIP {m.nip}</p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <StatutStepper m={m} examenRealise={mv.some((v) => v.signee)} />

              <section className="rounded-lg border p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                  <Stethoscope className="size-4" /> Certificat d'aptitude
                </h3>
                {cert ? (
                  <dl className="grid grid-cols-2 gap-3">
                    <Info label="N°">{cert.numero}</Info>
                    <Info label="État">
                      <EtatCertificatPill etat={etatCertificat(cert)} />
                    </Info>
                    <Info label="Verdict">
                      <VerdictPill verdict={cert.stcw.verdict} />
                    </Info>
                    <Info label="Échéance">{formatDate(cert.stcw.validJusquau)}</Info>
                    <Info label="Médecin">{cert.signataire}</Info>
                    {cert.stcw.details && <Info label="Restrictions">{cert.stcw.details}</Info>}
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun certificat valide
                    {derniere && !derniere.signee && " — une visite est en cours de saisie"}.
                  </p>
                )}
              </section>

              <section className="rounded-lg border p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                  <BookOpenCheck className="size-4" /> Livret maritime
                </h3>
                <dl className="grid grid-cols-2 gap-3">
                  <Info label="N° de livret">{m.livret || "Non délivré"}</Info>
                  <Info label="Visa DGMM">
                    <StatusPill status={m.validationAdmin} />
                  </Info>
                  <Info label="Service en mer">{`${mer} jours`}</Info>
                  <Info label="Situation">
                    {aBord ? (
                      <span className="inline-flex items-center gap-1">
                        <Ship className="size-3.5 text-secondary" /> À bord · {aBord.navire}
                      </span>
                    ) : (
                      "À terre"
                    )}
                  </Info>
                  <Info label="Armateur">{m.entreprise}</Info>
                  <Info label="Signature">{m.signature ? "Enregistrée" : "À recueillir"}</Info>
                  <Info label="Station">{stationRef(m.station)?.ville ?? ""}</Info>
                  <Info label="Téléphone">{m.tel1}</Info>
                </dl>
              </section>
            </div>

            <div className="mt-auto flex flex-wrap gap-2 border-t bg-muted/40 p-4">
              <Button asChild variant="gold" className="flex-1">
                <Link to="/espace/marins/$id" params={{ id: String(m.id) }}>
                  Ouvrir la fiche complète <ArrowRight />
                </Link>
              </Button>
              {cert && can(session.role, "visites") && (
                <Button asChild variant="outline">
                  <Link to="/espace/visites/$id" params={{ id: String(cert.id) }}>
                    <FileText /> Certificat
                  </Link>
                </Button>
              )}
              {m.livret && (
                <Button asChild variant="outline">
                  <Link to="/espace/livrets/$id" params={{ id: String(m.id) }}>
                    <Printer /> Livret
                  </Link>
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
