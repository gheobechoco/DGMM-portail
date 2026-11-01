import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CarteSkeleton } from "@/components/dgmm/Skeletons";
import { CheckCircle2, ShieldAlert, ShieldX } from "lucide-react";
import { MarinPhoto } from "@/components/dgmm/MarinBits";
import { VerifyShell, validateLang, type Lang } from "@/components/dgmm/VerifyShell";
import { StatusPill } from "@/components/dgmm/Brand";
import {
  fullName,
  joursEmbarquement,
  lastCertificate,
  marinCertStatus,
  useMarins,
  useVisites,
} from "@/lib/dgmm/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/verifier/$nip")({
  ssr: false,
  pendingComponent: CarteSkeleton,
  validateSearch: validateLang,
  head: () => ({
    meta: [
      { title: "Vérification d'un titre maritime · Seafarer document verification — DGMM" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Verifier,
});

const T = {
  fr: {
    sous: "Vérification d'un livret maritime",
    inconnu: "Titre inconnu",
    inconnuD: "Aucun marin ne correspond à ce numéro dans le registre de la DGMM.",
    ok: "Titre authentique et valide",
    ko: "Titre authentique — aptitude non valide",
    titulaire: "Titulaire",
    fonction: "Fonction",
    livret: "Livret maritime",
    aptitude: "Aptitude médicale",
    expire: "Échéance",
    service: "Service en mer",
    jours: "jours",
    labels: { valide: "Valide", expire_bientot: "À renouveler", expire: "Expiré", aucun: "Aucun" },
  },
  en: {
    sous: "Seafarer's record book verification",
    inconnu: "Unknown document",
    inconnuD: "No seafarer matches this number in the DGMM register.",
    ok: "Authentic and valid document",
    ko: "Authentic document — medical fitness not valid",
    titulaire: "Holder",
    fonction: "Capacity",
    livret: "Record book No.",
    aptitude: "Medical fitness",
    expire: "Expiry date",
    service: "Sea service",
    jours: "days",
    labels: { valide: "Valid", expire_bientot: "Expires soon", expire: "Expired", aucun: "None" },
  },
};

/** Page publique ouverte par le QR code du livret maritime. */
function Verifier() {
  const { nip } = Route.useParams();
  const { lang = "fr" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const t = T[lang];
  const loc = lang === "fr" ? "fr-FR" : "en-GB";
  const fmt = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString(loc, { day: "2-digit", month: "long", year: "numeric" })
      : "—";
  const marins = useMarins();
  const visites = useVisites();
  const m = marins.find((x) => x.nip === nip);
  const st = m ? marinCertStatus(visites, m.id) : "aucun";
  const cert = m ? lastCertificate(visites, m.id) : undefined;
  const ok = !!m && m.validationAdmin === "validee" && (st === "valide" || st === "expire_bientot");
  const jours = (m?.embarquements ?? []).reduce((s, e) => s + joursEmbarquement(e), 0);
  const Icon = !m ? ShieldX : ok ? CheckCircle2 : ShieldAlert;

  return (
    <VerifyShell
      lang={lang}
      onLang={(l: Lang) =>
        navigate({ search: { lang: l === "en" ? "en" : undefined }, replace: true })
      }
      sousTitre={t.sous}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-card">
        <div
          role="status"
          className={cn(
            "flex items-center gap-3 px-5 py-4",
            !m
              ? "bg-destructive/10 text-destructive"
              : ok
                ? "bg-success/12 text-success"
                : "bg-warning/12 text-warning",
          )}
        >
          <Icon className="size-8 shrink-0" />
          <div>
            <div className="font-display font-bold">{!m ? t.inconnu : ok ? t.ok : t.ko}</div>
            <div className="text-xs opacity-80">NIP {nip}</div>
          </div>
        </div>
        {m ? (
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-4">
              <MarinPhoto m={m} className="h-20 w-[62px] shrink-0 rounded-lg text-lg" />
              <div>
                <div className="text-xs text-muted-foreground">{t.titulaire}</div>
                <div className="font-display text-lg font-bold text-primary">{fullName(m)}</div>
                <div className="text-sm text-muted-foreground">{m.nationalite}</div>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">{t.fonction}</dt>
                <dd>{m.profession}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t.livret}</dt>
                <dd className="font-mono">{m.livret || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t.aptitude}</dt>
                <dd>
                  <StatusPill status={st} label={t.labels[st]} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t.expire}</dt>
                <dd>{fmt(cert?.stcw.validJusquau)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">{t.service}</dt>
                <dd>
                  {jours} {t.jours}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="p-5 text-sm text-muted-foreground">{t.inconnuD}</p>
        )}
      </div>
    </VerifyShell>
  );
}
