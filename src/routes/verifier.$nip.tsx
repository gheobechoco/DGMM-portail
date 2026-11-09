import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { CarteSkeleton } from "@/components/dgmm/Skeletons";
import { CheckCircle2, ShieldAlert, ShieldX } from "lucide-react";
import { toast } from "sonner";
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
import { enregistrerVerificationPublique } from "@/lib/dgmm/statistiques";
import { decoderJeton } from "@/lib/dgmm/jetonQr";
import type { CertStatus } from "@/lib/dgmm/rules";

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
    depuisQr: "Données lues dans le QR code du livret : sceau d'intégrité intact (document non modifié).",
    altere: "QR code MODIFIÉ",
    altereD: "Les données de ce QR code ne correspondent pas à leur sceau : document suspect.",
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
    depuisQr: "Data read from the record book QR code: integrity seal intact (not altered).",
    altere: "QR code ALTERED",
    altereD: "The data in this QR code does not match its seal: suspicious document.",
  },
};

/** Page publique ouverte par le QR code du livret maritime. */
function Verifier() {
  const { nip } = Route.useParams();
  const { lang = "fr", source, d } = Route.useSearch();
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
  // Livret absent de ce poste : on lit les données scellées transportées par le QR code.
  const lu = !m ? decoderJeton(d) : null;
  const jt = lu && lu.jeton.t === "l" && lu.intact ? lu.jeton : null;
  const altere = !m && !!d && !jt;
  const statutDe = (fin?: string): CertStatus => {
    if (!fin) return "aucun";
    const reste = new Date(`${fin}T23:59:59`).getTime() - Date.now();
    return reste < 0 ? "expire" : reste <= 30 * 86_400_000 ? "expire_bientot" : "valide";
  };
  const st = m ? marinCertStatus(visites, m.id) : statutDe(jt?.fin);
  const cert = m ? lastCertificate(visites, m.id) : undefined;
  const connu = !!m || !!jt;
  const ok = connu && (m ? m.validationAdmin === "validee" : !!jt?.ok) && (st === "valide" || st === "expire_bientot");
  const jours = m
    ? (m.embarquements ?? []).reduce((s, e) => s + (e.statut === "valide_dgmm" ? joursEmbarquement(e) : 0), 0)
    : jt?.mer ?? 0;
  const doc = m
    ? { nom: fullName(m), nat: m.nationalite, fct: m.profession, liv: m.livret, fin: cert?.stcw.validJusquau }
    : jt
      ? { nom: jt.nom, nat: jt.nat ?? "", fct: jt.fct ?? "", liv: jt.liv, fin: jt.fin }
      : null;
  const Icon = !connu ? ShieldX : ok ? CheckCircle2 : ShieldAlert;
  const logKey = useRef("");
  useEffect(() => {
    const key = `${nip}:${source ?? "manual"}`;
    if (logKey.current === key) return;
    logKey.current = key;
    try {
      enregistrerVerificationPublique(source === "qr" ? "qr" : "nip", ok ? "conforme" : "anomalie");
    } catch (error) {
      toast.error("Statistique PSC non enregistrée", {
        description: error instanceof Error ? error.message : "Le compteur local est indisponible.",
      });
    }
  }, [nip, ok, source]);

  return (
    <VerifyShell
      lang={lang}
      onLang={(l: Lang) =>
        navigate({
          search: (previous) => ({ ...previous, lang: l === "en" ? "en" : undefined }),
          replace: true,
        })
      }
      sousTitre={t.sous}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-card">
        <div
          role="status"
          className={cn(
            "flex items-center gap-3 px-5 py-4",
            !connu
              ? "bg-destructive/10 text-destructive"
              : ok
                ? "bg-success/12 text-success"
                : st === "expire" || st === "aucun"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-warning/12 text-warning",
          )}
        >
          <Icon className="size-8 shrink-0" />
          <div>
            <div className="font-display font-bold">{altere ? t.altere : !connu ? t.inconnu : ok ? t.ok : t.ko}</div>
            <div className="text-xs opacity-80">NIP {nip}</div>
          </div>
        </div>
        {doc ? (
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-4">
              {m ? (
                <MarinPhoto m={m} className="h-20 w-[62px] shrink-0 rounded-lg text-lg" />
              ) : (
                <div className="grid h-20 w-[62px] shrink-0 place-items-center rounded-lg bg-primary-soft font-display text-lg font-bold text-primary">
                  {doc.nom.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground">{t.titulaire}</div>
                <div className="font-display text-lg font-bold text-primary">{doc.nom}</div>
                <div className="text-sm text-muted-foreground">{doc.nat}</div>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">{t.fonction}</dt>
                <dd>{doc.fct}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t.livret}</dt>
                <dd className="font-mono">{doc.liv || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t.aptitude}</dt>
                <dd>
                  <StatusPill status={st} label={t.labels[st]} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t.expire}</dt>
                <dd>{fmt(doc.fin)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">{t.service}</dt>
                <dd>
                  {jours} {t.jours}
                </dd>
              </div>
            </dl>
            {!m && <p className="border-t pt-3 text-[11px] text-muted-foreground">{t.depuisQr}</p>}
          </div>
        ) : (
          <p className="p-5 text-sm text-muted-foreground">{altere ? t.altereD : t.inconnuD}</p>
        )}
      </div>
    </VerifyShell>
  );
}
