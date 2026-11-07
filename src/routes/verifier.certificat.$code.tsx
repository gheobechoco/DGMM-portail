import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { CarteSkeleton } from "@/components/dgmm/Skeletons";
import { Ban, CheckCircle2, ShieldAlert, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { MarinPhoto } from "@/components/dgmm/MarinBits";
import { Aide } from "@/components/dgmm/Aide";
import { VerifyShell, validateLang, type Lang } from "@/components/dgmm/VerifyShell";
import { visaDgmm } from "@/components/dgmm/CertificatDocument";
import {
  codeValidation,
  etatCertificat,
  fullName,
  useMarins,
  useVisites,
  type Verdict,
} from "@/lib/dgmm/store";
import { cn } from "@/lib/utils";
import { enregistrerVerificationPublique } from "@/lib/dgmm/statistiques";

export const Route = createFileRoute("/verifier/certificat/$code")({
  ssr: false,
  pendingComponent: CarteSkeleton,
  validateSearch: validateLang,
  head: () => ({
    meta: [
      { title: "Vérification de certificat médical · Medical certificate verification — DGMM" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifierCertificat,
});

const T = {
  fr: {
    sous: "Vérification d'un certificat médical d'aptitude (STCW I/9)",
    inconnu: "Certificat inconnu",
    inconnuD:
      "Ce code ne correspond à aucun certificat délivré. Document potentiellement falsifié.",
    revoque: "Certificat RÉVOQUÉ",
    expire: "Certificat EXPIRÉ",
    expireD: (d: string) => `Expiré depuis le ${d}`,
    inapte: "Marin déclaré INAPTE",
    valide: "Certificat VALIDE",
    valideD: (d: string) => `Valable jusqu'au ${d}`,
    bientot: (d: string) => `Valable jusqu'au ${d} (expire bientôt)`,
    titulaire: "Titulaire",
    ne: "né(e) le",
    numero: "N° de certificat",
    nip: "NIP",
    verdict: "Décision",
    delivre: "Délivré le",
    restrictions: "Restrictions",
    medecin: "Médecin signataire",
    visa: "Visa DGMM",
    visaAttente: "En attente",
    verifie: (d: string) => `Vérifié le ${d} dans le registre de la DGMM.`,
    verdicts: {
      apte: "Apte sans restriction",
      apte_restrictions: "Apte avec restrictions",
      inapte_temporaire: "Inapte temporaire",
      inapte: "Inapte définitif",
      "": "—",
    } as Record<Verdict, string>,
  },
  en: {
    sous: "Verification of a medical fitness certificate (STCW I/9)",
    inconnu: "Unknown certificate",
    inconnuD: "This code does not match any issued certificate. The document may be forged.",
    revoque: "Certificate REVOKED",
    expire: "Certificate EXPIRED",
    expireD: (d: string) => `Expired since ${d}`,
    inapte: "Seafarer declared UNFIT",
    valide: "Certificate VALID",
    valideD: (d: string) => `Valid until ${d}`,
    bientot: (d: string) => `Valid until ${d} (expires soon)`,
    titulaire: "Holder",
    ne: "born",
    numero: "Certificate No.",
    nip: "Seafarer ID (NIP)",
    verdict: "Decision",
    delivre: "Issued on",
    restrictions: "Limitations",
    medecin: "Signing medical practitioner",
    visa: "DGMM endorsement",
    visaAttente: "Pending",
    verifie: (d: string) => `Checked on ${d} against the DGMM register.`,
    verdicts: {
      apte: "Fit without restriction",
      apte_restrictions: "Fit with limitations",
      inapte_temporaire: "Temporarily unfit",
      inapte: "Permanently unfit",
      "": "—",
    } as Record<Verdict, string>,
  },
};

/**
 * Page publique ouverte par le QR code du certificat, accessible sans compte :
 * contrôle par l'État du port (PSC), armateurs, inspecteurs. Bilingue français / anglais (OMI).
 */
function VerifierCertificat() {
  const { code } = Route.useParams();
  const { lang = "fr", source } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const t = T[lang];
  const loc = lang === "fr" ? "fr-FR" : "en-GB";
  const fmt = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString(loc, { day: "2-digit", month: "long", year: "numeric" })
      : "—";
  const marins = useMarins();
  const visites = useVisites();
  const v = visites.find((x) => {
    const m = marins.find((y) => y.id === x.marinId);
    return x.signee && m && codeValidation(x, m.nip) === code;
  });
  const m = marins.find((x) => x.id === v?.marinId);
  const etat = v ? etatCertificat(v) : null;
  const visa = visaDgmm(m);
  const conforme =
    !!v && (etat === "valide" || etat === "expire_bientot") && v.signee && !v.revoquee;
  const logKey = useRef("");
  useEffect(() => {
    const key = `${code}:${source ?? "manual"}`;
    if (logKey.current === key) return;
    logKey.current = key;
    try {
      enregistrerVerificationPublique(
        source === "qr" ? "qr" : "certificat",
        conforme ? "conforme" : "anomalie",
      );
    } catch (error) {
      toast.error("Statistique PSC non enregistrée", {
        description: error instanceof Error ? error.message : "Le compteur local est indisponible.",
      });
    }
  }, [code, conforme, source]);

  const banner =
    !v || !etat
      ? { cls: "bg-destructive/10 text-destructive", icon: ShieldX, t: t.inconnu, d: t.inconnuD }
      : etat === "revoque"
        ? {
            cls: "bg-destructive/10 text-destructive",
            icon: Ban,
            t: t.revoque,
            d: v.motifRevocation ?? "",
          }
        : etat === "expire"
          ? {
              cls: "bg-destructive/10 text-destructive",
              icon: ShieldAlert,
              t: t.expire,
              d: t.expireD(fmt(v.stcw.validJusquau)),
            }
          : etat === "inapte"
            ? {
                cls: "bg-destructive/10 text-destructive",
                icon: ShieldAlert,
                t: t.inapte,
                d: t.verdicts[v.stcw.verdict],
              }
            : {
                cls: "bg-success/12 text-success",
                icon: CheckCircle2,
                t: t.valide,
                d:
                  etat === "expire_bientot"
                    ? t.bientot(fmt(v.stcw.validJusquau))
                    : t.valideD(fmt(v.stcw.validJusquau)),
              };
  const Icon = banner.icon;

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
        <div className={cn("flex items-center gap-3 px-5 py-5", banner.cls)} role="status">
          <Icon className="size-9 shrink-0" />
          <div>
            <div className="font-display text-lg font-bold">{banner.t}</div>
            {banner.d && <div className="text-sm opacity-90">{banner.d}</div>}
          </div>
        </div>
        {v && m && (
          <div className="space-y-5 p-5">
            <div className="flex items-center gap-4">
              <MarinPhoto m={m} className="h-24 w-[75px] shrink-0 rounded-lg text-xl" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{t.titulaire}</div>
                <div className="font-display text-lg font-bold text-primary">{fullName(m)}</div>
                <div className="text-sm text-muted-foreground">
                  {m.profession} · {t.ne} {fmt(m.dateNaissance)}
                </div>
                <div className="text-sm text-muted-foreground">{m.nationalite}</div>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">{t.numero}</dt>
                <dd className="font-mono">{v.numero}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t.nip}</dt>
                <dd className="font-mono">{m.nip}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t.verdict}</dt>
                <dd className="font-semibold">{t.verdicts[v.stcw.verdict]}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t.delivre}</dt>
                <dd>{fmt(v.stcw.dateDelivrance || v.traiteLe)}</dd>
              </div>
              {v.stcw.verdict === "apte_restrictions" && v.stcw.details && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">{t.restrictions}</dt>
                  <dd>{v.stcw.details}</dd>
                </div>
              )}
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">{t.medecin}</dt>
                <dd className="font-semibold text-primary">
                  {v.signataire} · Polyclinique EDELWEISS
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">{t.visa}</dt>
                <dd>{visa ? `${visa.auteur} · ${fmt(visa.date)}` : t.visaAttente}</dd>
              </div>
            </dl>
            <p className="border-t pt-3 text-[11px] text-muted-foreground">
              {t.verifie(new Date().toLocaleString(loc))}
            </p>
            <p className="-mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
              {lang === "fr"
                ? "Contrôle par l'État du port — MoU d'Abuja"
                : "Port State Control — Abuja MoU"}
              {lang === "fr" && <Aide terme="abuja" />}
            </p>
          </div>
        )}
      </div>
    </VerifyShell>
  );
}
