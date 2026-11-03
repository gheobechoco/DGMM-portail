import { useState } from "react";
import { Eye, EyeOff, FileCheck2, Paperclip, X } from "lucide-react";
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
export function PieceJointe({ id, label, required, fichier, onChange, error, accept = "image/*,application/pdf" }: {
  id: string; label: string; required?: boolean; fichier: string; onChange: (nom: string) => void; error?: string | undefined; accept?: string;
}) {
  const [msg, setMsg] = useState("");
  return (
    <div>
      <div className="mb-1 text-sm font-medium">{label}{required && <span className="text-destructive"> *</span>}</div>
      {fichier ? (
        <div className="flex items-center gap-2 rounded-md border border-success/40 bg-success/8 px-3 py-2 text-sm">
          <FileCheck2 className="size-4 text-success" /><span className="flex-1 truncate">{fichier}</span>
          <button type="button" aria-label={`Retirer ${label}`} onClick={() => onChange("")} className="text-muted-foreground hover:text-destructive"><X className="size-4" /></button>
        </div>
      ) : (
        <label htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary">
          <Paperclip className="size-4" /> Joindre (PDF ou photo, 5 Mo max)
          <input id={id} type="file" accept={accept} className="sr-only" onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > MAX) { setMsg("Fichier trop lourd (5 Mo max)."); return; }
            setMsg(""); onChange(f.name);
          }} />
        </label>
      )}
      {(msg || error) && <p className="mt-1 text-xs text-destructive">{msg || error}</p>}
    </div>
  );
}
