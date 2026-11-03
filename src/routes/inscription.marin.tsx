import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { CalendarCheck2, CheckCircle2, ClipboardList, MapPin, Stethoscope, UserRound } from "lucide-react";
import { EcranConnexion } from "@/components/dgmm/Accueil";
import { Field, Panel, inputClass, selectClass } from "@/components/dgmm/Page";
import { Sigle } from "@/components/dgmm/Sigle";
import { Button } from "@/components/ui/button";
import { PROFESSIONS } from "@/components/dgmm/MarinForm";
import { STATIONS } from "@/lib/dgmm/maritime";
import { ENTREPRISES_CHOIX, NATIONALITES } from "@/lib/dgmm/store";
import { deposerPreInscription, type PreInscription } from "@/lib/dgmm/inscriptions";

export const Route = createFileRoute("/inscription/marin")({
  head: () => ({ meta: [{ title: "Pré-inscription marin — DGMM" }] }),
  component: PreInscriptionMarin,
});

const PIECES = [
  "Pièce d'identité (CNI ou passeport) en cours de validité",
  "Acte de naissance",
  "Extrait de casier judiciaire",
  "Diplômes ou certificats de formation maritime (STCW)",
  "Deux photos d'identité récentes",
];

const ETAPES = [
  { icon: Stethoscope, titre: "Visite médicale d'aptitude", texte: "Chez le Médecin des Gens de Mer, avec le test d'Ishihara." },
  { icon: ClipboardList, titre: "Dépôt des pièces", texte: "À la station choisie, auprès de l'agent de la Marine marchande." },
  { icon: UserRound, titre: "Photo et signature", texte: "Prises sur place par l'agent, le jour du rendez-vous." },
  { icon: CheckCircle2, titre: "Visa et fascicule", texte: "Après validation du Directeur des Gens de Mer." },
];

type Form = Omit<PreInscription, "id" | "numero" | "creeLe" | "statut">;
const VIDE: Form = {
  nom: "", prenom: "", sexe: "", dateNaissance: "", nationalite: "Gabonaise", tel: "", email: "",
  profession: "", station: "", entreprise: "", rdv: "",
};

function PreInscriptionMarin() {
  const [f, setF] = useState<Form>(VIDE);
  const [ok, setOk] = useState(false);
  const [tente, setTente] = useState(false);
  const [fait, setFait] = useState<PreInscription | null>(null);
  const up = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));

  const age = f.dateNaissance ? Math.floor((Date.now() - new Date(f.dateNaissance).getTime()) / (365.25 * 86400000)) : null;
  const erreurs: Partial<Record<keyof Form | "ok", string>> = {};
  if (!f.nom.trim()) erreurs.nom = "Indiquez votre nom.";
  if (!f.prenom.trim()) erreurs.prenom = "Indiquez votre prénom.";
  if (!f.sexe) erreurs.sexe = "Choisissez une option.";
  if (!f.dateNaissance) erreurs.dateNaissance = "Indiquez votre date de naissance.";
  else if (age !== null && age < 16) erreurs.dateNaissance = "Il faut avoir au moins 16 ans pour s'inscrire.";
  if (!/^[0-9 +]{8,}$/.test(f.tel.trim())) erreurs.tel = "Numéro de téléphone incomplet (8 chiffres au moins).";
  if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) erreurs.email = "Adresse e-mail invalide.";
  if (!f.profession) erreurs.profession = "Choisissez un métier.";
  if (!f.station) erreurs.station = "Choisissez où vous présenter.";
  if (!ok) erreurs.ok = "Cochez la case pour confirmer.";
  const err = (k: keyof Form | "ok") => (tente ? erreurs[k] : undefined);

  const envoyer = (e: FormEvent) => {
    e.preventDefault();
    setTente(true);
    if (Object.keys(erreurs).length) return;
    setFait(deposerPreInscription({ ...f, nom: f.nom.trim().toUpperCase(), prenom: f.prenom.trim() }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (fait) {
    const st = STATIONS.find((s) => s.code === fait.station);
    return (
      <EcranConnexion profil="marin" titre="Pré-inscription marin" accroche="Préparez votre rendez-vous à la station maritime : votre dossier et votre NIP seront créés par l'agent de la DGMM." large>
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="rounded-xl border border-success/40 bg-success/8 p-6 text-center">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h1 className="mt-3 font-display text-2xl font-bold text-primary">Demande enregistrée</h1>
            <p className="mt-1 text-sm text-muted-foreground">Gardez ce numéro : l'agent vous le demandera.</p>
            <div className="mx-auto mt-4 inline-block rounded-lg bg-primary px-5 py-2 font-mono text-xl font-bold text-gold">{fait.numero}</div>
          </div>
          <Panel title="Votre rendez-vous">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">Lieu</dt><dd className="font-medium">{st?.nom}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Date souhaitée</dt><dd className="font-medium">{fait.rdv ? new Date(fait.rdv).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : "Dès que possible"}</dd></div>
              {st?.contact && <div><dt className="text-xs text-muted-foreground">Téléphone de la station</dt><dd className="font-medium">{st.contact}</dd></div>}
            </dl>
            <p className="mt-4 text-sm text-muted-foreground">La station vous contactera au {fait.tel} pour confirmer la date. Votre dossier sera créé par l'agent, à partir de cette demande.</p>
          </Panel>
          <Panel title="Pièces à apporter">
            <ul className="space-y-2 text-sm">{PIECES.map((p) => <li key={p} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-secondary" />{p}</li>)}</ul>
          </Panel>
          <div className="text-center"><Link to="/" className="text-sm font-semibold text-primary hover:underline">Retour à l'accueil</Link></div>
        </div>
      </EcranConnexion>
    );
  }

  return (
    <EcranConnexion profil="marin" titre="Pré-inscription marin" accroche="Préparez votre rendez-vous à la station maritime : votre dossier et votre NIP seront créés par l'agent de la DGMM." large>
      <div className="mb-6 max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Devenir marin au Gabon</div>
        <h1 className="mt-1 font-display text-3xl font-bold text-primary">Pré-inscription des gens de mer</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette demande prépare votre rendez-vous. Votre dossier officiel et votre numéro <Sigle s="NIP" /> sont créés par l'agent de la <Sigle s="DGMM" />, à la station maritime que vous choisissez.
        </p>
      </div>

      <ol className="mb-8 grid gap-3 sm:grid-cols-2">
        {ETAPES.map(({ icon: Icon, titre, texte }, i) => (
          <li key={titre} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-gold/20 text-xs font-bold text-primary">{i + 1}</span><Icon className="size-4 text-secondary" /></div>
            <div className="mt-2 text-sm font-semibold text-primary">{titre}</div>
            <div className="text-xs text-muted-foreground">{texte}</div>
          </li>
        ))}
      </ol>

      <form onSubmit={envoyer} noValidate className="grid gap-6">
        <div className="space-y-6">
          <Panel title="Identité">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom" htmlFor="nom" required error={err("nom")}><input id="nom" className={inputClass} value={f.nom} onChange={(e) => up("nom", e.target.value)} autoComplete="family-name" /></Field>
              <Field label="Prénom(s)" htmlFor="prenom" required error={err("prenom")}><input id="prenom" className={inputClass} value={f.prenom} onChange={(e) => up("prenom", e.target.value)} autoComplete="given-name" /></Field>
              <Field label="Sexe" htmlFor="sexe" required error={err("sexe")}>
                <select id="sexe" className={selectClass} value={f.sexe} onChange={(e) => up("sexe", e.target.value)}><option value="">Choisir…</option><option value="F">Féminin</option><option value="M">Masculin</option></select>
              </Field>
              <Field label="Date de naissance" htmlFor="dateNaissance" required error={err("dateNaissance")}><input id="dateNaissance" type="date" className={inputClass} value={f.dateNaissance} onChange={(e) => up("dateNaissance", e.target.value)} /></Field>
              <Field label="Nationalité" htmlFor="nationalite" required>
                <select id="nationalite" className={selectClass} value={f.nationalite} onChange={(e) => up("nationalite", e.target.value)}>{NATIONALITES.map((n) => <option key={n}>{n}</option>)}</select>
              </Field>
            </div>
          </Panel>
          <Panel title="Contact">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Téléphone" htmlFor="tel" required error={err("tel")} hint="La station vous appellera pour confirmer."><input id="tel" type="tel" className={inputClass} value={f.tel} onChange={(e) => up("tel", e.target.value)} placeholder="077 45 20 17" autoComplete="tel" /></Field>
              <Field label="E-mail" htmlFor="email" error={err("email")}><input id="email" type="email" className={inputClass} value={f.email} onChange={(e) => up("email", e.target.value)} autoComplete="email" /></Field>
            </div>
          </Panel>
          <Panel title="Projet maritime et rendez-vous">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Métier visé" htmlFor="profession" required error={err("profession")}>
                <select id="profession" className={selectClass} value={f.profession} onChange={(e) => up("profession", e.target.value)}><option value="">Choisir…</option>{PROFESSIONS.map((p) => <option key={p}>{p}</option>)}</select>
              </Field>
              <Field label="Compagnie qui vous embauche" htmlFor="entreprise" hint="Facultatif">
                <select id="entreprise" className={selectClass} value={f.entreprise} onChange={(e) => up("entreprise", e.target.value)}><option value="">Aucune pour l'instant</option>{ENTREPRISES_CHOIX.map((p) => <option key={p}>{p}</option>)}</select>
              </Field>
              <Field label="Station où vous présenter" htmlFor="station" required error={err("station")} className="sm:col-span-2">
                <select id="station" className={selectClass} value={f.station} onChange={(e) => up("station", e.target.value)}><option value="">Choisir…</option>{STATIONS.map((s) => <option key={s.code} value={s.code}>{s.nom} ({s.ville})</option>)}</select>
              </Field>
              <Field label="Date de rendez-vous souhaitée" htmlFor="rdv" hint="Indicative : la station confirme."><input id="rdv" type="date" className={inputClass} value={f.rdv} min={new Date().toISOString().slice(0, 10)} onChange={(e) => up("rdv", e.target.value)} /></Field>
            </div>
          </Panel>
          <div className="space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input id="ok" type="checkbox" className="mt-1" checked={ok} onChange={(e) => setOk(e.target.checked)} />
              <span>Je certifie l'exactitude de ces informations. Je sais que mon dossier ne sera créé qu'après ma visite médicale et le contrôle de mes pièces à la station.</span>
            </label>
            {err("ok") && <p className="text-xs text-destructive">{err("ok")}</p>}
            {tente && Object.keys(erreurs).length > 0 && <p className="text-sm text-destructive">{Object.keys(erreurs).length} point(s) à corriger avant l'envoi.</p>}
            <Button type="submit" variant="gold" size="lg"><CalendarCheck2 /> Envoyer ma pré-inscription</Button>
          </div>
        </div>
        <aside className="space-y-4">
          <Panel title="Pièces à apporter">
            <ul className="space-y-2 text-sm">{PIECES.map((p) => <li key={p} className="flex gap-2"><ClipboardList className="mt-0.5 size-4 shrink-0 text-secondary" />{p}</li>)}</ul>
          </Panel>
          <Panel title="Où se présenter ?">
            <ul className="space-y-2 text-sm">{STATIONS.map((s) => <li key={s.code} className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-gold" /><span>{s.nom}<span className="block text-xs text-muted-foreground">{s.province}</span></span></li>)}</ul>
          </Panel>
          <p className="text-xs text-muted-foreground">Déjà enregistré ? <Link to="/mon-espace" className="font-semibold text-primary hover:underline">Espace Marin</Link></p>
        </aside>
      </form>
    </EcranConnexion>
  );
}
