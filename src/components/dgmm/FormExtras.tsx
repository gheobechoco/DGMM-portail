import { useEffect, useState } from "react";
import { AlertTriangle, Eye, EyeOff, FileCheck2, Paperclip, Save, X } from "lucide-react";
import { inputClass } from "@/components/dgmm/Page";

export function PasswordInput({ id, value, onChange, autoComplete = "new-password" }: { id: string; value: string; onChange: (v: string) => void; autoComplete?: string }) {
  const [voir, setVoir] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={voir ? "text" : "password"} className={`${inputClass} pr-10`} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} />
      <button type="button" onClick={() => setVoir((v) => !v)} aria-label={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-primary">
        {voir ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function forceMdp(m: string) {
  let n = 0;
  if (m.length >= 8) n++;
  if (/[A-Z]/.test(m) && /[a-z]/.test(m)) n++;
  if (/\d/.test(m)) n++;
  if (/[^A-Za-z0-9]/.test(m)) n++;
  return n;
}

export function JaugeMdp({ value }: { value: string }) {
  if (!value) return null;
  const n = forceMdp(value);
  const lib = ["Très faible", "Faible", "Moyen", "Bon", "Robuste"][n];
  const col = n <= 1 ? "bg-destructive" : n === 2 ? "bg-warning" : "bg-success";
  return (
    <div className="mt-1.5">
      <div className="flex gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 flex-1 rounded ${i < n ? col : "bg-muted"}`} />)}</div>
      <p className="mt-1 text-xs text-muted-foreground">Sécurité : {lib} — majuscule, chiffre et symbole recommandés.</p>
    </div>
  );
}

const MAX = 5 * 1024 * 1024;

/** Sélecteur de justificatif (démo : seul le nom du fichier est conservé). */
export function PieceJointe({ id, label, required, fichier, onChange, error, accept = "image/*,application/pdf", conserverContenu = false, maxKo }: {
  id: string; label: string; required?: boolean; fichier: string; onChange: (nom: string) => void; error?: string | undefined; accept?: string; conserverContenu?: boolean;
  /** Taille maximale propre à ce justificatif (Ko). */
  maxKo?: number | undefined;
}) {
  const [msg, setMsg] = useState("");
  const libelleMax = maxKo ? `${maxKo} Ko` : conserverContenu ? "700 Ko" : "5 Mo";
  return (
    <div>
      <div className="mb-1 text-sm font-medium">{label}{required && <span className="text-destructive"> *</span>}</div>
      {fichier ? (
        <div className="flex items-center gap-2 rounded-md border border-success/40 bg-success/8 px-3 py-2 text-sm">
          <FileCheck2 className="size-4 text-success" /><span className="flex-1 truncate">{fichier.split("::", 1)[0]}</span>
          <button type="button" aria-label={`Retirer ${label}`} onClick={() => onChange("")} className="text-muted-foreground hover:text-destructive"><X className="size-4" /></button>
        </div>
      ) : (
        <label htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary">
          <Paperclip className="size-4" /> Joindre ({accept === "application/pdf" ? "PDF" : "PDF ou photo"},{" "}
          {libelleMax} max)
          <input id={id} type="file" accept={accept} className="sr-only" onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const limite = maxKo ? maxKo * 1024 : conserverContenu ? 700_000 : MAX;
            if (f.size > limite) { setMsg(`Fichier trop lourd (${libelleMax} max).`); return; }
            if (!conserverContenu) { setMsg(""); onChange(f.name); return; }
            const lecteur = new FileReader();
            lecteur.onload = () => {
              if (typeof lecteur.result !== "string") {
                setMsg("Impossible de lire ce fichier.");
                return;
              }
              setMsg("");
              onChange(`${f.name}::${lecteur.result}`);
            };
            lecteur.onerror = () => setMsg("Impossible de lire ce fichier.");
            lecteur.readAsDataURL(f);
          }} />
        </label>
      )}
      {(msg || error) && <p className="mt-1 text-xs text-destructive">{msg || error}</p>}
    </div>
  );
}

/** Sauvegarde automatique du brouillon dans le navigateur (jamais les mots de passe ni les fichiers). */
export function useBrouillon<T extends object>(cle: string, valeur: T, restaurer: (v: T) => void, exclure: string[] = []) {
  const [pret, setPret] = useState(false);
  const [restaure, setRestaure] = useState(false);
  useEffect(() => {
    try {
      const brut = localStorage.getItem(cle);
      if (brut) { const v = JSON.parse(brut); if (Array.isArray(valeur) !== Array.isArray(v)) throw new Error("format"); restaurer(Array.isArray(v) ? (v as T) : { ...valeur, ...v }); setRestaure(true); }
    } catch { localStorage.removeItem(cle); }
    setPret(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!pret) return;
    if (Array.isArray(valeur)) { localStorage.setItem(cle, JSON.stringify(valeur)); return; }
    const copie: Record<string, unknown> = { ...(valeur as Record<string, unknown>) };
    exclure.forEach((k) => delete copie[k]);
    localStorage.setItem(cle, JSON.stringify(copie));
  }, [cle, valeur, pret, exclure]);
  return { restaure, effacer: () => { localStorage.removeItem(cle); setRestaure(false); } };
}

export function BandeauBrouillon({ visible, onEffacer }: { visible: boolean; onEffacer: () => void }) {
  if (!visible) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-sm">
      <Save className="size-4 text-primary" /> Votre saisie précédente a été reprise (les pièces jointes et mots de passe sont à refaire).
      <button type="button" onClick={onEffacer} className="ml-auto font-semibold text-primary hover:underline">Recommencer à zéro</button>
    </div>
  );
}

/** Progression + liste des points à corriger, cliquables pour aller au champ. */
export function SuiviSaisie({ total, erreurs, montrer, libelles }: {
  total: number; erreurs: Record<string, string | undefined>; montrer: boolean; libelles: Record<string, string>;
}) {
  const restants = Object.keys(erreurs).filter((k) => erreurs[k]);
  const pct = Math.round(((total - restants.length) / total) * 100);
  return (
    <div className="sticky top-2 z-10 rounded-xl border bg-card/95 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-primary">Formulaire complété à {Math.max(0, pct)} %</span>
        <span className="text-xs text-muted-foreground">{restants.length ? `${restants.length} élément(s) restant(s)` : "Prêt à envoyer"}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full transition-all duration-500 ${restants.length ? "bg-gold" : "bg-success"}`} style={{ width: `${Math.max(0, pct)}%` }} />
      </div>
      {montrer && restants.length > 0 && (
        <div role="alert" className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-destructive"><AlertTriangle className="size-4" /> À corriger avant l'envoi :</p>
          <ul className="mt-1 space-y-0.5 text-sm">
            {restants.map((k) => (
              <li key={k}><button type="button" className="text-left text-destructive underline-offset-2 hover:underline" onClick={() => {
                const el = document.getElementById(k) ?? document.querySelector<HTMLElement>(`[data-champ="${k}"]`);
                el?.scrollIntoView({ behavior: "smooth", block: "center" }); el?.focus?.();
              }}>{libelles[k] ?? k} — {erreurs[k]}</button></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
