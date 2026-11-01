import { createFileRoute } from "@tanstack/react-router";
import { Ban, CheckCircle2, ShieldAlert, ShieldX } from "lucide-react";
import { DgmmLogo } from "@/components/dgmm/Logo";
import { RepubliqueBlock, Tricolor } from "@/components/dgmm/Brand";
import { MarinPhoto } from "@/components/dgmm/MarinBits";
import {
  VERDICT_LABELS,
  codeValidation,
  etatCertificat,
  formatDate,
  fullName,
  useMarins,
  useVisites,
} from "@/lib/dgmm/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/verifier/certificat/$code")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Vérification d'un certificat médical — DGMM" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifierCertificat,
});

/**
 * Page publique ouverte par le QR code du certificat : contrôle par l'État du port,
 * armateurs, inspecteurs. Affiche Valide / Expiré / Révoqué, le titulaire et le médecin signataire.
 */
function VerifierCertificat() {
  const { code } = Route.useParams();
  const marins = useMarins();
  const visites = useVisites();
  const v = visites.find((x) => {
    const m = marins.find((y) => y.id === x.marinId);
    return x.signee && m && codeValidation(x, m.nip) === code;
  });
  const m = marins.find((x) => x.id === v?.marinId);
  const etat = v ? etatCertificat(v) : null;

  const banner =
    !v || !etat
      ? {
          cls: "bg-destructive/10 text-destructive",
          icon: ShieldX,
          t: "Certificat inconnu",
          d: "Ce code ne correspond à aucun certificat délivré. Document potentiellement falsifié.",
        }
      : etat === "revoque"
        ? {
            cls: "bg-destructive/10 text-destructive",
            icon: Ban,
            t: "Certificat RÉVOQUÉ",
            d: v.motifRevocation ?? "",
          }
        : etat === "expire"
          ? {
              cls: "bg-destructive/10 text-destructive",
              icon: ShieldAlert,
              t: "Certificat EXPIRÉ",
              d: `Expiré depuis le ${formatDate(v.stcw.validJusquau)}`,
            }
          : etat === "inapte"
            ? {
                cls: "bg-destructive/10 text-destructive",
                icon: ShieldAlert,
                t: "Marin déclaré INAPTE",
                d: VERDICT_LABELS[v.stcw.verdict],
              }
            : {
                cls: "bg-success/12 text-success",
                icon: CheckCircle2,
                t: "Certificat VALIDE",
                d:
                  etat === "expire_bientot"
                    ? `Expire bientôt : ${formatDate(v.stcw.validJusquau)}`
                    : `Valable jusqu'au ${formatDate(v.stcw.validJusquau)}`,
              };
  const Icon = banner.icon;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Tricolor />
      <header className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground sm:px-5">
        <div className="flex items-center gap-3">
          <DgmmLogo className="size-9" />
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold">DGMM · Contrôle</div>
            <div className="text-[11px] text-primary-foreground/70">
              Vérification d'un certificat d'aptitude
            </div>
          </div>
        </div>
        <RepubliqueBlock light className="hidden sm:block" />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8">
        <div className="w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-card">
          <div className={cn("flex items-center gap-3 px-5 py-5", banner.cls)}>
            <Icon className="size-9 shrink-0" />
            <div>
              <div className="font-display text-lg font-bold">{banner.t}</div>
              {banner.d && <div className="text-sm opacity-90">{banner.d}</div>}
            </div>
          </div>
          {v && m && (
            <div className="space-y-5 p-5">
              <div className="flex items-center gap-4">
                <MarinPhoto m={m} className="size-20 shrink-0 rounded-lg text-xl" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Titulaire</div>
                  <div className="font-display text-lg font-bold text-primary">{fullName(m)}</div>
                  <div className="text-sm text-muted-foreground">
                    {m.profession} · né(e) le {formatDate(m.dateNaissance)}
                  </div>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">N° de certificat</dt>
                  <dd className="font-mono">{v.numero}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">NIP</dt>
                  <dd className="font-mono">{m.nip}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Verdict</dt>
                  <dd className="font-semibold">{VERDICT_LABELS[v.stcw.verdict]}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Délivré le</dt>
                  <dd>{formatDate(v.stcw.dateDelivrance || v.traiteLe)}</dd>
                </div>
                {v.stcw.verdict === "apte_restrictions" && v.stcw.details && (
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Restrictions</dt>
                    <dd>{v.stcw.details}</dd>
                  </div>
                )}
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Médecin signataire</dt>
                  <dd className="font-semibold text-primary">{v.signataire}</dd>
                </div>
              </dl>
              <p className="border-t pt-3 text-[11px] text-muted-foreground">
                Vérifié le {new Date().toLocaleString("fr-FR")} · registre de la Direction Générale
                de la Marine Marchande.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
