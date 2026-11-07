import { Aide } from "@/components/dgmm/Aide";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { CheckCircle2, Rocket, Stethoscope } from "lucide-react";
import { EcranConnexion } from "@/components/dgmm/Accueil";
import { Field, Panel, inputClass, selectClass } from "@/components/dgmm/Page";
import { JaugeMdp, PasswordInput, PieceJointe } from "@/components/dgmm/FormExtras";
import { Sigle } from "@/components/dgmm/Sigle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACCOUNTS } from "@/lib/dgmm/auth";
import { telValide } from "@/lib/dgmm/registre";
import {
  DUREE_AGREMENT_ANS,
  PIECES_AGREMENT,
  STRUCTURES_MEDICALES,
  deposerDemandeAgrement,
  identifiantPris,
  type DemandeAgrement,
  type PieceAgrement,
} from "@/lib/dgmm/medecins";

export const Route = createFileRoute("/inscription/medecin")({
  head: () => ({ meta: [{ title: "Agrément médecin des gens de mer — DGMM" }] }),
  component: DemandeMedecin,
});

const ACCROCHE = "Seul un médecin assermenté par la DGMM peut examiner les gens de mer et signer leurs certificats d'aptitude STCW.";

function DemandeMedecin() {
  const [type, setType] = useState<"initiale" | "renouvellement">("initiale");
  const [f, setF] = useState({ ancienNumero: "", nom: "", prenom: "", onmg: "", structure: "", tel: "", email: "", identifiant: "", motDePasse: "", confirmation: "" });
  const [pieces, setPieces] = useState<Partial<Record<PieceAgrement, string>>>({});
  const [certifie, setCertifie] = useState(false);
  const [tente, setTente] = useState(false);
  const [erreur, setErreur] = useState("");
  const [fait, setFait] = useState<DemandeAgrement | null>(null);
  const up = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const ident = f.identifiant.trim().toLowerCase();
  const e: Partial<Record<keyof typeof f | PieceAgrement | "certifie", string>> = {};
  if (type === "renouvellement" && !/^AGM-\d{4}-\d{4}$/i.test(f.ancienNumero.trim())) e.ancienNumero = "Format attendu : AGM-AAAA-NNNN.";
  if (!f.nom.trim()) e.nom = "Indiquez votre nom.";
  if (!f.prenom.trim()) e.prenom = "Indiquez votre prénom.";
  if (!/^\d{3,5}-?[A-Z]{0,3}$/i.test(f.onmg.trim())) e.onmg = "Numéro d'inscription à l'Ordre, ex. 1422-GAB.";
  if (!f.structure) e.structure = "Choisissez votre structure de rattachement.";
  if (!telValide(f.tel)) e.tel = "Numéro gabonais (ex. 077 12 34 56) ou international (+…).";
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Adresse e-mail invalide.";
  (Object.keys(PIECES_AGREMENT) as PieceAgrement[]).forEach((p) => { if (PIECES_AGREMENT[p].obligatoire && !pieces[p]) e[p] = "Pièce obligatoire."; });
  if (!/^[a-z0-9._-]{4,}$/.test(ident)) e.identifiant = "4 caractères au moins : lettres, chiffres, point ou tiret.";
  else if (identifiantPris(ident, ACCOUNTS.map((a) => a.username))) e.identifiant = "Cet identifiant est déjà utilisé.";
  if (f.motDePasse.length < 8) e.motDePasse = "8 caractères au moins.";
  if (f.confirmation !== f.motDePasse) e.confirmation = "Les deux mots de passe sont différents.";
  if (!certifie) e.certifie = "Cochez la case pour confirmer.";
  const err = (k: keyof typeof e) => (tente ? e[k] : undefined);

  const envoyer = (ev: FormEvent) => {
    ev.preventDefault();
    setTente(true);
    if (Object.keys(e).length) return;
    const r = deposerDemandeAgrement({
      type, ancienNumero: type === "renouvellement" ? f.ancienNumero : undefined, nom: f.nom.trim().toUpperCase(), prenom: f.prenom.trim(), onmg: f.onmg.trim().toUpperCase(),
      structure: f.structure, tel: f.tel.trim(), email: f.email.trim(), identifiant: ident, motDePasse: f.motDePasse, pieces,
    });
    if (typeof r === "string") { setErreur(r); return; }
    setFait(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (fait) {
    return (
      <EcranConnexion profil="medical" titre="Agrément médecin des gens de mer" accroche={ACCROCHE}>
        <div className="mx-auto max-w-xl space-y-6">
          <div className="rounded-xl border border-success/40 bg-success/8 p-6 text-center">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h1 className="mt-3 font-display text-2xl font-bold text-primary">Demande transmise à la DGMM</h1>
            <p className="mt-1 text-sm text-muted-foreground">Numéro de suivi :</p>
            <div className="mx-auto mt-3 inline-block rounded-lg bg-primary px-5 py-2 font-mono text-xl font-bold text-gold">{fait.numero}</div>
          </div>
          <Panel title="Et ensuite ?">
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>Le responsable RH de la DGMM contrôle vos diplômes et votre inscription à l'Ordre.</li>
              <li>Le Directeur des Gens de Mer vous assermente : vous recevez votre numéro d'agrément, valable {DUREE_AGREMENT_ANS} ans.</li>
              <li>Vous vous connectez ensuite à l'espace médical avec l'identifiant <strong className="font-mono">{fait.identifiant}</strong>.</li>
            </ol>
          </Panel>
          <div className="text-center"><Link to="/" search={{ profil: "medical" }} className="text-sm font-semibold text-primary hover:underline">Aller à l'espace médical</Link></div>
        </div>
      </EcranConnexion>
    );
  }

  return (
    <EcranConnexion profil="medical" titre="Agrément médecin des gens de mer" accroche={ACCROCHE} large>
      <div className="mb-6 max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Médecins</div>
        <h1 className="mt-1 font-display text-3xl font-bold text-primary">Demande d'agrément et d'assermentation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Première demande ou renouvellement de votre agrément de médecin des gens de mer (<Sigle s="STCW" />). L'agrément est délivré par la <Sigle s="DGMM" /> pour {DUREE_AGREMENT_ANS} ans. <Aide terme="agrement" />
        </p>
      </div>
      <form onSubmit={envoyer} noValidate className="space-y-6">
        <Panel title="1. Nature de la demande">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type de demande">
            {(["initiale", "renouvellement"] as const).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={type === t} onClick={() => setType(t)} className={cn("rounded-full border px-4 py-2 text-sm font-semibold", type === t ? "border-gold bg-gold text-gold-foreground" : "hover:border-gold")}>
                {t === "initiale" ? "Première demande d'assermentation" : `Renouvellement de l'agrément (${DUREE_AGREMENT_ANS} ans)`}
              </button>
            ))}
          </div>
          {type === "renouvellement" && (
            <Field label="Ancien numéro d'agrément" htmlFor="ancienNumero" required error={err("ancienNumero")} className="mt-4 max-w-xs">
              <input id="ancienNumero" className={cn(inputClass, "font-mono uppercase")} value={f.ancienNumero} onChange={(x) => up("ancienNumero", x.target.value)} placeholder="AGM-2023-0003" />
            </Field>
          )}
        </Panel>

        <Panel title={<span className="inline-flex items-center gap-2"><Stethoscope className="size-4 text-secondary" /> 2. Identité du praticien</span>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" htmlFor="nom" required error={err("nom")}><input id="nom" className={cn(inputClass, "uppercase")} value={f.nom} onChange={(x) => up("nom", x.target.value)} autoComplete="family-name" /></Field>
            <Field label="Prénom" htmlFor="prenom" required error={err("prenom")}><input id="prenom" className={inputClass} value={f.prenom} onChange={(x) => up("prenom", x.target.value)} autoComplete="given-name" /></Field>
            <Field label="N° d'inscription à l'Ordre des médecins" htmlFor="onmg" required error={err("onmg")}><input id="onmg" className={cn(inputClass, "font-mono uppercase")} value={f.onmg} onChange={(x) => up("onmg", x.target.value)} placeholder="1422-GAB" /></Field>
            <Field label="Structure de rattachement" htmlFor="structure" required error={err("structure")}>
              <select id="structure" className={selectClass} value={f.structure} onChange={(x) => up("structure", x.target.value)}>
                <option value="">Choisir…</option>
                {STRUCTURES_MEDICALES.map((s) => <option key={s.code} value={s.code}>{s.nom} — {s.ville}</option>)}
              </select>
            </Field>
            <Field label="Téléphone" htmlFor="tel" required error={err("tel")}><input id="tel" type="tel" className={inputClass} value={f.tel} onChange={(x) => up("tel", x.target.value)} autoComplete="tel" /></Field>
            <Field label="E-mail" htmlFor="email" required error={err("email")}><input id="email" type="email" className={inputClass} value={f.email} onChange={(x) => up("email", x.target.value)} autoComplete="email" /></Field>
          </div>
        </Panel>

        <Panel title="3. Pièces justificatives" description="PDF uniquement, 450 Ko au plus par fichier.">
          <div className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(PIECES_AGREMENT) as PieceAgrement[]).map((p) => (
              <PieceJointe key={p} id={`piece-${p}`} label={PIECES_AGREMENT[p].titre} required={PIECES_AGREMENT[p].obligatoire} accept="application/pdf" maxKo={450} fichier={pieces[p] ?? ""} onChange={(n) => setPieces((s) => ({ ...s, [p]: n || undefined }))} error={err(p)} />
            ))}
          </div>
        </Panel>

        <Panel title="4. Identifiants de l'espace médical" description="Le compte n'est activé qu'après l'assermentation.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Identifiant souhaité" htmlFor="identifiant" required error={err("identifiant")}><input id="identifiant" className={inputClass} value={f.identifiant} onChange={(x) => up("identifiant", x.target.value)} autoComplete="username" /></Field>
            <Field label="Mot de passe" htmlFor="motDePasse" required error={err("motDePasse")}><PasswordInput id="motDePasse" value={f.motDePasse} onChange={(v) => up("motDePasse", v)} /><JaugeMdp value={f.motDePasse} /></Field>
            <Field label="Confirmation" htmlFor="confirmation" required error={err("confirmation")}><PasswordInput id="confirmation" value={f.confirmation} onChange={(v) => up("confirmation", v)} /></Field>
          </div>
        </Panel>

        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input id="certifie" type="checkbox" className="mt-1" checked={certifie} onChange={(x) => setCertifie(x.target.checked)} />
            <span>Je certifie l'exactitude des informations et l'authenticité des pièces jointes.</span>
          </label>
          {err("certifie") && <p className="text-xs text-destructive">{err("certifie")}</p>}
          {tente && Object.keys(e).length > 0 && <p className="text-sm text-destructive">{Object.keys(e).length} point(s) à corriger avant l'envoi.</p>}
          {erreur && <p className="text-sm font-medium text-destructive">{erreur}</p>}
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" variant="gold" size="lg"><Rocket /> Soumettre la demande</Button>
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary">Annuler</Link>
          </div>
        </div>
      </form>
    </EcranConnexion>
  );
}
