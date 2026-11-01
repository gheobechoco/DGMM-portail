import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ShieldAlert, ShieldX } from "lucide-react";
import { DgmmLogo } from "@/components/dgmm/Logo";
import { RepubliqueBlock, StatusPill, Tricolor } from "@/components/dgmm/Brand";
import {
  formatDate,
  fullName,
  lastCertificate,
  marinCertStatus,
  useMarins,
  useVisites,
} from "@/lib/dgmm/store";

export const Route = createFileRoute("/verifier/$nip")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Vérification d'un titre maritime — DGMM" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Verifier,
});

/** Page publique ouverte par le QR code du livret ou du certificat. */
function Verifier() {
  const { nip } = Route.useParams();
  const marins = useMarins();
  const visites = useVisites();
  const m = marins.find((x) => x.nip === nip);
  const st = m ? marinCertStatus(visites, m.id) : "aucun";
  const cert = m ? lastCertificate(visites, m.id) : undefined;
  const ok = !!m && m.validationAdmin === "validee" && (st === "valide" || st === "expire_bientot");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Tricolor />
      <header className="flex items-center justify-between bg-primary px-5 py-3 text-primary-foreground">
        <div className="flex items-center gap-3">
          <DgmmLogo className="size-9" />
          <span className="font-display text-sm font-semibold">DGMM · Vérification</span>
        </div>
        <RepubliqueBlock light className="hidden sm:block" />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-card">
          <div
            className={`flex items-center gap-3 px-5 py-4 ${!m ? "bg-destructive/10 text-destructive" : ok ? "bg-success/12 text-success" : "bg-warning/12 text-warning"}`}
          >
            {!m ? (
              <ShieldX className="size-7" />
            ) : ok ? (
              <CheckCircle2 className="size-7" />
            ) : (
              <ShieldAlert className="size-7" />
            )}
            <div>
              <div className="font-display font-bold">
                {!m
                  ? "Titre inconnu"
                  : ok
                    ? "Titre authentique et valide"
                    : "Titre authentique — non valide"}
              </div>
              <div className="text-xs opacity-80">NIP {nip}</div>
            </div>
          </div>
          {m ? (
            <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Titulaire</dt>
                <dd className="font-semibold text-primary">{fullName(m)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Fonction</dt>
                <dd>{m.profession}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Livret</dt>
                <dd className="font-mono">{m.livret || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Aptitude médicale</dt>
                <dd>
                  <StatusPill status={st} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Expire le</dt>
                <dd>{formatDate(cert?.stcw.validJusquau)}</dd>
              </div>
            </dl>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">
              Aucun marin ne correspond à ce numéro dans le registre de la DGMM.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
