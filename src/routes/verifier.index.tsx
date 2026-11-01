import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, CameraOff, Search, ShieldCheck } from "lucide-react";
import { VerifyShell, validateLang, type Lang } from "@/components/dgmm/VerifyShell";
import { CarteSkeleton } from "@/components/dgmm/Skeletons";
import { Aide } from "@/components/dgmm/Aide";
import { Button } from "@/components/ui/button";
import { useMarins } from "@/lib/dgmm/store";

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
  const [saisie, setSaisie] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [scan, setScan] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const search = lang === "en" ? { lang: "en" as const } : {};

  const ouvrir = (valeur: string) => {
    const v = valeur.trim().toUpperCase();
    if (!v) return setMsg(t.vide);
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
              const url = (() => {
                try {
                  return new URL(raw, window.location.origin);
                } catch {
                  return null;
                }
              })();
              const m = url?.pathname.match(/\/verifier\/(certificat\/)?([^/?#]+)/);
              if (m) {
                setScan(false);
                const id = decodeURIComponent(m[2]!);
                if (m[1])
                  navigate({ to: "/verifier/certificat/$code", params: { code: id }, search });
                else navigate({ to: "/verifier/$nip", params: { nip: id }, search });
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
      <div className="reveal w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-card">
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
          <p className="flex items-center gap-1 border-t pt-3 text-[11px] text-muted-foreground">
            {t.psc}
            {lang === "fr" && <Aide terme="abuja" />}
          </p>
        </div>
      </div>
    </VerifyShell>
  );
}
