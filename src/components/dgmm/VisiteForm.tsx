import { useMemo, useState, type FormEvent } from "react";
import { FileSignature, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Panel, inputClass, selectClass, textareaClass } from "@/components/dgmm/Page";
import { ageFrom } from "@/lib/dgmm/rules";
import {
  PRATICIENS,
  emptyStcw,
  fullName,
  type Marin,
  type OuiNon,
  type Stcw,
  type Visite,
} from "@/lib/dgmm/store";
import { cn } from "@/lib/utils";

export type VisiteInput = Omit<Visite, "id" | "numero" | "creeLe" | "traiteLe"> & { id?: number };

const STCW_QUESTIONS: [keyof Stcw, string][] = [
  ["identiteVerifiee", "Les documents d'identité ont été vérifiés sur le lieu de l'examen"],
  ["acuiteVisuelle", "L'acuité visuelle satisfait aux normes STCW (section A-I/9)"],
  ["auditiveSansAide", "L'acuité auditive satisfait aux normes sans prothèse"],
  ["acuiteAuditive", "L'acuité auditive satisfait aux normes de la section A-I/9"],
  ["couleurs", "La perception des couleurs est satisfaisante"],
  ["veille", "Apte au service de veille"],
  ["aidesVisuelles", "Port de lunettes ou de lentilles nécessaire"],
  [
    "exemptAffection",
    "Exempt de toute affection susceptible d'être aggravée par le service en mer ou de rendre le marin inapte",
  ],
];

function addYears(iso: string, n: number) {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + n);
  return d.toISOString().slice(0, 10);
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
  const [v, setV] = useState<VisiteInput>(initial);
  const [tried, setTried] = useState(false);
  const marin = marins.find((m) => m.id === v.marinId);
  const mineur = (ageFrom(marin?.dateNaissance) ?? 99) < 18;

  const ex = (k: keyof VisiteInput["examens"]) => ({
    id: `ex-${k}`,
    value: v.examens[k],
    onChange: (e: { target: { value: string } }) =>
      setV((s) => ({ ...s, examens: { ...s.examens, [k]: e.target.value } })),
  });
  const st = <K extends keyof Stcw>(k: K, val: Stcw[K]) =>
    setV((s) => ({ ...s, stcw: { ...s.stcw, [k]: val } }));

  const signErrors = useMemo(() => {
    const e: string[] = [];
    if (!v.marinId) e.push("Sélectionnez le marin.");
    if (STCW_QUESTIONS.some(([k]) => !v.stcw[k])) e.push("Répondez à toutes les questions STCW.");
    if (v.stcw.couleurs === "oui" && !v.stcw.dateTestCouleurs)
      e.push("Indiquez la date du test de perception des couleurs.");
    if (!v.stcw.verdict) e.push("Indiquez la décision d'aptitude.");
    if (v.stcw.verdict === "apte_restrictions" && !v.stcw.details.trim())
      e.push("Précisez les restrictions.");
    if (v.stcw.verdict !== "inapte") {
      if (!v.stcw.dateDelivrance || !v.stcw.validJusquau) e.push("Indiquez les dates de validité.");
      else {
        const max = addYears(v.stcw.dateDelivrance, mineur ? 1 : 2);
        if (v.stcw.validJusquau > max)
          e.push(
            `La validité ne peut excéder ${mineur ? "1 an (marin de moins de 18 ans)" : "2 ans"}.`,
          );
        if (v.stcw.validJusquau <= v.stcw.dateDelivrance)
          e.push("La date de fin doit suivre la date de délivrance.");
      }
    }
    return e;
  }, [v, mineur]);

  const submit = (sign: boolean) => (e?: FormEvent) => {
    e?.preventDefault();
    if (!v.marinId) {
      setTried(true);
      return;
    }
    if (sign) {
      setTried(true);
      if (signErrors.length) return;
      onSubmit({ ...v, signee: true, signataire });
    } else onSubmit({ ...v, signee: false });
  };

  return (
    <form onSubmit={submit(false)} noValidate className="space-y-6">
      <Panel title="Marin examiné">
        <div className="grid gap-4 sm:grid-cols-2">
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
              {marins
                .filter((m) => m.validationAdmin !== "rejetee")
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {fullName(m)} — {m.nip}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Praticien" htmlFor="praticien">
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
                Moins de 18 ans : validité maximale 1 an.
              </span>
            )}
          </p>
        )}
      </Panel>

      <Panel title="Examen clinique">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Taille (cm)" htmlFor="ex-taille">
            <input {...ex("taille")} inputMode="numeric" className={inputClass} />
          </Field>
          <Field label="Poids (kg)" htmlFor="ex-poids">
            <input {...ex("poids")} inputMode="numeric" className={inputClass} />
          </Field>
          <Field label="Tension" htmlFor="ex-tension">
            <input {...ex("tension")} placeholder="12/8" className={inputClass} />
          </Field>
          <Field label="Pouls (bpm)" htmlFor="ex-pouls">
            <input {...ex("pouls")} inputMode="numeric" className={inputClass} />
          </Field>
          <Field label="Vision" htmlFor="ex-vision">
            <input {...ex("vision")} placeholder="10/10" className={inputClass} />
          </Field>
          <Field label="Audition" htmlFor="ex-audition">
            <input {...ex("audition")} placeholder="Normale" className={inputClass} />
          </Field>
          <Field
            label="Observations"
            htmlFor="ex-observations"
            className="sm:col-span-3 lg:col-span-6"
          >
            <textarea {...ex("observations")} className={textareaClass} />
          </Field>
          <Field
            label="Examens complémentaires"
            htmlFor="complementaires"
            className="sm:col-span-3 lg:col-span-3"
          >
            <textarea
              id="complementaires"
              value={v.complementaires}
              onChange={(e) => setV((s) => ({ ...s, complementaires: e.target.value }))}
              className={textareaClass}
              placeholder="Glycémie, NFS, radiographie…"
            />
          </Field>
          <Field
            label="Recommandations"
            htmlFor="recommandations"
            className="sm:col-span-3 lg:col-span-3"
          >
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
        title="Certificat médical STCW"
        description="Convention STCW, règle I/9 — à renseigner par le médecin agréé."
      >
        <ul className="divide-y">
          {STCW_QUESTIONS.map(([k, label]) => (
            <li
              key={k}
              className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
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
                onChange={(o) =>
                  setV((s) => ({
                    ...s,
                    stcw: {
                      ...s.stcw,
                      [k]: o,
                      ...(k === "couleurs" && o === "oui" && !s.stcw.dateTestCouleurs
                        ? { dateTestCouleurs: new Date().toISOString().slice(0, 10) }
                        : {}),
                    },
                  }))
                }
                invalid={tried && !v.stcw[k]}
              />
            </li>
          ))}
        </ul>
        {v.stcw.couleurs === "oui" && (
          <Field
            label="Date du dernier test de perception des couleurs"
            htmlFor="dateTestCouleurs"
            className="mt-2 max-w-xs"
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

        <div className="mt-6 border-t pt-5">
          <div className="mb-2 text-sm font-medium">Décision d'aptitude</div>
          <div
            className="grid gap-2 sm:grid-cols-3"
            role="radiogroup"
            aria-label="Décision d'aptitude"
          >
            {(
              [
                ["apte", "Apte", "border-success bg-success/10 text-success"],
                [
                  "apte_restrictions",
                  "Apte avec restrictions",
                  "border-warning bg-warning/10 text-warning",
                ],
                ["inapte", "Inapte", "border-destructive bg-destructive/10 text-destructive"],
              ] as const
            ).map(([val, label, on]) => (
              <button
                key={val}
                type="button"
                role="radio"
                aria-checked={v.stcw.verdict === val}
                onClick={() => st("verdict", val)}
                className={cn(
                  "rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors",
                  v.stcw.verdict === val
                    ? on
                    : "border-border text-muted-foreground hover:border-input",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field
              label={v.stcw.verdict === "inapte" ? "Motif" : "Restrictions / précisions"}
              htmlFor="details"
              className="sm:col-span-3"
            >
              <textarea
                id="details"
                value={v.stcw.details}
                onChange={(e) => st("details", e.target.value)}
                className={textareaClass}
              />
            </Field>
            {v.stcw.verdict !== "inapte" && (
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
                  label="Valide jusqu'au"
                  htmlFor="validJusquau"
                  hint={`Maximum ${mineur ? "1 an" : "2 ans"}`}
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
            <span className="text-muted-foreground">
              {canSign
                ? "La signature valide le certificat et met à jour l'aptitude médicale du marin."
                : "Seul le médecin agréé peut signer le certificat."}
            </span>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
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
