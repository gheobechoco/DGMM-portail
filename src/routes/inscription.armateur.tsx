import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Building2, CheckCircle2, Plus, Ship, Trash2 } from "lucide-react";
import { EcranConnexion } from "@/components/dgmm/Accueil";
import { Field, Panel, inputClass, selectClass } from "@/components/dgmm/Page";
import { Sigle } from "@/components/dgmm/Sigle";
import { Button } from "@/components/ui/button";
import { BandeauBrouillon, JaugeMdp, PasswordInput, PieceJointe, SuiviSaisie, useBrouillon } from "@/components/dgmm/FormExtras";
import { TYPES_FLOTTE, type TypeFlotte } from "@/lib/dgmm/maritime";
import { comptesArmateurs } from "@/lib/dgmm/auth";
import { deposerDemandeArmateur, getInscriptions, type DemandeArmateur } from "@/lib/dgmm/inscriptions";

export const Route = createFileRoute("/inscription/armateur")({
  head: () => ({ meta: [{ title: "Inscription armateur — DGMM" }] }),
  component: InscriptionArmateur,
});

const VILLES = ["Libreville", "Owendo", "Port-Gentil", "Gamba", "Mayumba", "Lambaréné", "Cocobeach", "Kango"];

interface LigneNavire { nom: string; imo: string; jauge: string; indicatif: string; mmsi: string; port: string }
const NAV_VIDE: LigneNavire = { nom: "", imo: "", jauge: "", indicatif: "", mmsi: "", port: "" };
const PIECES_ARM = [
  { k: "rccm", l: "Extrait RCCM (moins de 3 mois)", req: true },
  { k: "statuts", l: "Statuts de la société", req: true },
  { k: "nif", l: "Attestation NIF", req: false },
  { k: "flotte", l: "Certificats d'immatriculation des navires", req: true },
  { k: "mandat", l: "Pouvoir du représentant", req: false },
] as const;
function imoValide(imo: string) {
  if (!/^\d{7}$/.test(imo)) return false;
  const d = imo.split("").map(Number);
  return d.slice(0, 6).reduce((t, x, i) => t + x * (7 - i), 0) % 10 === d[6];
}

const EXCLURE_ARM = ["motDePasse", "confirmation"];
const LIB_ARM: Record<string, string> = { raisonSociale: "Raison sociale", rccm: "RCCM", ville: "Ville", segment: "Activité", adresseSiege: "Adresse du siège", dpaNom: "DPA", dpaTel: "Téléphone DPA", pieces: "Pièces justificatives", contactNom: "Responsable", tel: "Téléphone", email: "E-mail", navires: "Flotte", identifiant: "Identifiant", motDePasse: "Mot de passe", confirmation: "Confirmation", ok: "Attestation" };

function InscriptionArmateur() {
  const [f, setF] = useState({
    raisonSociale: "", rccm: "", nif: "", ville: "", pays: "Gabon", segment: "" as TypeFlotte | "",
    adresseSiege: "", dpaNom: "", dpaTel: "", contactNom: "", contactFonction: "", tel: "", email: "", identifiant: "", motDePasse: "", confirmation: "",
  });
  const [navires, setNavires] = useState<LigneNavire[]>([{ ...NAV_VIDE }])
  const [pieces, setPieces] = useState<Record<string, string>>({});;
  const [ok, setOk] = useState(false);
  const [tente, setTente] = useState(false);
  const [fait, setFait] = useState<DemandeArmateur | null>(null);
  const brouillon = useBrouillon("dgmm-brouillon-armateur", f, setF, EXCLURE_ARM);
  const brouillonNav = useBrouillon("dgmm-brouillon-armateur-flotte", navires, setNavires);
  const up = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const pris = (id: string) =>
    comptesArmateurs().some((a) => a.username === id) ||
    getInscriptions().armateurs.some((d) => d.identifiant === id && d.statut !== "refusee");
  const naviresOk = navires.filter((n) => n.nom.trim());
  const e: Partial<Record<"raisonSociale" | "adresseSiege" | "dpaNom" | "dpaTel" | "pieces" | "rccm" | "ville" | "segment" | "contactNom" | "tel" | "email" | "navires" | "identifiant" | "motDePasse" | "confirmation" | "ok", string>> = {};
  if (!f.raisonSociale.trim()) e.raisonSociale = "Indiquez la raison sociale.";
  if (!f.rccm.trim()) e.rccm = "Le numéro RCCM est obligatoire.";
  if (!f.ville) e.ville = "Choisissez la ville d'implantation.";
  if (!f.segment) e.segment = "Choisissez votre activité.";
  if (!f.adresseSiege.trim()) e.adresseSiege = "Indiquez l'adresse du siège.";
  if (!f.dpaNom.trim()) e.dpaNom = "La personne désignée à terre (DPA) est obligatoire.";
  if (!/^[0-9 +]{8,}$/.test(f.dpaTel.trim())) e.dpaTel = "Numéro d'urgence 24 h/24 incomplet.";
  const manque = PIECES_ARM.filter((p) => p.req && !pieces[p.k]);
  if (manque.length) e.pieces = `Pièce(s) manquante(s) : ${manque.map((p) => p.l).join(", ")}.`;
  if (!f.contactNom.trim()) e.contactNom = "Indiquez le nom du responsable.";
  if (!/^[0-9 +]{8,}$/.test(f.tel.trim())) e.tel = "Numéro de téléphone incomplet.";
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Adresse e-mail invalide.";
  if (!naviresOk.length) e.navires = "Déclarez au moins un navire.";
  if (naviresOk.some((n) => !imoValide(n.imo.trim()))) e.navires = "Numéro OMI invalide (7 chiffres, clé de contrôle OMI).";
  else if (naviresOk.some((n) => n.mmsi.trim() && !/^\d{9}$/.test(n.mmsi.trim()))) e.navires = "Le MMSI compte 9 chiffres.";
  else if (new Set(naviresOk.map((n) => n.imo.trim())).size !== naviresOk.length) e.navires = "Un même numéro OMI est déclaré deux fois.";
  const ident = f.identifiant.trim().toLowerCase();
  if (!/^[a-z0-9._-]{4,}$/.test(ident)) e.identifiant = "4 caractères au moins : lettres, chiffres, point ou tiret.";
  else if (pris(ident)) e.identifiant = "Cet identifiant est déjà utilisé.";
  if (f.motDePasse.length < 8) e.motDePasse = "8 caractères au moins.";
  if (f.confirmation !== f.motDePasse) e.confirmation = "Les deux mots de passe sont différents.";
  if (!ok) e.ok = "Cochez la case pour confirmer.";
  const err = (k: keyof typeof e) => (tente ? e[k] : undefined);

  const envoyer = (ev: FormEvent) => {
    ev.preventDefault();
    setTente(true);
    if (Object.keys(e).length) return;
    brouillon.effacer(); brouillonNav.effacer();
    const segment = f.segment as TypeFlotte;
    setFait(
      deposerDemandeArmateur({
        raisonSociale: f.raisonSociale.trim(), rccm: f.rccm.trim(), nif: f.nif.trim(), ville: f.ville, pays: f.pays.trim() || "Gabon",
        segment, contactNom: f.contactNom.trim(), contactFonction: f.contactFonction.trim(), tel: f.tel.trim(), email: f.email.trim(),
        navires: naviresOk.map((n) => ({ nom: n.nom.trim(), imo: n.imo.trim(), type: segment, jauge: Number(n.jauge) || 0, pavillon: "Gabon" })),
        identifiant: ident, motDePasse: f.motDePasse,
        adresseSiege: f.adresseSiege.trim(), dpaNom: f.dpaNom.trim(), dpaTel: f.dpaTel.trim(),
        flotteDetails: naviresOk.map((n) => ({ imo: n.imo.trim(), indicatif: n.indicatif.trim().toUpperCase(), mmsi: n.mmsi.trim(), portAttache: n.port.trim() })),
        pieces: Object.values(pieces).filter(Boolean),
      }),
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (fait) {
    return (
      <EcranConnexion profil="armateur" titre="Inscription armateur" accroche="Ouvrez le compte de votre compagnie pour déclarer vos rôles d'équipage et suivre l'aptitude de vos marins." large>
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="rounded-xl border border-success/40 bg-success/8 p-6 text-center">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h1 className="mt-3 font-display text-2xl font-bold text-primary">Demande transmise à la DGMM</h1>
            <p className="mt-1 text-sm text-muted-foreground">Numéro de suivi de votre demande :</p>
            <div className="mx-auto mt-3 inline-block rounded-lg bg-primary px-5 py-2 font-mono text-xl font-bold text-gold">{fait.numero}</div>
          </div>
          <Panel title="Et ensuite ?">
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>Déposez les originaux de vos pièces au bureau d'immatriculation maritime (Libreville, immeuble Santullo, 3ᵉ étage) en citant votre numéro de suivi.</li>
              <li>La Direction des Gens de Mer vérifie votre RCCM et votre flotte ({fait.navires.length} navire(s)).</li>
              <li>Une fois la demande validée, connectez-vous à l'Espace Armateurs avec l'identifiant <strong className="font-mono">{fait.identifiant}</strong>.</li>
              <li>Vous pourrez alors déclarer vos rôles d'équipage et suivre l'aptitude de vos marins.</li>
            </ol>
          </Panel>
          <div className="text-center"><Link to="/armateur" className="text-sm font-semibold text-primary hover:underline">Aller à l'Espace Armateurs</Link></div>
        </div>
      </EcranConnexion>
    );
  }

  return (
    <EcranConnexion profil="armateur" titre="Inscription armateur" accroche="Ouvrez le compte de votre compagnie pour déclarer vos rôles d'équipage et suivre l'aptitude de vos marins." large>
      <div className="mb-6 max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Compagnies maritimes</div>
        <h1 className="mt-1 font-display text-3xl font-bold text-primary">Ouvrir un compte armateur</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Le compte permet de déclarer vos rôles d'équipage et de vérifier l'aptitude médicale (<Sigle s="STCW" />) de vos marins. Il est activé après contrôle par la <Sigle s="DGMM" />.
        </p>
      </div>
      <BandeauBrouillon visible={brouillon.restaure} onEffacer={() => { brouillon.effacer(); brouillonNav.effacer(); window.location.reload(); }} />
      <form onSubmit={envoyer} noValidate className="space-y-6">
        <SuiviSaisie total={16} erreurs={e} montrer={tente} libelles={LIB_ARM} />
        <Panel title={<span className="inline-flex items-center gap-2"><Building2 className="size-4 text-secondary" /> Entreprise</span>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Raison sociale" htmlFor="raisonSociale" required error={err("raisonSociale")} className="sm:col-span-2"><input id="raisonSociale" className={inputClass} value={f.raisonSociale} onChange={(x) => up("raisonSociale", x.target.value)} autoComplete="organization" /></Field>
            <Field label="Activité principale" htmlFor="segment" required error={err("segment")}>
              <select id="segment" className={selectClass} value={f.segment} onChange={(x) => up("segment", x.target.value)}><option value="">Choisir…</option>{TYPES_FLOTTE.map((t) => <option key={t}>{t}</option>)}</select>
            </Field>
            <Field label="N° RCCM" htmlFor="rccm" required error={err("rccm")}><input id="rccm" className={inputClass} value={f.rccm} onChange={(x) => up("rccm", x.target.value)} placeholder="GA-LBV-2026-B-01234" /></Field>
            <Field label="N° d'identification fiscale (NIF)" htmlFor="nif" hint="Facultatif"><input id="nif" className={inputClass} value={f.nif} onChange={(x) => up("nif", x.target.value)} /></Field>
            <Field label="Ville d'implantation au Gabon" htmlFor="ville" required error={err("ville")}>
              <select id="ville" className={selectClass} value={f.ville} onChange={(x) => up("ville", x.target.value)}><option value="">Choisir…</option>{VILLES.map((v) => <option key={v}>{v}</option>)}</select>
            </Field>
            <Field label="Pays du siège social" htmlFor="pays"><input id="pays" className={inputClass} value={f.pays} onChange={(x) => up("pays", x.target.value)} /></Field>
            <Field label="Adresse du siège" htmlFor="adresseSiege" required error={err("adresseSiege")} className="sm:col-span-2"><input id="adresseSiege" className={inputClass} value={f.adresseSiege} onChange={(x) => up("adresseSiege", x.target.value)} placeholder="Quartier, rue, BP" autoComplete="street-address" /></Field>
          </div>
        </Panel>

        <Panel title="Responsable du compte">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom et prénom" htmlFor="contactNom" required error={err("contactNom")}><input id="contactNom" className={inputClass} value={f.contactNom} onChange={(x) => up("contactNom", x.target.value)} autoComplete="name" /></Field>
            <Field label="Fonction" htmlFor="contactFonction"><input id="contactFonction" className={inputClass} value={f.contactFonction} onChange={(x) => up("contactFonction", x.target.value)} placeholder="Responsable armement" /></Field>
            <Field label="Téléphone" htmlFor="tel" required error={err("tel")}><input id="tel" type="tel" className={inputClass} value={f.tel} onChange={(x) => up("tel", x.target.value)} autoComplete="tel" /></Field>
            <Field label="E-mail professionnel" htmlFor="email" required error={err("email")}><input id="email" type="email" className={inputClass} value={f.email} onChange={(x) => up("email", x.target.value)} autoComplete="email" /></Field>
          </div>
        </Panel>

        <Panel title="Personne désignée à terre (DPA)" description="Contact joignable 24 h/24 en cas d'incident à bord (Code ISM).">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom du DPA" htmlFor="dpaNom" required error={err("dpaNom")}><input id="dpaNom" className={inputClass} value={f.dpaNom} onChange={(x) => up("dpaNom", x.target.value)} /></Field>
            <Field label="Téléphone d'urgence 24 h/24" htmlFor="dpaTel" required error={err("dpaTel")}><input id="dpaTel" type="tel" className={inputClass} value={f.dpaTel} onChange={(x) => up("dpaTel", x.target.value)} /></Field>
          </div>
        </Panel>

        <div id="navires" tabIndex={-1} />
        <Panel title={<span className="inline-flex items-center gap-2"><Ship className="size-4 text-secondary" /> Flotte</span>} description="Navires que vous armez sous pavillon gabonais.">
          <div className="space-y-3">
            {navires.map((n, i) => (
              <div key={i} className="grid items-end gap-3 rounded-lg border p-3 sm:grid-cols-3">
                <Field label="Nom du navire" htmlFor={`nav-nom-${i}`}><input id={`nav-nom-${i}`} className={inputClass} value={n.nom} onChange={(x) => setNavires((l) => l.map((y, j) => (j === i ? { ...y, nom: x.target.value } : y)))} placeholder="MV Ogooué" /></Field>
                <Field label="N° OMI" htmlFor={`nav-imo-${i}`}><input id={`nav-imo-${i}`} inputMode="numeric" className={inputClass} value={n.imo} onChange={(x) => setNavires((l) => l.map((y, j) => (j === i ? { ...y, imo: x.target.value } : y)))} placeholder="9381201" /></Field>
                <Field label="Jauge brute (GT)" htmlFor={`nav-gt-${i}`}><input id={`nav-gt-${i}`} inputMode="numeric" className={inputClass} value={n.jauge} onChange={(x) => setNavires((l) => l.map((y, j) => (j === i ? { ...y, jauge: x.target.value } : y)))} /></Field>
                <Field label="Indicatif d'appel" htmlFor={`nav-ind-${i}`}><input id={`nav-ind-${i}`} className={inputClass} value={n.indicatif} onChange={(x) => setNavires((l) => l.map((y, j) => (j === i ? { ...y, indicatif: x.target.value } : y)))} placeholder="TRA123" /></Field>
                <Field label="MMSI" htmlFor={`nav-mmsi-${i}`}><input id={`nav-mmsi-${i}`} inputMode="numeric" className={inputClass} value={n.mmsi} onChange={(x) => setNavires((l) => l.map((y, j) => (j === i ? { ...y, mmsi: x.target.value } : y)))} placeholder="626000123" /></Field>
                <Field label="Port d'attache" htmlFor={`nav-port-${i}`}><input id={`nav-port-${i}`} className={inputClass} value={n.port} onChange={(x) => setNavires((l) => l.map((y, j) => (j === i ? { ...y, port: x.target.value } : y)))} placeholder="Owendo" /></Field>
                <Button type="button" variant="ghost" size="icon" aria-label={`Retirer le navire ${i + 1}`} disabled={navires.length === 1} onClick={() => setNavires((l) => l.filter((_, j) => j !== i))}><Trash2 /></Button>
              </div>
            ))}
            {err("navires") && <p className="text-xs text-destructive">{err("navires")}</p>}
            <Button type="button" variant="outline" size="sm" onClick={() => setNavires((l) => [...l, { ...NAV_VIDE }])}><Plus /> Ajouter un navire</Button>
          </div>
        </Panel>

        <div id="pieces" tabIndex={-1} />
        <Panel title="Pièces justificatives" description="Copies numériques ; les originaux sont contrôlés au guichet.">
          <div className="grid gap-4 sm:grid-cols-2">
            {PIECES_ARM.map((p) => <PieceJointe key={p.k} id={`piece-${p.k}`} label={p.l} required={p.req} fichier={pieces[p.k] ?? ""} onChange={(v) => setPieces((s) => ({ ...s, [p.k]: v }))} />)}
          </div>
          {err("pieces") && <p className="mt-3 text-xs text-destructive">{err("pieces")}</p>}
        </Panel>

        <Panel title="Identifiants de connexion">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Identifiant souhaité" htmlFor="identifiant" required error={err("identifiant")}><input id="identifiant" className={inputClass} value={f.identifiant} onChange={(x) => up("identifiant", x.target.value)} autoComplete="username" /></Field>
            <Field label="Mot de passe" htmlFor="motDePasse" required error={err("motDePasse")}><PasswordInput id="motDePasse" value={f.motDePasse} onChange={(v) => up("motDePasse", v)} /><JaugeMdp value={f.motDePasse} /></Field>
            <Field label="Confirmation" htmlFor="confirmation" required error={err("confirmation")}><PasswordInput id="confirmation" value={f.confirmation} onChange={(v) => up("confirmation", v)} /></Field>
          </div>
        </Panel>

        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input id="ok" type="checkbox" className="mt-1" checked={ok} onChange={(x) => setOk(x.target.checked)} />
            <span>Je certifie être habilité à représenter cette entreprise et l'exactitude des informations transmises.</span>
          </label>
          {err("ok") && <p className="text-xs text-destructive">{err("ok")}</p>}
          {tente && Object.keys(e).length > 0 && <p className="text-sm text-destructive">{Object.keys(e).length} point(s) à corriger avant l'envoi.</p>}
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" variant="gold" size="lg">Envoyer la demande</Button>
            <span className="text-xs text-muted-foreground">Déjà un compte ? <Link to="/armateur" className="font-semibold text-primary hover:underline">Espace Armateurs</Link></span>
          </div>
        </div>
      </form>
    </EcranConnexion>
  );
}
