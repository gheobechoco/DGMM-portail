import { useState, type FormEvent, type ReactNode } from "react";
import { FileCheck2, Paperclip, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Panel, inputClass, selectClass } from "@/components/dgmm/Page";
import {
  DOC_LABELS,
  ENTREPRISES,
  NATIONALITES,
  QUARTIERS,
  QUARTIERS_RESIDENCE,
  type DocKey,
  type Marin,
} from "@/lib/dgmm/store";

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
    ...rest
  } = m;
  return rest;
}

type Errors = Partial<Record<keyof MarinInput, string>>;

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
  if (!v.profession) e.profession = "Choisissez une fonction.";
  if (!v.nationalite) e.nationalite = "Choisissez une nationalité.";
  if (!/^0\d{7,8}$/.test(v.tel1.replace(/\s/g, "")))
    e.tel1 = "Numéro gabonais attendu (ex. 077 45 20 17).";
  if (v.tel2 && !/^0\d{7,8}$/.test(v.tel2.replace(/\s/g, ""))) e.tel2 = "Numéro invalide.";
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = "Adresse e-mail invalide.";
  if (v.taille && (Number(v.taille) < 120 || Number(v.taille) > 230))
    e.taille = "Taille en cm (120 à 230).";
  return e;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string | undefined;
  children: ReactNode;
}) {
  return (
    <Panel title={title} description={description}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </Panel>
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
  const [touched, setTouched] = useState(false);
  const errors = touched ? validate(v) : {};

  const up = <K extends keyof MarinInput>(k: K, val: MarinInput[K]) =>
    setV((s) => ({ ...s, [k]: val }));
  const text = (k: keyof MarinInput) => ({
    id: k,
    value: v[k] as string,
    onChange: (e: { target: { value: string } }) => up(k, e.target.value as never),
    "aria-invalid": errors[k] ? true : undefined,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const errs = validate(v);
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      document.getElementById(first!)?.focus();
      return;
    }
    onSubmit({ ...v, nom: v.nom.trim().toUpperCase(), prenom: v.prenom.trim() });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Section title="Identité" description="Informations d'état civil du marin.">
        <Field label="Nom" htmlFor="nom" required error={errors.nom}>
          <input
            {...text("nom")}
            className={`${inputClass} uppercase`}
            autoComplete="family-name"
          />
        </Field>
        <Field label="Prénom(s)" htmlFor="prenom" required error={errors.prenom}>
          <input {...text("prenom")} className={inputClass} autoComplete="given-name" />
        </Field>
        <Field label="Sexe" htmlFor="sexe" required error={errors.sexe}>
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
        >
          <input {...text("dateNaissance")} type="date" className={inputClass} />
        </Field>
        <Field label="Nationalité" htmlFor="nationalite" required error={errors.nationalite}>
          <select {...text("nationalite")} className={selectClass}>
            {NATIONALITES.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </Field>
        <Field label="Quartier de résidence" htmlFor="quartier">
          <select {...text("quartier")} className={selectClass}>
            <option value="">Choisir…</option>
            {QUARTIERS_RESIDENCE.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </Field>
        <Field label="Date de mariage" htmlFor="dateMariage" hint="Facultatif">
          <input {...text("dateMariage")} type="date" className={inputClass} />
        </Field>
        <Field label="Lieu de mariage" htmlFor="lieuMariage" hint="Facultatif">
          <input {...text("lieuMariage")} className={inputClass} />
        </Field>
      </Section>

      <Section title="Coordonnées">
        <Field label="Téléphone principal" htmlFor="tel1" required error={errors.tel1}>
          <input
            {...text("tel1")}
            type="tel"
            inputMode="tel"
            placeholder="077 45 20 17"
            className={inputClass}
            autoComplete="tel"
          />
        </Field>
        <Field label="Téléphone secondaire" htmlFor="tel2" error={errors.tel2}>
          <input {...text("tel2")} type="tel" inputMode="tel" className={inputClass} />
        </Field>
        <Field label="E-mail" htmlFor="email" error={errors.email}>
          <input {...text("email")} type="email" className={inputClass} autoComplete="email" />
        </Field>
      </Section>

      <Section title="Situation maritime">
        <Field label="Fonction à bord" htmlFor="profession" required error={errors.profession}>
          <select {...text("profession")} className={selectClass}>
            <option value="">Choisir…</option>
            {PROFESSIONS.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </Field>
        <Field label="Armateur / entreprise" htmlFor="entreprise">
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
      </Section>

      <Section title="Signalement" description="Ces informations figurent sur le livret maritime.">
        <Field label="Taille (cm)" htmlFor="taille" error={errors.taille}>
          <input
            {...text("taille")}
            type="number"
            inputMode="numeric"
            min={120}
            max={230}
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
          label="Signe particulier"
          htmlFor="signeParticulier"
          className="sm:col-span-2 lg:col-span-3"
        >
          <input {...text("signeParticulier")} placeholder="Néant" className={inputClass} />
        </Field>
      </Section>

      <Panel
        title="Pièces justificatives"
        description="PDF, JPG ou PNG. La photo et la pièce d'identité sont requises pour le livret."
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(DOC_LABELS) as DocKey[]).map((k) => {
            const file = v.documents[k];
            return (
              <li key={k} className="flex items-center gap-3 rounded-lg border p-3">
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-md ${file ? "bg-success/12 text-success" : "bg-muted text-muted-foreground"}`}
                >
                  {file ? <FileCheck2 className="size-4" /> : <Paperclip className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{DOC_LABELS[k]}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {file ?? "Aucun fichier"}
                  </div>
                </div>
                {file ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => up("documents", { ...v.documents, [k]: undefined })}
                    aria-label={`Retirer ${DOC_LABELS[k]}`}
                  >
                    <X />
                  </Button>
                ) : (
                  <label className="cursor-pointer rounded-md border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-muted">
                    Joindre
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) up("documents", { ...v.documents, [k]: f.name });
                      }}
                    />
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
        {touched && Object.keys(errors).length > 0 && (
          <p className="mr-auto self-center text-xs text-destructive">
            {Object.keys(errors).length} champ(s) à corriger.
          </p>
        )}
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="gold">
          <Save /> {submitLabel}
        </Button>
      </div>
    </form>
  );
}
