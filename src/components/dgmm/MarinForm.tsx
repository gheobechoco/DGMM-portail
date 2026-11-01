import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck2,
  Paperclip,
  Save,
  User,
  X,
  ScanFace,
  PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Panel, inputClass, selectClass } from "@/components/dgmm/Page";
import {
  DOC_LABELS,
  ENTREPRISES,
  NATIONALITES,
  QUARTIERS,
  QUARTIERS_RESIDENCE,
  parseDoc,
  type DocKey,
  type Marin,
} from "@/lib/dgmm/store";
import { cn } from "@/lib/utils";
import { Aide } from "@/components/dgmm/Aide";
import { SignaturePad } from "@/components/dgmm/SignaturePad";
import { STATIONS } from "@/lib/dgmm/maritime";

export type MarinInput = Omit<
  Marin,
  | "id"
  | "nip"
  | "login"
  | "mdp"
  | "creeLe"
  | "modifieLe"
  | "creePar"
  | "livret"
  | "validationAdmin"
  | "validationMedicale"
  | "historique"
>;

export const PROFESSIONS = [
  "Capitaine",
  "Officier pont",
  "Officier radio",
  "Chef mécanicien",
  "Mécanicien",
  "Maître d'équipage",
  "Matelot",
  "Pilote",
  "Cuisinier de bord",
  "Hôtesse de bord",
  "Élève officier",
];
const SITUATIONS = ["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf / veuve"];
/** Pièces demandées à l'enrôlement (le certificat d'aptitude est produit par la visite médicale). */
const FORM_DOCS: DocKey[] = ["photo", "piece", "contrat", "residence", "livret"];

export function emptyMarin(): MarinInput {
  return {
    nom: "",
    prenom: "",
    sexe: "",
    dateNaissance: "",
    profession: "",
    nationalite: "Gabonaise",
    entreprise: "",
    tel1: "",
    tel2: "",
    quartier: "",
    email: "",
    signeParticulier: "",
    couleurYeux: "",
    couleurCheveux: "",
    taille: "",
    quartierInscription: "",
    dateMariage: "",
    lieuMariage: "",
    situationMatrimoniale: "",
    station: "",
    documents: {},
  };
}

function toInput(m: Marin): MarinInput {
  const {
    id: _i,
    nip: _n,
    login: _l,
    mdp: _m,
    creeLe: _c,
    modifieLe: _mo,
    creePar: _cp,
    livret: _lv,
    validationAdmin: _va,
    validationMedicale: _vm,
    historique: _h,
    ...rest
  } = m;
  return rest;
}

type Errors = Partial<Record<keyof MarinInput, string>>;
const VOLET1: (keyof MarinInput)[] = [
  "station",
  "nom",
  "prenom",
  "sexe",
  "dateNaissance",
  "nationalite",
  "tel1",
  "tel2",
  "email",
  "profession",
];

function validate(v: MarinInput): Errors {
  const e: Errors = {};
  if (!v.nom.trim()) e.nom = "Le nom est obligatoire.";
  if (!v.prenom.trim()) e.prenom = "Le prénom est obligatoire.";
  if (!v.sexe) e.sexe = "Précisez le sexe.";
  if (!v.dateNaissance) e.dateNaissance = "La date de naissance est obligatoire.";
  else {
    const age = (Date.now() - new Date(v.dateNaissance).getTime()) / (365.25 * 86400000);
    if (age < 16) e.dateNaissance = "Le marin doit avoir au moins 16 ans.";
    if (age > 80) e.dateNaissance = "Vérifiez la date de naissance.";
  }
  if (!v.profession) e.profession = "Choisissez une profession.";
  if (!v.station) e.station = "Assignez une station maritime d'attache.";
  if (!v.nationalite) e.nationalite = "Choisissez une nationalité.";
  if (!/^0\d{7,8}$/.test(v.tel1.replace(/\s/g, "")))
    e.tel1 = "Numéro gabonais attendu (ex. 077 45 20 17).";
  if (v.tel2 && !/^0\d{7,8}$/.test(v.tel2.replace(/\s/g, ""))) e.tel2 = "Numéro invalide.";
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = "Adresse e-mail invalide.";
  if (v.poids && (Number(v.poids) < 35 || Number(v.poids) > 200))
    e.poids = "Poids en kg (35 à 200).";
  if (!v.signeParticulier?.trim())
    e.signeParticulier = "Indiquez les signes particuliers, ou « Néant ».";
  if (v.taille && (Number(v.taille) < 120 || Number(v.taille) > 230))
    e.taille = "Taille en cm (120 à 230).";
  return e;
}

/**
 * Recadre automatiquement la photo au format passeport OMI (35 × 45 mm, ratio 7:9),
 * centrée sur le haut du cliché (visage), et la réduit à 280 × 360 px.
 */
function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = 35 / 45;
      let sw = img.width;
      let sh = img.height;
      if (sw / sh > ratio) sw = sh * ratio;
      else sh = sw / ratio;
      const sx = (img.width - sw) / 2;
      const sy = Math.max(0, (img.height - sh) * 0.25);
      const c = document.createElement("canvas");
      c.width = 280;
      c.height = 360;
      c.getContext("2d")?.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/** Conserve le contenu des petites pièces (≤ 700 Ko) pour la visionneuse intégrée. */
function readDoc(file: File): Promise<string> {
  if (file.size > 700_000) return Promise.resolve(file.name);
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(`${file.name}::${String(r.result)}`);
    r.onerror = () => resolve(file.name);
    r.readAsDataURL(file);
  });
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function Stepper({ step, onStep }: { step: 1 | 2; onStep: (s: 1 | 2) => void }) {
  const steps = [
    { n: 1 as const, t: "État civil & contact", d: "Identité, coordonnées, profession" },
    {
      n: 2 as const,
      t: "Description, signature & documents",
      d: "Description physique, photo, signature, pièces jointes",
    },
  ];
  return (
    <ol className="mb-6 grid gap-2 sm:grid-cols-2" aria-label="Étapes de l'enrôlement">
      {steps.map((s) => {
        const done = step > s.n;
        const active = step === s.n;
        return (
          <li key={s.n}>
            <button
              type="button"
              onClick={() => s.n < step && onStep(s.n)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors",
                active && "border-gold shadow-card",
                done && "hover:bg-muted/50",
                !active && !done && "opacity-70",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full font-display text-sm font-bold",
                  done
                    ? "bg-secondary text-secondary-foreground"
                    : active
                      ? "bg-gold text-gold-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" /> : s.n}
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Volet {s.n}
                </span>
                <span className="block truncate text-sm font-semibold text-primary">{s.t}</span>
                <span className="hidden truncate text-xs text-muted-foreground sm:block">
                  {s.d}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function MarinForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: Marin | undefined;
  onSubmit: (v: MarinInput) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [v, setV] = useState<MarinInput>(() => (initial ? toInput(initial) : emptyMarin()));
  const [step, setStep] = useState<1 | 2>(1);
  const [touched, setTouched] = useState<{ 1: boolean; 2: boolean }>({ 1: false, 2: false });
  const [vus, setVus] = useState<Set<keyof MarinInput>>(() => new Set());
  const all = validate(v);
  const errors: Errors = {};
  (Object.keys(all) as (keyof MarinInput)[]).forEach((k) => {
    const volet = VOLET1.includes(k) ? 1 : 2;
    const msg = all[k];
    if ((touched[volet] || vus.has(k)) && msg) errors[k] = msg;
  });
  /** Champ quitté, renseigné et conforme : coche verte immédiate. */
  const ok = (k: keyof MarinInput) => vus.has(k) && !all[k] && !!(v[k] as string | undefined);

  const up = <K extends keyof MarinInput>(k: K, val: MarinInput[K]) =>
    setV((s) => ({ ...s, [k]: val }));
  const text = (k: keyof MarinInput) => ({
    id: k,
    value: (v[k] as string | undefined) ?? "",
    onChange: (e: { target: { value: string } }) => up(k, e.target.value as never),
    onBlur: () => setVus((x) => (x.has(k) ? x : new Set(x).add(k))),
    "aria-invalid": errors[k] ? true : undefined,
  });

  const focusFirst = (keys: (keyof MarinInput)[]) => {
    const first = keys.find((k) => all[k]);
    if (first) document.getElementById(first)?.focus();
  };

  const next = () => {
    setTouched((t) => ({ ...t, 1: true }));
    if (VOLET1.some((k) => all[k])) return focusFirst(VOLET1);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = () => {
    setTouched({ 1: true, 2: true });
    if (VOLET1.some((k) => all[k])) {
      setStep(1);
      return;
    }
    if (Object.keys(all).length) return focusFirst(Object.keys(all) as (keyof MarinInput)[]);
    onSubmit({ ...v, nom: v.nom.trim().toUpperCase(), prenom: v.prenom.trim() });
  };

  const marie = v.situationMatrimoniale === "Marié(e)";
  const nbErr = Object.keys(errors).length;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (step === 1) next();
        else submit();
      }}
    >
      <Stepper step={step} onStep={setStep} />

      {step === 1 ? (
        <div className="space-y-6">
          <Panel title="Identité" description="Informations d'état civil du marin.">
            <Grid>
              <Field
                label="NIP"
                aide="nip"
                htmlFor="nip"
                hint={initial ? undefined : "Attribué automatiquement à l'enregistrement."}
              >
                <input
                  id="nip"
                  readOnly
                  value={initial?.nip ?? "—"}
                  className={cn(inputClass, "bg-muted font-mono text-muted-foreground")}
                />
              </Field>
              <Field label="Nom" htmlFor="nom" required error={errors.nom} valid={ok("nom")}>
                <input
                  {...text("nom")}
                  className={`${inputClass} uppercase`}
                  autoComplete="family-name"
                />
              </Field>
              <Field
                label="Prénom(s)"
                htmlFor="prenom"
                required
                error={errors.prenom}
                valid={ok("prenom")}
              >
                <input {...text("prenom")} className={inputClass} autoComplete="given-name" />
              </Field>
              <Field label="Sexe" htmlFor="sexe" required error={errors.sexe} valid={ok("sexe")}>
                <select {...text("sexe")} className={selectClass}>
                  <option value="">Choisir…</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </Field>
              <Field
                label="Date de naissance"
                htmlFor="dateNaissance"
                required
                error={errors.dateNaissance}
                valid={ok("dateNaissance")}
              >
                <input {...text("dateNaissance")} type="date" className={inputClass} />
              </Field>
              <Field
                label="Nationalité"
                htmlFor="nationalite"
                required
                error={errors.nationalite}
                valid={ok("nationalite")}
              >
                <select {...text("nationalite")} className={selectClass}>
                  {NATIONALITES.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </Field>
            </Grid>
          </Panel>

          <Panel title="Contact">
            <Grid>
              <Field
                label="Téléphone principal"
                htmlFor="tel1"
                required
                error={errors.tel1}
                valid={ok("tel1")}
              >
                <input
                  {...text("tel1")}
                  type="tel"
                  inputMode="tel"
                  placeholder="077 45 20 17"
                  className={inputClass}
                  autoComplete="tel"
                />
              </Field>
              <Field
                label="Téléphone secondaire"
                htmlFor="tel2"
                error={errors.tel2}
                valid={ok("tel2")}
              >
                <input {...text("tel2")} type="tel" inputMode="tel" className={inputClass} />
              </Field>
              <Field label="E-mail" htmlFor="email" error={errors.email} valid={ok("email")}>
                <input
                  {...text("email")}
                  type="email"
                  className={inputClass}
                  autoComplete="email"
                />
              </Field>
              <Field label="Quartier de résidence" htmlFor="quartier">
                <select {...text("quartier")} className={selectClass}>
                  <option value="">Choisir…</option>
                  {QUARTIERS_RESIDENCE.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </Field>
            </Grid>
          </Panel>

          <Panel title="Activité maritime">
            <Grid>
              <Field
                label="Profession"
                htmlFor="profession"
                required
                error={errors.profession}
                valid={ok("profession")}
              >
                <select {...text("profession")} className={selectClass}>
                  <option value="">Choisir…</option>
                  {PROFESSIONS.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </Field>
              <Field label="Entreprise maritime / armateur" htmlFor="entreprise">
                <select {...text("entreprise")} className={selectClass}>
                  <option value="">Aucune</option>
                  {ENTREPRISES.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="Quartier maritime d'inscription"
                htmlFor="quartierInscription"
                hint="Requis pour le livret"
              >
                <select {...text("quartierInscription")} className={selectClass}>
                  <option value="">Choisir…</option>
                  {QUARTIERS.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="Station maritime d'attache"
                htmlFor="station"
                required
                error={errors.station}
                valid={ok("station")}
                className="sm:col-span-2 lg:col-span-3"
              >
                <select {...text("station")} className={selectClass}>
                  <option value="">Choisir la station…</option>
                  {STATIONS.map((st) => (
                    <option key={st.code} value={st.code}>
                      {st.nom} — {st.type} ({st.province})
                    </option>
                  ))}
                </select>
              </Field>
            </Grid>
          </Panel>
        </div>
      ) : (
        <div className="space-y-6">
          <Panel
            title={
              <span className="inline-flex items-center gap-1.5">
                Description physique & signes particuliers <Aide terme="description" />
              </span>
            }
            description="Figure sur le livret maritime et la fiche d'aptitude médicale."
          >
            <Grid>
              <Field
                label="Taille (cm)"
                htmlFor="taille"
                error={errors.taille}
                valid={ok("taille")}
              >
                <input
                  {...text("taille")}
                  type="number"
                  inputMode="numeric"
                  min={120}
                  max={230}
                  className={inputClass}
                />
              </Field>
              <Field label="Poids (kg)" htmlFor="poids" error={errors.poids} valid={ok("poids")}>
                <input
                  {...text("poids")}
                  type="number"
                  inputMode="numeric"
                  min={35}
                  max={200}
                  className={inputClass}
                />
              </Field>
              <Field label="Couleur des yeux" htmlFor="couleurYeux">
                <select {...text("couleurYeux")} className={selectClass}>
                  <option value="">Choisir…</option>
                  {["Noir", "Marron", "Noisette", "Vert", "Bleu"].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </Field>
              <Field label="Couleur des cheveux" htmlFor="couleurCheveux">
                <select {...text("couleurCheveux")} className={selectClass}>
                  <option value="">Choisir…</option>
                  {["Noir", "Brun", "Châtain", "Gris", "Blanc", "Chauve"].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="Signes particuliers"
                htmlFor="signeParticulier"
                required
                error={errors.signeParticulier}
                valid={ok("signeParticulier")}
                hint="Section obligatoire : cicatrices visibles, tatouages, amputations, taches de naissance — ou « Néant »."
                className="sm:col-span-2 lg:col-span-3"
              >
                <input
                  {...text("signeParticulier")}
                  placeholder="Ex. cicatrice de 3 cm à l'avant-bras gauche, tatouage d'ancre épaule droite… ou Néant"
                  className={inputClass}
                />
              </Field>
            </Grid>
          </Panel>

          <Panel
            title={
              <span className="inline-flex items-center gap-1.5">
                Photo et signature du titulaire <Aide terme="identification" />
              </span>
            }
            description="Photo d'identité au format passeport et signature tracée à l'écran : reportées sur le livret maritime."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                  <ScanFace className="size-4" /> Photo d'identité
                </div>
                {v.documents.photo?.startsWith("data:") ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={v.documents.photo}
                      alt="Photo d'identité"
                      className="h-20 w-[62px] rounded-md border object-cover"
                    />
                    <p className="text-xs text-success">Recadrée au format passeport 35 × 45 mm.</p>
                  </div>
                ) : v.documents.photo ? (
                  <p className="text-xs text-success">Photo d'identité enregistrée.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    À joindre dans les pièces justificatives ci-dessous (« Photo d'identité »).
                  </p>
                )}
              </div>
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                  <PenLine className="size-4" /> Signature du titulaire
                </div>
                <SignaturePad value={v.signature} onChange={(sig) => up("signature", sig)} />
              </div>
            </div>
          </Panel>

          <Panel title="Situation matrimoniale">
            <Grid>
              <Field label="Situation" htmlFor="situationMatrimoniale">
                <select {...text("situationMatrimoniale")} className={selectClass}>
                  <option value="">Choisir…</option>
                  {SITUATIONS.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </Field>
              {marie && (
                <>
                  <Field label="Date de mariage" htmlFor="dateMariage">
                    <input {...text("dateMariage")} type="date" className={inputClass} />
                  </Field>
                  <Field label="Lieu de mariage" htmlFor="lieuMariage">
                    <input {...text("lieuMariage")} className={inputClass} />
                  </Field>
                </>
              )}
            </Grid>
          </Panel>

          <Panel
            title="Pièces justificatives"
            description="Téléversement sécurisé — PDF, JPG ou PNG. Photo et CNI/Passeport requises pour le livret."
          >
            <ul className="grid gap-3 sm:grid-cols-2">
              {FORM_DOCS.map((k) => {
                const file = v.documents[k];
                const isPhoto = k === "photo" && file?.startsWith("data:");
                return (
                  <li key={k} className="flex items-center gap-3 rounded-lg border p-3">
                    {isPhoto ? (
                      <img
                        src={file}
                        alt="Photo d'identité"
                        className="size-12 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <span
                        className={cn(
                          "grid size-12 shrink-0 place-items-center rounded-md",
                          file ? "bg-success/12 text-success" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {k === "photo" && !file ? (
                          <User className="size-5" />
                        ) : file ? (
                          <FileCheck2 className="size-5" />
                        ) : (
                          <Paperclip className="size-5" />
                        )}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {DOC_LABELS[k]}
                        {(k === "photo" || k === "piece") && (
                          <span className="ml-0.5 text-destructive">*</span>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {isPhoto
                          ? "Photo recadrée au format passeport (35×45)"
                          : (parseDoc(file)?.nom ?? "Aucun fichier")}
                      </div>
                    </div>
                    {file ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const { [k]: _removed, ...rest } = v.documents;
                          up("documents", rest);
                        }}
                        aria-label={`Retirer ${DOC_LABELS[k]}`}
                      >
                        <X />
                      </Button>
                    ) : (
                      <label className="cursor-pointer rounded-md border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-muted">
                        Joindre
                        <input
                          type="file"
                          accept={k === "photo" ? "image/*" : ".pdf,.jpg,.jpeg,.png"}
                          className="sr-only"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const val =
                              k === "photo" && f.type.startsWith("image/")
                                ? await readPhoto(f).catch(() => f.name)
                                : await readDoc(f);
                            setV((s) => ({ ...s, documents: { ...s.documents, [k]: val } }));
                          }}
                        />
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 mt-6 flex flex-wrap items-center justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
        {nbErr > 0 && (
          <p className="mr-auto text-xs text-destructive">{nbErr} champ(s) à corriger.</p>
        )}
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        {step === 2 && (
          <Button type="button" variant="outline" onClick={() => setStep(1)}>
            <ArrowLeft /> Volet 1
          </Button>
        )}
        {step === 1 ? (
          <Button type="submit" variant="gold">
            Volet 2 : description, signature & documents <ArrowRight />
          </Button>
        ) : (
          <Button type="submit" variant="gold">
            <Save /> {submitLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
