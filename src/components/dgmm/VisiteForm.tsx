import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import {
  History,
  Sparkles,
  Ear,
  Eye,
  FileSignature,
  HeartPulse,
  Palette,
  Plus,
  Save,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Panel, inputClass, selectClass, textareaClass } from "@/components/dgmm/Page";
import { MarinPhoto } from "@/components/dgmm/MarinBits";
import { Aide, type Terme } from "@/components/dgmm/Aide";
import { ageFrom } from "@/lib/dgmm/rules";
import {
  PRATICIENS,
  emptyStcw,
  fullName,
  isInapte,
  type Marin,
  type OuiNon,
  type Stcw,
  type Verdict,
  type Visite,
  useVisites,
  formatDate,
  VERDICT_LABELS,
} from "@/lib/dgmm/store";
import { cn } from "@/lib/utils";

export type VisiteInput = Omit<Visite, "id" | "numero" | "creeLe" | "traiteLe"> & { id?: number };
type Q = [keyof Stcw, string];

/** Contrôles réglementaires de la section A-I/9 du Code STCW, regroupés par domaine. */
const VISION: Q[] = [
  ["acuiteVisuelle", "Acuité visuelle conforme aux normes A-I/9 (avec ou sans correction)"],
  ["visionBinoculaire", "Vision binoculaire satisfaisante"],
  ["aidesVisuelles", "Port de lunettes ou de lentilles nécessaire"],
];
const COULEURS: Q[] = [["couleurs", "Perception des couleurs satisfaisante (test d'Ishihara)"]];
const AUDITION: Q[] = [
  ["auditiveSansAide", "Acuité auditive conforme sans prothèse"],
  ["acuiteAuditive", "Acuité auditive conforme aux normes A-I/9"],
  ["communicationUrgence", "Capable de communiquer en situation d'urgence (consignes, alarmes)"],
];
const APTITUDES: Q[] = [
  ["identiteVerifiee", "Documents d'identité vérifiés sur le lieu de l'examen"],
  ["veille", "Apte au service de veille, y compris de nuit"],
  [
    "exemptAffection",
    "Exempt de toute affection susceptible d'être aggravée par le service en mer ou de mettre en danger l'équipage",
  ],
];
export const ALL_QUESTIONS: Q[] = [
  ...APTITUDES.slice(0, 1),
  ...VISION,
  ...COULEURS,
  ...AUDITION,
  ...APTITUDES.slice(1),
];

const RESTRICTIONS = [
  "Port obligatoire de verres correcteurs",
  "Pas de service de veille de nuit",
  "Navigation côtière uniquement",
  "Service de jour uniquement",
  "Pas de travail en hauteur",
  "Pas de service en salle des machines",
];

const VERDICTS: { v: Exclude<Verdict, "">; label: string; hint: string; on: string }[] = [
  {
    v: "apte",
    label: "Apte",
    hint: "sans restriction",
    on: "border-success bg-success/10 text-success",
  },
  {
    v: "apte_restrictions",
    label: "Apte",
    hint: "avec restrictions",
    on: "border-warning bg-warning/10 text-warning",
  },
  {
    v: "inapte_temporaire",
    label: "Inapte",
    hint: "temporaire",
    on: "border-[oklch(0.62_0.17_45)] bg-[oklch(0.62_0.17_45)]/10 text-[oklch(0.5_0.17_45)]",
  },
  {
    v: "inapte",
    label: "Inapte",
    hint: "définitif",
    on: "border-destructive bg-destructive/10 text-destructive",
  },
];

function addYears(iso: string, n: number) {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + n);
  return d.toISOString().slice(0, 10);
}

export function imc(
  taille: string,
  poids: string,
): { valeur: number; categorie: string; tone: string } | null {
  const t = Number(taille) / 100;
  const p = Number(poids);
  if (!t || !p || t < 1 || t > 2.5 || p < 30 || p > 250) return null;
  const valeur = Math.round((p / (t * t)) * 10) / 10;
  if (valeur < 18.5) return { valeur, categorie: "Insuffisance pondérale", tone: "text-warning" };
  if (valeur < 25) return { valeur, categorie: "Corpulence normale", tone: "text-success" };
  if (valeur < 30) return { valeur, categorie: "Surpoids", tone: "text-warning" };
  return { valeur, categorie: "Obésité", tone: "text-destructive" };
}

export function emptyVisite(marinId: number, praticien: string): VisiteInput {
  const today = new Date().toISOString().slice(0, 10);
  return {
    marinId,
    praticien: PRATICIENS.includes(praticien) ? praticien : PRATICIENS[0]!,
    examens: {
      taille: "",
      poids: "",
      tension: "",
      pouls: "",
      vision: "",
      visionCorrigee: "",
      audition: "",
      observations: "",
    },
    complementaires: "",
    recommandations: "",
    documents: [],
    stcw: { ...emptyStcw(), dateDelivrance: today, validJusquau: addYears(today, 2) },
    signee: false,
    signataire: "",
  };
}

function OuiNonGroup({
  name,
  value,
  onChange,
  invalid,
}: {
  name: string;
  value: OuiNon;
  onChange: (v: OuiNon) => void;
  invalid?: boolean | undefined;
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={`${name}-label`}
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-md border",
        invalid && "border-destructive",
      )}
    >
      {(["oui", "non"] as const).map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "px-3.5 py-1.5 text-xs font-semibold transition-colors",
            value === o
              ? o === "oui"
                ? "bg-secondary text-secondary-foreground"
                : "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-muted",
          )}
        >
          {o === "oui" ? "Oui" : "Non"}
        </button>
      ))}
    </div>
  );
}

function Bloc({
  icon: Icon,
  title,
  children,
  aide,
}: {
  icon: typeof Eye;
  title: string;
  children: ReactNode;
  aide?: Terme | undefined;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
        <span className="grid size-7 place-items-center rounded-md bg-primary-soft">
          <Icon className="size-4" />
        </span>
        {title}
        {aide && <Aide terme={aide} />}
      </div>
      {children}
    </div>
  );
}

export function VisiteForm({
  initial,
  marins,
  canSign,
  signataire,
  onSubmit,
  onCancel,
}: {
  initial: VisiteInput;
  marins: Marin[];
  canSign: boolean;
  signataire: string;
  onSubmit: (v: VisiteInput) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<VisiteInput>(() => ({
    ...initial,
    stcw: { ...emptyStcw(), ...initial.stcw },
  }));
  const [tried, setTried] = useState(false);
  const [sauve, setSauve] = useState<string | null>(null);
  const cle = `dgmm-brouillon-visite:${initial.id ?? "nouvelle"}`;
  const premier = useRef(true);

  // Restauration d'un brouillon local (onglet fermé par erreur, coupure…).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(cle);
      if (!raw) return;
      const b = JSON.parse(raw) as { v: VisiteInput; at: string };
      if (initial.id === undefined && b.v.marinId !== initial.marinId && initial.marinId) return;
      setV(b.v);
      setSauve(b.at);
      const heure = new Date(b.at).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      toast.info(`Brouillon restauré (saisie de ${heure})`, {
        action: {
          label: "Repartir de zéro",
          onClick: () => {
            window.localStorage.removeItem(cle);
            setV(initial);
            setSauve(null);
          },
        },
      });
    } catch {
      /* brouillon illisible : ignoré */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sauvegarde automatique silencieuse 3 s après la dernière modification.
  useEffect(() => {
    if (premier.current) {
      premier.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      const at = new Date().toISOString();
      try {
        window.localStorage.setItem(cle, JSON.stringify({ v, at }));
        setSauve(at);
      } catch {
        /* stockage plein : pas de sauvegarde locale */
      }
    }, 3000);
    return () => window.clearTimeout(t);
  }, [v, cle]);

  const oublierBrouillon = () => {
    try {
      window.localStorage.removeItem(cle);
    } catch {
      /* rien */
    }
  };
  const marin = marins.find((m) => m.id === v.marinId);
  const toutes = useVisites();
  const anciennes = toutes
    .filter((x) => x.marinId === v.marinId && x.signee && x.id !== initial.id)
    .sort((a, b) => b.traiteLe.localeCompare(a.traiteLe))
    .slice(0, 4);
  // Reprend les antécédents connus de la dernière visite pour ne pas les ressaisir.
  const antecedentsConnus = anciennes[0]?.antecedents;
  useEffect(() => {
    if (v.antecedents === undefined && antecedentsConnus)
      setV((x) => ({ ...x, antecedents: antecedentsConnus }));
  }, [v.antecedents, antecedentsConnus]);
  const mineur = (ageFrom(marin?.dateNaissance) ?? 99) < 18;
  const inapte = isInapte(v.stcw.verdict);
  const bmi = imc(v.examens.taille, v.examens.poids);
  const eligibles = marins.filter(
    (m) => m.validationAdmin !== "rejetee" || m.id === initial.marinId,
  );
  const [standard, setStandard] = useState(false);

  /** Pré-remplit un examen normal : le médecin n'ajuste ensuite que les anomalies. */
  const examenStandard = () => {
    const today = new Date().toISOString().slice(0, 10);
    setV((s) => ({
      ...s,
      examens: {
        ...s.examens,
        tension: s.examens.tension || "12/8",
        pouls: s.examens.pouls || "72",
        vision: s.examens.vision || "10/10",
        visionCorrigee: s.examens.visionCorrigee || "10/10",
        audition: s.examens.audition || "Normale",
        ecg: s.examens.ecg || "Normal, rythme sinusal régulier",
        observations: s.examens.observations || "Examen clinique sans particularité.",
      },
      stcw: {
        ...s.stcw,
        identiteVerifiee: "oui",
        acuiteVisuelle: "oui",
        visionBinoculaire: "oui",
        aidesVisuelles: "non",
        couleurs: "oui",
        dateTestCouleurs: s.stcw.dateTestCouleurs || today,
        auditiveSansAide: "oui",
        acuiteAuditive: "oui",
        communicationUrgence: "oui",
        veille: "oui",
        exemptAffection: "oui",
        verdict: s.stcw.verdict || "apte",
      },
    }));
    setStandard(true);
  };

  const ex = (k: keyof VisiteInput["examens"]) => ({
    id: `ex-${k}`,
    value: v.examens[k] ?? "",
    onChange: (e: { target: { value: string } }) =>
      setV((s) => ({ ...s, examens: { ...s.examens, [k]: e.target.value } })),
  });
  const st = <K extends keyof Stcw>(k: K, val: Stcw[K]) =>
    setV((s) => ({ ...s, stcw: { ...s.stcw, [k]: val } }));
  const answer = (k: keyof Stcw, o: OuiNon) =>
    setV((s) => ({
      ...s,
      stcw: {
        ...s.stcw,
        [k]: o,
        ...(k === "couleurs" && o === "oui" && !s.stcw.dateTestCouleurs
          ? { dateTestCouleurs: new Date().toISOString().slice(0, 10) }
          : {}),
      },
    }));

  const questions = (list: Q[]) => (
    <ul className="divide-y">
      {list.map(([k, label]) => (
        <li
          key={k}
          className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
        >
          <span
            id={`${k}-label`}
            className={cn("text-sm", tried && !v.stcw[k] && "text-destructive")}
          >
            {label}
          </span>
          <OuiNonGroup
            name={k}
            value={v.stcw[k] as OuiNon}
            onChange={(o) => answer(k, o)}
            invalid={tried && !v.stcw[k]}
          />
        </li>
      ))}
    </ul>
  );

  const signErrors = useMemo(() => {
    const e: string[] = [];
    if (!v.marinId) e.push("Sélectionnez le marin.");
    if (!v.examens.taille || !v.examens.poids || !v.examens.tension || !v.examens.pouls)
      e.push("Renseignez les constantes (taille, poids, tension, pouls).");
    if (ALL_QUESTIONS.some(([k]) => !v.stcw[k])) e.push("Répondez à tous les contrôles STCW.");
    if (v.stcw.couleurs && !v.stcw.dateTestCouleurs) e.push("Indiquez la date du test d'Ishihara.");
    if (!v.stcw.verdict) e.push("Indiquez le verdict d'aptitude.");
    if (v.stcw.verdict === "apte_restrictions" && !v.stcw.details.trim())
      e.push("Précisez les restrictions.");
    if (inapte && !v.stcw.details.trim()) e.push("Indiquez le motif de l'inaptitude.");
    if (v.stcw.verdict && !inapte) {
      if (!v.stcw.dateDelivrance || !v.stcw.validJusquau) e.push("Indiquez les dates de validité.");
      else {
        const max = addYears(v.stcw.dateDelivrance, mineur ? 1 : 2);
        if (v.stcw.validJusquau > max)
          e.push(`La validité ne peut excéder ${mineur ? "1 an (marin mineur)" : "2 ans"}.`);
        if (v.stcw.validJusquau <= v.stcw.dateDelivrance)
          e.push("L'échéance doit suivre la date de délivrance.");
      }
    }
    return e;
  }, [v, mineur, inapte]);

  const submit = (sign: boolean) => (e?: FormEvent) => {
    e?.preventDefault();
    if (!v.marinId) {
      setTried(true);
      return;
    }
    const clean: VisiteInput = inapte
      ? { ...v, stcw: { ...v.stcw, dateDelivrance: "", validJusquau: "" } }
      : v;
    if (sign) {
      setTried(true);
      if (signErrors.length) return;
      oublierBrouillon();
      onSubmit({ ...clean, signee: true, signataire });
    } else {
      oublierBrouillon();
      onSubmit({ ...clean, signee: false });
    }
  };

  const addRestriction = (r: string) => {
    const cur = v.stcw.details.trim();
    if (cur.includes(r)) return;
    st("details", cur ? `${cur.replace(/\.$/, "")}. ${r}.` : `${r}.`);
    if (r.includes("verres") && !v.stcw.aidesVisuelles) st("aidesVisuelles", "oui");
  };

  return (
    <form onSubmit={submit(false)} noValidate className="space-y-6">
      <Panel title="Marin examiné">
        <div className="grid gap-4 sm:grid-cols-[auto_1fr_1fr] sm:items-end">
          <MarinPhoto m={marin} className="hidden size-14 rounded-lg sm:grid" initials={!!marin} />
          <Field
            label="Marin"
            htmlFor="marin"
            required
            error={tried && !v.marinId ? "Sélectionnez le marin." : undefined}
          >
            <select
              id="marin"
              className={selectClass}
              value={v.marinId || ""}
              onChange={(e) => setV((s) => ({ ...s, marinId: Number(e.target.value) }))}
            >
              <option value="">Choisir un marin…</option>
              {eligibles.map((m) => (
                <option key={m.id} value={m.id}>
                  {fullName(m)} — {m.nip}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Médecin examinateur" htmlFor="praticien">
            <select
              id="praticien"
              className={selectClass}
              value={v.praticien}
              onChange={(e) => setV((s) => ({ ...s, praticien: e.target.value }))}
            >
              {PRATICIENS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
        </div>
        {marin && (
          <p className="mt-3 text-xs text-muted-foreground">
            {marin.profession} · {ageFrom(marin.dateNaissance) ?? "?"} ans ·{" "}
            {marin.entreprise || "sans armateur"}
            {mineur && (
              <span className="ml-2 font-semibold text-warning">
                Marin mineur : validité maximale 1 an.
              </span>
            )}
          </p>
        )}
      </Panel>

      {marin && (
        <Panel
          title={
            <span className="inline-flex items-center gap-2">
              <History className="size-4" /> Dossier médical & antécédents
            </span>
          }
          description="Consultation des visites précédentes du marin (confidentiel, non imprimé sur le certificat)."
        >
          {anciennes.length > 0 ? (
            <ul className="stagger mb-4 divide-y rounded-lg border">
              {anciennes.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-muted-foreground">{a.numero}</span>
                  <span className="tabular-nums">{formatDate(a.traiteLe)}</span>
                  <span className="font-medium">{VERDICT_LABELS[a.stcw.verdict]}</span>
                  {a.stcw.details && (
                    <span className="text-xs text-muted-foreground">— {a.stcw.details}</span>
                  )}
                  {a.examens.tension && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      TA {a.examens.tension}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">
              Première visite d'aptitude pour ce marin.
            </p>
          )}
          <Field label="Antécédents médicaux" htmlFor="antecedents">
            <textarea
              id="antecedents"
              value={v.antecedents ?? ""}
              onChange={(e) => setV((s) => ({ ...s, antecedents: e.target.value }))}
              className={textareaClass}
              placeholder="Pathologies, traitements en cours, chirurgies, allergies…"
            />
          </Field>
        </Panel>
      )}

      <Panel
        title="Examen clinique"
        description="Constantes biométriques — l'IMC est calculé automatiquement."
      >
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Field label="Taille (cm)" htmlFor="ex-taille">
            <input {...ex("taille")} inputMode="numeric" className={inputClass} />
          </Field>
          <Field label="Poids (kg)" htmlFor="ex-poids">
            <input {...ex("poids")} inputMode="decimal" className={inputClass} />
          </Field>
          <div className="space-y-1.5">
            <div className="text-sm font-medium">IMC</div>
            <div
              className="flex h-10 items-center gap-2 rounded-md bg-muted px-3 text-sm"
              aria-live="polite"
            >
              {bmi ? (
                <>
                  <span className="font-semibold tabular-nums">
                    {bmi.valeur.toLocaleString("fr-FR")}
                  </span>
                  <span className={cn("truncate text-xs", bmi.tone)}>{bmi.categorie}</span>
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>
          <Field label="Tension artérielle" htmlFor="ex-tension">
            <input {...ex("tension")} placeholder="12/8" className={inputClass} />
          </Field>
          <Field label="Pouls (bpm)" htmlFor="ex-pouls">
            <input {...ex("pouls")} inputMode="numeric" className={inputClass} />
          </Field>
          <Field label="ECG de repos" htmlFor="ex-ecg" className="sm:col-span-3 lg:col-span-5">
            <input
              {...ex("ecg")}
              placeholder="Normal, rythme sinusal régulier"
              className={inputClass}
            />
          </Field>
        </div>
      </Panel>

      <Panel
        title={
          <span className="inline-flex items-center gap-1.5">
            Contrôles sensoriels et aptitudes <Aide terme="stcw" />
          </span>
        }
        description={
          standard
            ? "Examen standard appliqué : ajustez uniquement les anomalies (lunettes, Ishihara…)."
            : "Section A-I/9 du Code STCW — normes minimales d'aptitude physique."
        }
        actions={
          <Button type="button" size="sm" variant="secondary" onClick={examenStandard}>
            <Sparkles /> Examen standard sans anomalie
          </Button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Bloc icon={Eye} title="Vision">
            <div className="mb-3 grid grid-cols-2 gap-3">
              <Field label="Acuité sans correction" htmlFor="ex-vision">
                <input {...ex("vision")} placeholder="10/10" className={inputClass} />
              </Field>
              <Field label="Acuité avec correction" htmlFor="ex-visionCorrigee">
                <input {...ex("visionCorrigee")} placeholder="10/10" className={inputClass} />
              </Field>
            </div>
            {questions(VISION)}
          </Bloc>
          <Bloc icon={Ear} title="Audition & communication">
            <Field label="Résultat de l'audiométrie" htmlFor="ex-audition" className="mb-3">
              <input {...ex("audition")} placeholder="Normale" className={inputClass} />
            </Field>
            {questions(AUDITION)}
          </Bloc>
          <Bloc icon={Palette} title="Perception des couleurs" aide="ishihara">
            {questions(COULEURS)}
            {v.stcw.couleurs && (
              <Field
                label="Date du test d'Ishihara"
                htmlFor="dateTestCouleurs"
                className="mt-3 max-w-xs"
              >
                <input
                  id="dateTestCouleurs"
                  type="date"
                  value={v.stcw.dateTestCouleurs}
                  onChange={(e) => st("dateTestCouleurs", e.target.value)}
                  className={inputClass}
                />
              </Field>
            )}
          </Bloc>
          <Bloc icon={ShieldCheck} title="Identité, veille et état général">
            {questions(APTITUDES)}
          </Bloc>
        </div>
      </Panel>

      <Panel title="Observations">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Observations cliniques" htmlFor="ex-observations">
            <textarea {...ex("observations")} className={textareaClass} />
          </Field>
          <Field label="Examens complémentaires" htmlFor="complementaires">
            <textarea
              id="complementaires"
              value={v.complementaires}
              onChange={(e) => setV((s) => ({ ...s, complementaires: e.target.value }))}
              className={textareaClass}
              placeholder="Glycémie, NFS, ECG…"
            />
          </Field>
          <Field label="Recommandations" htmlFor="recommandations">
            <textarea
              id="recommandations"
              value={v.recommandations}
              onChange={(e) => setV((s) => ({ ...s, recommandations: e.target.value }))}
              className={textareaClass}
            />
          </Field>
        </div>
      </Panel>

      <Panel
        title={
          <span className="inline-flex items-center gap-1.5">
            Décision d'aptitude & signature <Aide terme="aptitude" />
          </span>
        }
      >
        <div
          className="grid grid-cols-2 gap-2 lg:grid-cols-4"
          role="radiogroup"
          aria-label="Verdict d'aptitude"
        >
          {VERDICTS.map((o) => (
            <button
              key={o.v}
              type="button"
              role="radio"
              aria-checked={v.stcw.verdict === o.v}
              onClick={() => st("verdict", o.v)}
              className={cn(
                "rounded-lg border-2 px-3 py-2.5 text-left transition-colors",
                v.stcw.verdict === o.v
                  ? o.on
                  : "border-border text-muted-foreground hover:border-input",
                tried && !v.stcw.verdict && "border-destructive/50",
              )}
            >
              <span className="block font-display text-sm font-bold">{o.label}</span>
              <span className="block text-xs">{o.hint}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Field
              label={inapte ? "Motif de l'inaptitude" : "Restrictions / précisions"}
              htmlFor="details"
            >
              <textarea
                id="details"
                value={v.stcw.details}
                onChange={(e) => st("details", e.target.value)}
                className={textareaClass}
              />
            </Field>
            {v.stcw.verdict === "apte_restrictions" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {RESTRICTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => addRestriction(r)}
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:border-gold hover:text-primary"
                  >
                    <Plus className="size-3" /> {r}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!inapte && (
            <>
              <Field label="Date de délivrance" htmlFor="dateDelivrance">
                <input
                  id="dateDelivrance"
                  type="date"
                  value={v.stcw.dateDelivrance}
                  onChange={(e) =>
                    setV((s) => ({
                      ...s,
                      stcw: {
                        ...s.stcw,
                        dateDelivrance: e.target.value,
                        validJusquau: e.target.value
                          ? addYears(e.target.value, mineur ? 1 : 2)
                          : s.stcw.validJusquau,
                      },
                    }))
                  }
                  className={inputClass}
                />
              </Field>
              <Field
                label="Échéance"
                htmlFor="validJusquau"
                hint={`Calculée automatiquement : ${mineur ? "1 an (mineur)" : "2 ans maximum"}`}
              >
                <input
                  id="validJusquau"
                  type="date"
                  value={v.stcw.validJusquau}
                  onChange={(e) => st("validJusquau", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </>
          )}
        </div>
      </Panel>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:rounded-lg sm:border">
        <div className="flex-1 text-xs">
          {tried && signErrors.length > 0 ? (
            <ul className="list-disc pl-4 text-destructive">
              {signErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <HeartPulse className="size-3.5" />
              {canSign
                ? "La signature numérique valide le certificat et met à jour l'aptitude du marin."
                : "Saisie enregistrée en brouillon : seul le médecin agréé peut signer."}
            </span>
          )}
        </div>
        {sauve && (
          <span
            className="inline-flex items-center gap-1.5 self-start whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground sm:self-center"
            aria-live="polite"
          >
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            Brouillon sauvegardé à{" "}
            {new Date(sauve).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              oublierBrouillon();
              onCancel();
            }}
          >
            Annuler
          </Button>
          <Button type="submit" variant="outline">
            <Save /> Enregistrer le brouillon
          </Button>
          {canSign && (
            <Button type="button" variant="gold" onClick={submit(true)}>
              <FileSignature /> Signer le certificat
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
