import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Camera, CameraOff, Search, ShieldCheck } from "lucide-react";
import { VerifyShell, validateLang, type Lang } from "@/components/dgmm/VerifyShell";
import { CarteSkeleton } from "@/components/dgmm/Skeletons";
import { Aide } from "@/components/dgmm/Aide";
import { BarometreControle } from "@/components/dgmm/Statistiques";
import { lireCodeScanne } from "@/lib/dgmm/jetonQr";
import { Button } from "@/components/ui/button";
import { codeValidation, useMarins, useVisites } from "@/lib/dgmm/store";

export const Route = createFileRoute("/verifier/")({
  ssr: false,
  pendingComponent: CarteSkeleton,
  validateSearch: validateLang,
  head: () => ({
    meta: [
      { title: "Vérification d'un titre maritime · Seafarer document check — DGMM" },
      {
        name: "description",
        content:
          "Contrôle public par QR code ou NIP des certificats médicaux et livrets maritimes délivrés par la DGMM (Port State Control, MoU d'Abuja).",
      },
    ],
  }),
  component: VerifierAccueil,
});

const T = {
  fr: {
    sous: "Contrôle public des titres maritimes",
    titre: "Vérifier un titre maritime",
    texte:
      "Scannez le QR code du certificat ou du livret, ou saisissez le NIP, le n° de livret ou le code du certificat.",
    champ: "NIP, n° de livret ou code certificat",
    verifier: "Vérifier",
    scanner: "Scanner un QR code",
    arreter: "Arrêter la caméra",
    viser: "Placez le QR code dans le cadre",
    nonSupporte:
      "Ce navigateur ne permet pas le scan intégré : ouvrez l'appareil photo du téléphone et visez le QR code, le lien s'ouvrira directement.",
    refus: "Accès à la caméra refusé ou indisponible.",
    inconnu: "QR code non reconnu : il ne provient pas du registre DGMM.",
    vide: "Saisissez un identifiant.",
    psc: "Contrôle par l'État du port — MoU d'Abuja",
    demoTitre: "Exemples de démonstration pour inspecteurs PSC",
    demoTexte: "Lancez une vérification publique en un clic.",
    demoValide: "Titre valide & conforme",
    demoValideD: "HAPPI Éric",
    demoRenouveler: "Certificat à renouveler",
    demoRenouvelerD: "ATENDE Mélissa · expiration dans moins de 30 jours",
    demoExpire: "Titre expiré / Inaptitude",
    demoExpireD: "MBOUMA René · certificat expiré",
    demoOfficiel: "Certificat médical officiel (QR Code)",
    demoOfficielD: "OBAME NGUEMA Jean-Pierre",
    demoFaux: "Simulation document non répertorié",
    demoFauxD: "Identifiant fictif · alerte anti-fraude",
    visaStcw: "Visa DGMM · STCW I/9",
  },
  en: {
    sous: "Public verification of seafarer documents",
    titre: "Verify a seafarer document",
    texte:
      "Scan the QR code of the medical certificate or record book, or type the seafarer ID, record book number or certificate code.",
    champ: "Seafarer ID, record book No. or certificate code",
    verifier: "Verify",
    scanner: "Scan a QR code",
    arreter: "Stop camera",
    viser: "Place the QR code inside the frame",
    nonSupporte:
      "This browser has no built-in scanner: open your phone camera and point it at the QR code, the link will open directly.",
    refus: "Camera access denied or unavailable.",
    inconnu: "Unrecognised QR code: it does not come from the DGMM register.",
    vide: "Enter an identifier.",
    psc: "Port State Control — Abuja MoU",
    demoTitre: "PSC inspector demonstration examples",
    demoTexte: "Run a public verification in one click.",
    demoValide: "Valid & compliant document",
    demoValideD: "HAPPI Éric",
    demoRenouveler: "Certificate due for renewal",
    demoRenouvelerD: "ATENDE Mélissa · expires in less than 30 days",
    demoExpire: "Expired document / Unfit",
    demoExpireD: "MBOUMA René · certificate expired",
    demoOfficiel: "Official medical certificate (QR code)",
    demoOfficielD: "OBAME NGUEMA Jean-Pierre",
    demoFaux: "Unregistered document simulation",
    demoFauxD: "Fictional ID · anti-fraud alert",
    visaStcw: "DGMM endorsement · STCW I/9",
  },
};

interface Detector {
  detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
}

function VerifierAccueil() {
  const { lang = "fr" } = Route.useSearch();
  const t = T[lang];
  const navigate = useNavigate();
  const marins = useMarins();
  const visites = useVisites();
  const [saisie, setSaisie] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [scan, setScan] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const search = useMemo(() => (lang === "en" ? { lang: "en" as const } : {}), [lang]);
  const marinValide =
    marins.find((m) => m.nip === "GAB-2026-001202") ??
    marins.find((m) => m.nom === "HAPPI" && m.prenom === "Éric");
  const marinRenouvellement = marins.find((m) => m.nom === "ATENDE" && m.prenom === "Mélissa");
  const marinExpire = marins.find((m) => m.nom === "MBOUMA" && m.prenom === "René");
  const marinCertificat = marins.find(
    (m) => m.nom === "OBAME NGUEMA" && m.prenom === "Jean-Pierre",
  );
  const certificatOfficiel = marinCertificat
    ? visites.find(
        (v) => v.marinId === marinCertificat.id && v.numero === "VM-2026-0042" && v.signee,
      )
    : undefined;
  const exemples = [
    {
      key: "valide",
      label: t.demoValide,
      detail: t.demoValideD,
      value: marinValide?.nip,
      style: "border-success/40 hover:border-success",
    },
    {
      key: "renouveler",
      label: t.demoRenouveler,
      detail: t.demoRenouvelerD,
      value: marinRenouvellement?.nip,
      style: "border-warning/50 hover:border-warning",
    },
    {
      key: "expire",
      label: t.demoExpire,
      detail: t.demoExpireD,
      value: marinExpire?.nip,
      style: "border-destructive/40 hover:border-destructive",
    },
    {
      key: "officiel",
      label: t.demoOfficiel,
      detail: `${t.demoOfficielD} · ${t.visaStcw}`,
      value:
        certificatOfficiel && marinCertificat
          ? codeValidation(certificatOfficiel, marinCertificat.nip)
          : undefined,
      style: "border-primary/40 hover:border-primary",
    },
    {
      key: "faux",
      label: t.demoFaux,
      detail: t.demoFauxD,
      value: "GAB-9999-000000",
      style: "border-destructive/40 hover:border-destructive",
    },
  ].filter((exemple) => exemple.value);

  const ouvrir = (valeur: string) => {
    const v = valeur.trim().toUpperCase();
    if (!v) return setMsg(t.vide);
    if (v.startsWith("PRE-") || v.startsWith("DGMM-PRE:"))
      return navigate({ to: "/suivi-demande", search: { numero: v.replace(/^DGMM-PRE:/, ""), lang: search.lang } });
    if (v.startsWith("GAB-DGMM-"))
      return navigate({ to: "/verifier/certificat/$code", params: { code: v }, search });
    const parLivret = marins.find((m) => m.livret && m.livret.toUpperCase() === v);
    navigate({ to: "/verifier/$nip", params: { nip: parLivret?.nip ?? v }, search });
  };

  // Scan QR intégré (BarcodeDetector, disponible sur Chrome Android et la plupart des navigateurs mobiles récents).
  useEffect(() => {
    if (!scan) return;
    const W = window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector };
    if (!W.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      setMsg(t.nonSupporte);
      setScan(false);
      return;
    }
    const detector = new W.BarcodeDetector({ formats: ["qr_code"] });
    let stream: MediaStream | null = null;
    let timer = 0;
    let stop = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        stream = s;
        if (!video.current || stop) return;
        video.current.srcObject = s;
        void video.current.play();
        const tick = async () => {
          if (stop || !video.current) return;
          try {
            const codes = await detector.detect(video.current);
            const raw = codes[0]?.rawValue;
            if (raw) {
              // Lien du QR (certificat, livret, récépissé) ou ancien format : on ouvre la bonne page.
              const lu = lireCodeScanne(raw);
              const fiable = lu.d || /\/verifier\/|suivi-demande|^DGMM-PRE:/i.test(raw) || /^(GAB-|PRE-)/.test(lu.id);
              if (lu.id && fiable) {
                setScan(false);
                if (lu.type === "recepisse")
                  navigate({ to: "/suivi-demande", search: { numero: lu.id, d: lu.d, lang: search.lang } });
                else if (lu.type === "certificat")
                  navigate({ to: "/verifier/certificat/$code", params: { code: lu.id }, search: { ...search, source: "qr", d: lu.d } });
                else navigate({ to: "/verifier/$nip", params: { nip: lu.id }, search: { ...search, source: "qr", d: lu.d } });
                return;
              }
              setMsg(t.inconnu);
            }
          } catch {
            /* image non exploitable : on réessaie */
          }
          timer = window.setTimeout(tick, 300);
        };
        void tick();
      })
      .catch(() => {
        setMsg(t.refus);
        setScan(false);
      });
    return () => {
      stop = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [scan, t, navigate, search]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    ouvrir(saisie);
  };

  return (
    <VerifyShell
      lang={lang}
      onLang={(l: Lang) =>
        navigate({ to: "/verifier", search: l === "en" ? { lang: "en" } : {}, replace: true })
      }
      sousTitre={t.sous}
    >
      <div className="reveal w-full max-w-2xl overflow-hidden rounded-xl border bg-card shadow-card">
        <div className="flex items-center gap-3 bg-primary-soft px-5 py-4">
          <ShieldCheck className="size-8 shrink-0 text-primary" />
          <div>
            <h1 className="font-display text-lg font-bold text-primary">{t.titre}</h1>
            <p className="text-xs text-muted-foreground">{t.texte}</p>
          </div>
        </div>
        <div className="space-y-4 p-5">
          {scan ? (
            <div className="space-y-2">
              <div className="relative overflow-hidden rounded-lg bg-black">
                <video
                  ref={video}
                  className="aspect-square w-full object-cover"
                  muted
                  playsInline
                  aria-label={t.viser}
                />
                <div
                  className="pointer-events-none absolute inset-[18%] rounded-xl border-4 border-gold/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                  aria-hidden
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">{t.viser}</p>
              <Button variant="outline" className="w-full" onClick={() => setScan(false)}>
                <CameraOff /> {t.arreter}
              </Button>
            </div>
          ) : (
            <Button
              variant="gold"
              size="lg"
              className="h-12 w-full text-base"
              onClick={() => {
                setMsg(null);
                setScan(true);
              }}
            >
              <Camera /> {t.scanner}
            </Button>
          )}
          <form onSubmit={submit} className="flex gap-2">
            <label className="field-dgmm flex h-11 flex-1 items-center gap-2 rounded-md bg-card px-3">
              <Search className="size-4 text-muted-foreground" />
              <span className="sr-only">{t.champ}</span>
              <input
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                placeholder={t.champ}
                className="h-full flex-1 bg-transparent font-mono text-sm uppercase outline-none placeholder:font-sans placeholder:normal-case placeholder:text-muted-foreground"
              />
            </label>
            <Button type="submit" className="h-11">
              {t.verifier}
            </Button>
          </form>
          {msg && (
            <p
              role="status"
              className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground"
            >
              {msg}
            </p>
          )}
          <section aria-labelledby="demo-exemples" className="border-t pt-4">
            <h2 id="demo-exemples" className="font-display text-sm font-bold text-primary">
              {t.demoTitre}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{t.demoTexte}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {exemples.map((exemple) => (
                <button
                  key={exemple.key}
                  type="button"
                  onClick={() => {
                    setSaisie(exemple.value!);
                    setMsg(null);
                    ouvrir(exemple.value!);
                  }}
                  className={`rounded-lg border bg-card p-3 text-left text-xs font-semibold text-primary transition hover:bg-muted/50 ${exemple.style}`}
                >
                  <span className="block">{exemple.label}</span>
                  {exemple.detail && (
                    <span className="mt-1 block font-normal text-muted-foreground">
                      {exemple.detail}
                    </span>
                  )}
                  <span className="mt-1 block truncate font-mono font-normal text-muted-foreground">
                    {exemple.value}
                  </span>
                </button>
              ))}
            </div>
          </section>
          <p className="flex items-center gap-1 border-t pt-3 text-[11px] text-muted-foreground">
            {t.psc}
            {lang === "fr" && <Aide terme="abuja" />}
          </p>
        </div>
        <div className="mt-4">
          <BarometreControle />
        </div>
      </div>
    </VerifyShell>
  );
}
