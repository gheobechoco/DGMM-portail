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
import { decoderJeton } from "@/lib/dgmm/jetonQr";

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
    depuisQr: "Données lues dans le QR code du certificat : sceau d'intégrité intact (document non modifié depuis sa délivrance).",
    altere: "QR code MODIFIÉ",
    altereD: "Les données de ce QR code ne correspondent pas à leur sceau : document suspect.",
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
    depuisQr: "Data read from the certificate QR code: integrity seal intact (not altered since issue).",
    altere: "QR code ALTERED",
    altereD: "The data in this QR code does not match its seal: suspicious document.",
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
  const { lang = "fr", source, d } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const t = T[lang];
  const loc = lang === "fr" ? "fr-FR" : "en-GB";
  const fmt = (x?: string) =>
    x
      ? new Date(x).toLocaleDateString(loc, { day: "2-digit", month: "long", year: "numeric" })
      : "—";
  const marins = useMarins();
  const visites = useVisites();
  const v = visites.find((x) => {
    const m = marins.find((y) => y.id === x.marinId);
    return x.signee && m && codeValidation(x, m.nip) === code;
  });
  const m = marins.find((x) => x.id === v?.marinId);
  // Certificat absent de ce poste (téléphone d'un contrôleur…) : on lit les données scellées du QR.
  const lu = !v ? decoderJeton(d) : null;
  const jt = lu && lu.jeton.t === "c" ? lu.jeton : null;
  const visa = visaDgmm(m);
  const doc = v && m
    ? {
        numero: v.numero, nom: fullName(m), nip: m.nip, fct: m.profession, nee: m.dateNaissance, nat: m.nationalite,
        verdict: v.stcw.verdict, del: v.stcw.dateDelivrance || v.traiteLe, fin: v.stcw.validJusquau,
        res: v.stcw.verdict === "apte_restrictions" ? v.stcw.details : "", med: v.signataire,
        visa: visa ? `${visa.auteur} · ${fmt(visa.date)}` : "", revoque: !!v.revoquee, motif: v.motifRevocation ?? "",
      }
    : jt && lu?.intact
      ? {
          numero: jt.num, nom: jt.nom, nip: jt.nip, fct: jt.fct ?? "", nee: jt.nee ?? "", nat: jt.nat ?? "",
          verdict: jt.v as Verdict, del: jt.del, fin: jt.fin, res: jt.res ?? "", med: jt.med,
          visa: jt.visa ? `${jt.visa.split(" · ")[0]} · ${fmt(jt.visa.split(" · ")[1])}` : "", revoque: !!jt.rev, motif: "",
        }
      : null;
  const depuisQr = !v && !!doc;
  const altere = !v && !!d && !doc;
  const etat = v
    ? etatCertificat(v)
    : doc
      ? doc.revoque
        ? "revoque"
        : doc.verdict === "inapte" || doc.verdict === "inapte_temporaire"
          ? "inapte"
          : new Date(`${doc.fin}T23:59:59`).getTime() < Date.now()
            ? "expire"
            : new Date(`${doc.fin}T23:59:59`).getTime() - Date.now() <= 30 * 86_400_000
              ? "expire_bientot"
              : "valide"
      : null;
  const conforme = !!doc && (etat === "valide" || etat === "expire_bientot");
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
    altere
      ? { cls: "bg-destructive/10 text-destructive", icon: ShieldX, t: t.altere, d: t.altereD }
      : !doc || !etat
      ? { cls: "bg-destructive/10 text-destructive", icon: ShieldX, t: t.inconnu, d: t.inconnuD }
      : etat === "revoque"
        ? { cls: "bg-destructive/10 text-destructive", icon: Ban, t: t.revoque, d: doc.motif }
        : etat === "expire"
          ? { cls: "bg-destructive/10 text-destructive", icon: ShieldAlert, t: t.expire, d: t.expireD(fmt(doc.fin)) }
          : etat === "inapte"
            ? { cls: "bg-destructive/10 text-destructive", icon: ShieldAlert, t: t.inapte, d: t.verdicts[doc.verdict] }
            : {
                cls: "bg-success/12 text-success",
                icon: CheckCircle2,
                t: t.valide,
                d: etat === "expire_bientot" ? t.bientot(fmt(doc.fin)) : t.valideD(fmt(doc.fin)),
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
        {doc && (
          <div className="space-y-5 p-5">
            <div className="flex items-center gap-4">
              {m ? (
                <MarinPhoto m={m} className="h-24 w-[75px] shrink-0 rounded-lg text-xl" />
              ) : (
                <div className="grid h-24 w-[75px] shrink-0 place-items-center rounded-lg bg-primary-soft font-display text-xl font-bold text-primary">
                  {doc.nom.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{t.titulaire}</div>
                <div className="font-display text-lg font-bold text-primary">{doc.nom}</div>
                <div className="text-sm text-muted-foreground">
                  {doc.fct}{doc.nee ? ` · ${t.ne} ${fmt(doc.nee)}` : ""}
                </div>
                <div className="text-sm text-muted-foreground">{doc.nat}</div>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">{t.numero}</dt>
                <dd className="font-mono">{doc.numero}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t.nip}</dt>
                <dd className="font-mono">{doc.nip}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t.verdict}</dt>
                <dd className="font-semibold">{t.verdicts[doc.verdict]}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t.delivre}</dt>
                <dd>{fmt(doc.del)}</dd>
              </div>
              {doc.res && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">{t.restrictions}</dt>
                  <dd>{doc.res}</dd>
                </div>
              )}
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">{t.medecin}</dt>
                <dd className="font-semibold text-primary">{doc.med} · Polyclinique EDELWEISS</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">{t.visa}</dt>
                <dd>{doc.visa || t.visaAttente}</dd>
              </div>
            </dl>
            <p className="border-t pt-3 text-[11px] text-muted-foreground">
              {depuisQr ? t.depuisQr : t.verifie(new Date().toLocaleString(loc))}
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
