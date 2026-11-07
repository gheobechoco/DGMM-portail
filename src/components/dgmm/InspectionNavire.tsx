import { Aide, type Terme } from "@/components/dgmm/Aide";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Lock, ShieldAlert } from "lucide-react";
import { Field, Panel, inputClass, selectClass } from "@/components/dgmm/Page";
import { PieceJointe } from "@/components/dgmm/FormExtras";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PORTS_ATTACHE } from "@/lib/dgmm/registre";
import {
  CERTIFICATS_NAVIRE,
  ajouterMois,
  echeanceCritique,
  manquesScellement,
  scellerInspection,
  type DefCertificat,
  type FicheNavire,
  type SaisieCertificat,
} from "@/lib/dgmm/navires";

const fr = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR");
const AIDE_CERT: Partial<Record<string, Terme>> = { franc_bord: "francBord", radio: "smdsm", sanitaire: "sanitaireNavire", mlc3: "mlc", dms: "dms" };

/** Formulaire de l'inspecteur : un certificat par ligne, rapport co-signé, puis scellement. */
export function InspectionNavireForm({ navire, inspecteur, onFini }: { navire: FicheNavire; inspecteur: string; onFini: () => void }) {
  const ajd = new Date().toISOString().slice(0, 10);
  const [port, setPort] = useState(navire.portAttache && PORTS_ATTACHE.includes(navire.portAttache as (typeof PORTS_ATTACHE)[number]) ? navire.portAttache : "");
  const [date, setDate] = useState(ajd);
  const [commandant, setCommandant] = useState("");
  const [cosigne, setCosigne] = useState(false);
  const [rapport, setRapport] = useState("");
  const [certs, setCerts] = useState<Record<string, SaisieCertificat>>(() =>
    Object.fromEntries(CERTIFICATS_NAVIRE.map((c) => [c.id, { conforme: false, effet: ajd, ...(c.durees ? { dureeMois: c.durees[c.durees.length - 1] } : {}) }])),
  );
  const maj = (id: string, p: Partial<SaisieCertificat>) => setCerts((s) => ({ ...s, [id]: { ...s[id]!, ...p } }));
  const brouillon = { port, commandant, rapport: cosigne ? rapport : "", certificats: certs };
  const manques = manquesScellement(brouillon);
  if (!cosigne) manques.unshift("Co-signature du rapport par le commandant");
  const avecEcheances = { certificats: Object.fromEntries(Object.entries(certs).map(([k, s]) => [k, s.dureeMois && s.effet ? { ...s, echeance: ajouterMois(s.effet, s.dureeMois) } : s])) };
  const critique = echeanceCritique(avecEcheances);

  const sceller = () => {
    const r = scellerInspection({ navireId: navire.id, navire: navire.nom, imo: navire.imo, armateur: navire.armateur, date, port, inspecteur, commandant: commandant.trim(), rapport, certificats: certs });
    if (typeof r === "string") { toast.error(r); return; }
    toast.success(`Inspection ${r.numero} scellée`, { description: "Le dossier attend le visa du responsable RH." });
    onFini();
  };

  const groupe = (g: "technique" | "sanitaire") => CERTIFICATS_NAVIRE.filter((c) => c.groupe === g);
  return (
    <div className="space-y-5">
      <Panel title="Visite à bord" description={`${navire.nom}${navire.imo ? ` · OMI ${navire.imo}` : ""} · ${navire.armateur}`}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date de la visite" htmlFor="ins-date" required><input id="ins-date" type="date" className={inputClass} value={date} max={ajd} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Port" htmlFor="ins-port" required>
            <select id="ins-port" className={selectClass} value={port} onChange={(e) => setPort(e.target.value)}><option value="">Choisir…</option>{PORTS_ATTACHE.map((p) => <option key={p}>{p}</option>)}</select>
          </Field>
          <Field label="Commandant (ou représentant de l'armement)" htmlFor="ins-cdt" required><input id="ins-cdt" className={inputClass} value={commandant} onChange={(e) => setCommandant(e.target.value)} /></Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <PieceJointe id="ins-rapport" label="Rapport d'inspection technique co-signé" required fichier={rapport} onChange={setRapport} />
          <label className="flex items-start gap-2 self-end text-sm">
            <input id="ins-cosigne" type="checkbox" className="mt-1" checked={cosigne} onChange={(e) => setCosigne(e.target.checked)} />
            <span>Le rapport a été co-signé à bord par l'inspecteur et par le commandant (conformité visuelle actée).</span>
          </label>
        </div>
      </Panel>

      {(["technique", "sanitaire"] as const).map((g) => (
        <Panel key={g} title={g === "technique" ? "I. Certificats techniques et de navigation" : "II. Certificats sanitaires et d'hygiène (MLC 2006, RSI 2005)"} bodyClassName="p-0">
          <ul className="divide-y">
            {groupe(g).map((c) => <LigneCertificat key={c.id} c={c} s={certs[c.id]!} onChange={(p) => maj(c.id, p)} />)}
          </ul>
        </Panel>
      ))}

      <div className="rounded-xl border bg-card p-4 shadow-card">
        {critique && (
          <p className="mb-3 text-sm">
            Date de surveillance (certificat le plus court) : <strong className="text-primary">{fr(critique.echeance)}</strong> — {critique.titre}.
          </p>
        )}
        {manques.length > 0 ? (
          <div className="mb-3 rounded-md bg-warning/10 p-3 text-xs">
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-warning"><ShieldAlert className="size-4" /> {manques.length} point(s) avant de pouvoir sceller</div>
            <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">{manques.slice(0, 6).map((m) => <li key={m}>{m}</li>)}{manques.length > 6 && <li>…</li>}</ul>
          </div>
        ) : (
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-success"><CheckCircle2 className="size-4" /> Dossier complet : prêt à être scellé.</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="gold" size="lg" disabled={manques.length > 0} onClick={sceller}><Lock /> Sceller et transmettre au visa RH</Button>
          <Button type="button" variant="ghost" onClick={onFini}>Annuler</Button>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Aide terme="doubleVerrou" /> Après scellement, plus aucune donnée n'est modifiable. Le navire passe « En attente de visa RH ».</span>
        </div>
      </div>
    </div>
  );
}

function LigneCertificat({ c, s, onChange }: { c: DefCertificat; s: SaisieCertificat; onChange: (p: Partial<SaisieCertificat>) => void }) {
  const echeance = c.nature === "periodique" && s.dureeMois && s.effet ? ajouterMois(s.effet, s.dureeMois) : null;
  const id = `cert-${c.id}`;
  return (
    <li className={cn("grid gap-3 px-5 py-4 lg:grid-cols-[1.3fr_auto_2fr]", s.conforme && "bg-success/5")}>
      <div>
        <div className="flex items-center gap-1 font-semibold text-primary">{c.titre}{AIDE_CERT[c.id] && <Aide terme={AIDE_CERT[c.id]!} />}</div>
        <div className="text-xs text-muted-foreground">{c.detail}</div>
      </div>
      <div className="flex items-start gap-2" role="radiogroup" aria-label={`Constat : ${c.titre}`}>
        {[true, false].map((v) => (
          <button key={String(v)} type="button" role="radio" aria-checked={s.conforme === v} onClick={() => onChange({ conforme: v })} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", s.conforme === v ? (v ? "border-success bg-success text-success-foreground" : "border-destructive bg-destructive text-destructive-foreground") : "hover:border-gold")}>
            {v ? "Conforme" : "Non conforme"}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {c.nature === "registre" ? (
          <Field label="Observation" htmlFor={`${id}-obs`} className="sm:col-span-2"><input id={`${id}-obs`} className={inputClass} value={s.observation ?? ""} onChange={(e) => onChange({ observation: e.target.value })} placeholder="Registre tenu et à jour" /></Field>
        ) : (
          <>
            <div className="sm:col-span-2"><PieceJointe id={`${id}-scan`} label="Scan du document" required fichier={s.scan ?? ""} onChange={(n) => onChange({ scan: n || undefined })} /></div>
            {c.variantes && (
              <Field label="Type de certificat" htmlFor={`${id}-var`} className="sm:col-span-2">
                <select id={`${id}-var`} className={selectClass} value={s.variante ?? ""} onChange={(e) => onChange({ variante: e.target.value || undefined })}><option value="">Choisir…</option>{c.variantes.map((v) => <option key={v}>{v}</option>)}</select>
              </Field>
            )}
            {c.nature === "periodique" && c.durees && (
              <Field label="Validité accordée" htmlFor={`${id}-duree`}>
                <select id={`${id}-duree`} className={selectClass} value={s.dureeMois ?? ""} onChange={(e) => onChange({ dureeMois: Number(e.target.value) })}>
                  {c.durees.map((d) => <option key={d} value={d}>{d === 12 ? "1 an (réglementaire)" : `${d} mois${d === 3 && c.durees!.length > 1 ? " (temporaire)" : ""}`}</option>)}
                </select>
              </Field>
            )}
            <Field label={c.nature === "escale" ? "Date de la déclaration" : "Date d'effet"} htmlFor={`${id}-effet`} hint={echeance ? `Échéance : ${fr(echeance)}` : undefined}>
              <input id={`${id}-effet`} type="date" className={inputClass} value={s.effet ?? ""} onChange={(e) => onChange({ effet: e.target.value })} />
            </Field>
          </>
        )}
      </div>
    </li>
  );
}
