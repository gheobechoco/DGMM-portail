import { Aide } from "@/components/dgmm/Aide";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, ChevronDown, FileText, Plus, Save, Ship, ShieldCheck, Trash2 } from "lucide-react";
import { EcranConnexion } from "@/components/dgmm/Accueil";
import { Field, Panel, inputClass, selectClass } from "@/components/dgmm/Page";
import { Sigle } from "@/components/dgmm/Sigle";
import { MarquageCoque } from "@/components/dgmm/MarquageCoque";
import { JaugeMdp, PasswordInput, PieceJointe } from "@/components/dgmm/FormExtras";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TYPES_FLOTTE, type TypeFlotte } from "@/lib/dgmm/maritime";
import { comptesArmateurs } from "@/lib/dgmm/auth";
import { effectifMinimal } from "@/lib/dgmm/conformite";
import {
  PIECES_SOCIETE,
  deposerDemandeArmateur,
  useInscriptions,
  type DemandeArmateur,
  type PieceSociete,
} from "@/lib/dgmm/inscriptions";
import {
  CATEGORIES_NAVIRE,
  PIECES_NAVIRE,
  PORTS_ATTACHE,
  SEGMENT_PAR_CATEGORIE,
  SOCIETES_CLASSIFICATION,
  consequencesJauge,
  controlerNavire,
  imoNormalise,
  imoObligatoire,
  navireVide,
  nomNormalise,
  piecesExigees,
  registreOccupe,
  telValide,
  type CategorieNavire,
  type ErreursNavire,
  type NavireDeclare,
} from "@/lib/dgmm/registre";

export const Route = createFileRoute("/inscription/armateur")({
  head: () => ({ meta: [{ title: "Inscription armateur — DGMM" }] }),
  component: InscriptionArmateur,
});

const VILLES = ["Libreville", "Owendo", "Port-Gentil", "Gamba", "Mayumba", "Lambaréné", "Cocobeach", "Kango"];
const ETAPES = [
  { titre: "Compagnie", detail: "Identité, siège, contacts" },
  { titre: "Flotte", detail: "Nom, OMI, jauge, indicatif" },
  { titre: "Pièces", detail: "Justificatifs à joindre" },
  { titre: "Vérification", detail: "Récapitulatif et envoi" },
] as const;
const BROUILLON = "dgmm-brouillon-armateur";

const FORM_VIDE = {
  raisonSociale: "", segment: "" as TypeFlotte | "", rccm: "", nif: "", adresseSiege: "", boitePostale: "", ville: "", pays: "Gabon",
  contactNom: "", contactFonction: "", tel: "", email: "", dpaNom: "", dpaTel: "", dpaEmail: "",
  identifiant: "", motDePasse: "", confirmation: "",
};
type Formulaire = typeof FORM_VIDE;

function InscriptionArmateur() {
  const { armateurs } = useInscriptions();
  const occupe = useMemo(() => registreOccupe(armateurs), [armateurs]);
  const [etape, setEtape] = useState(0);
  const [tentees, setTentees] = useState<number[]>([]);
  const [f, setF] = useState<Formulaire>(FORM_VIDE);
  const [flotte, setFlotte] = useState<NavireDeclare[]>([navireVide()]);
  const [ouvert, setOuvert] = useState(0);
  const [pieces, setPieces] = useState<Partial<Record<PieceSociete, string>>>({});
  const [certifie, setCertifie] = useState(false);
  const [fait, setFait] = useState<DemandeArmateur | null>(null);
  const [brouillonLe, setBrouillonLe] = useState<string | null>(null);
  const up = (k: keyof Formulaire, v: string) => setF((s) => ({ ...s, [k]: v }));
  const majNavire = (i: number, patch: Partial<NavireDeclare>) => setFlotte((l) => l.map((n, j) => (j === i ? { ...n, ...patch } : n)));

  // Brouillon : repris après montage (rien n'est lu pendant le rendu serveur), mots de passe exclus.
  useEffect(() => {
    try {
      const b = JSON.parse(window.localStorage.getItem(BROUILLON) ?? "null") as { f: Formulaire; flotte: NavireDeclare[]; pieces: typeof pieces; le: string } | null;
      if (b) { setF({ ...FORM_VIDE, ...b.f, motDePasse: "", confirmation: "" }); setFlotte(b.flotte.length ? b.flotte : [navireVide()]); setPieces(b.pieces ?? {}); setBrouillonLe(b.le); }
    } catch { /* brouillon illisible : on repart de zéro */ }
  }, []);
  const enregistrer = () => {
    const le = new Date().toISOString();
    try {
      window.localStorage.setItem(BROUILLON, JSON.stringify({ f: { ...f, motDePasse: "", confirmation: "" }, flotte, pieces, le }));
      setBrouillonLe(le);
    } catch { /* stockage indisponible */ }
  };
  const effacerBrouillon = () => {
    try { window.localStorage.removeItem(BROUILLON); } catch { /* rien */ }
    setF(FORM_VIDE); setFlotte([navireVide()]); setPieces({}); setBrouillonLe(null); setEtape(0); setTentees([]);
  };

  /* ---------- Contrôles par étape ---------- */
  const e1: Partial<Record<keyof Formulaire, string>> = {};
  if (!f.raisonSociale.trim()) e1.raisonSociale = "Indiquez la raison sociale.";
  if (!f.segment) e1.segment = "Choisissez votre activité principale.";
  if (!/^GA-[A-Z]{2,4}-\S{4,}$/i.test(f.rccm.trim())) e1.rccm = "Format RCCM gabonais attendu, ex. GA-LBV-2026-B-01234.";
  if (!/^[A-Z0-9-]{6,}$/i.test(f.nif.replace(/\s/g, ""))) e1.nif = "Le NIF est obligatoire (6 caractères au moins).";
  if (!f.adresseSiege.trim()) e1.adresseSiege = "Indiquez la rue, le quartier ou la zone portuaire.";
  if (!f.ville) e1.ville = "Choisissez la ville d'implantation.";
  if (!f.contactNom.trim()) e1.contactNom = "Indiquez le nom du responsable.";
  if (!telValide(f.tel)) e1.tel = "Numéro gabonais (ex. 077 12 34 56) ou international (+…).";
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e1.email = "Adresse e-mail invalide.";
  if (!f.dpaNom.trim()) e1.dpaNom = "La personne désignée à terre est obligatoire (code ISM).";
  if (!telValide(f.dpaTel)) e1.dpaTel = "Numéro joignable 24 h/24 obligatoire.";

  const erreursNavires: ErreursNavire[] = flotte.map((n, i) => controlerNavire(n, occupe, flotte.filter((_, j) => j !== i), false));
  const e2n = erreursNavires.reduce((s, e) => s + Object.keys(e).length, 0);

  const e3: Partial<Record<PieceSociete, string>> = {};
  (Object.keys(PIECES_SOCIETE) as PieceSociete[]).forEach((k) => { if (PIECES_SOCIETE[k].obligatoire && !pieces[k]) e3[k] = "Pièce obligatoire."; });
  const e3n = Object.keys(e3).length + flotte.reduce((s, n) => s + piecesExigees(n).filter((p) => !n.pieces[p]).length, 0);

  const pris = (id: string) => comptesArmateurs().some((a) => a.username === id) || armateurs.some((d) => d.identifiant === id && d.statut !== "refusee");
  const ident = f.identifiant.trim().toLowerCase();
  const e4: Partial<Record<"identifiant" | "motDePasse" | "confirmation" | "certifie", string>> = {};
  if (!/^[a-z0-9._-]{4,}$/.test(ident)) e4.identifiant = "4 caractères au moins : lettres, chiffres, point ou tiret.";
  else if (pris(ident)) e4.identifiant = "Cet identifiant est déjà utilisé.";
  if (f.motDePasse.length < 8) e4.motDePasse = "8 caractères au moins.";
  if (f.confirmation !== f.motDePasse) e4.confirmation = "Les deux mots de passe sont différents.";
  if (!certifie) e4.certifie = "Cochez la case pour confirmer.";

  const nbErreurs = [Object.keys(e1).length, e2n, e3n, Object.keys(e4).length];
  const voir = (i: number) => tentees.includes(i);
  const err1 = (k: keyof Formulaire) => (voir(0) ? e1[k] : undefined);

  const suivant = () => {
    setTentees((t) => (t.includes(etape) ? t : [...t, etape]));
    if (nbErreurs[etape]) {
      if (etape === 1) setOuvert(erreursNavires.findIndex((e) => Object.keys(e).length));
      return;
    }
    enregistrer();
    setEtape((x) => Math.min(3, x + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const envoyer = (ev: FormEvent) => {
    ev.preventDefault();
    setTentees([0, 1, 2, 3]);
    const premiere = nbErreurs.findIndex((n) => n > 0);
    if (premiere >= 0) { setEtape(premiere); return; }
    const propre = flotte.map((n) => ({ ...n, nom: n.nom.trim().replace(/\s+/g, " ").toUpperCase(), imo: imoNormalise(n.imo), indicatif: n.indicatif.toUpperCase().replace(/\s/g, ""), mmsi: n.mmsi.replace(/\s/g, ""), nomStatut: "en_attente" as const }));
    const d = deposerDemandeArmateur({
      raisonSociale: f.raisonSociale.trim(), rccm: f.rccm.trim().toUpperCase(), nif: f.nif.trim().toUpperCase(), ville: f.ville, pays: f.pays.trim() || "Gabon",
      segment: f.segment as TypeFlotte, contactNom: f.contactNom.trim(), contactFonction: f.contactFonction.trim(), tel: f.tel.trim(), email: f.email.trim(),
      adresseSiege: f.adresseSiege.trim(), boitePostale: f.boitePostale.trim() || undefined,
      dpaNom: f.dpaNom.trim(), dpaTel: f.dpaTel.trim(), dpaEmail: f.dpaEmail.trim() || undefined,
      navires: propre.map((n) => ({ nom: n.nom, imo: n.imo.replace("IMO", ""), type: SEGMENT_PAR_CATEGORIE[n.categorie], jauge: n.jauge, pavillon: "Gabon" })),
      flotte: propre, piecesSociete: pieces, identifiant: ident, motDePasse: f.motDePasse,
    });
    try { window.localStorage.removeItem(BROUILLON); } catch { /* rien */ }
    setFait(d);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (fait) return <Confirmation d={fait} />;

  return (
    <EcranConnexion profil="armateur" titre="Inscription armateur" accroche="Ouvrez le compte de votre compagnie et inscrivez votre flotte au registre gabonais." large>
      <div className="mb-6 max-w-3xl">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Compagnies maritimes</div>
        <h1 className="mt-1 font-display text-3xl font-bold text-primary">Ouvrir un compte armateur</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Déclarez votre compagnie et chaque navire. La <Sigle s="DGMM" /> approuve d'abord le nom de chaque navire, contrôle les pièces, puis active votre compte pour déclarer vos rôles d'équipage.
        </p>
      </div>

      {/* Étapes */}
      <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Étapes de l'inscription">
        {ETAPES.map((s, i) => {
          const faite = i < etape && !nbErreurs[i];
          const accessible = i <= etape || ETAPES.slice(0, i).every((_, j) => !nbErreurs[j]);
          return (
            <li key={s.titre}>
              <button
                type="button"
                disabled={!accessible}
                aria-current={i === etape ? "step" : undefined}
                onClick={() => accessible && setEtape(i)}
                className={cn("group w-full text-left disabled:cursor-not-allowed disabled:opacity-60")}
              >
                <span className={cn("block h-1.5 rounded-full transition-colors duration-500", i <= etape ? "bg-gold" : "bg-muted")} />
                <span className="mt-2 flex items-center gap-2">
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold transition-all", faite ? "bg-success text-success-foreground" : i === etape ? "bg-primary text-primary-foreground ring-4 ring-gold/30" : "bg-muted text-muted-foreground")}>
                    {faite ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-primary">{s.titre}</span>
                    <span className="hidden truncate text-xs text-muted-foreground sm:block">{s.detail}</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <form onSubmit={envoyer} noValidate className="space-y-6">
        {etape === 0 && (
          <>
            <Panel title={<span className="inline-flex items-center gap-2"><Building2 className="size-4 text-secondary" /> Compagnie</span>}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Raison sociale" htmlFor="raisonSociale" required error={err1("raisonSociale")} className="sm:col-span-2"><input id="raisonSociale" className={inputClass} value={f.raisonSociale} onChange={(x) => up("raisonSociale", x.target.value)} autoComplete="organization" /></Field>
                <Field label="Activité principale" htmlFor="segment" required error={err1("segment")}>
                  <select id="segment" className={selectClass} value={f.segment} onChange={(x) => up("segment", x.target.value)}><option value="">Choisir…</option>{TYPES_FLOTTE.map((t) => <option key={t}>{t}</option>)}</select>
                </Field>
                <Field label="N° RCCM" htmlFor="rccm" aide="rccm" required error={err1("rccm")} valid={!e1.rccm}><input id="rccm" className={cn(inputClass, "font-mono uppercase")} value={f.rccm} onChange={(x) => up("rccm", x.target.value)} placeholder="GA-LBV-2026-B-01234" /></Field>
                <Field label="N° d'identification fiscale (NIF)" htmlFor="nif" required error={err1("nif")} valid={!e1.nif}><input id="nif" className={cn(inputClass, "font-mono uppercase")} value={f.nif} onChange={(x) => up("nif", x.target.value)} /></Field>
                <Field label="Ville d'implantation au Gabon" htmlFor="ville" required error={err1("ville")}>
                  <select id="ville" className={selectClass} value={f.ville} onChange={(x) => up("ville", x.target.value)}><option value="">Choisir…</option>{VILLES.map((v) => <option key={v}>{v}</option>)}</select>
                </Field>
                <Field label="Adresse du siège" htmlFor="adresseSiege" required error={err1("adresseSiege")} hint="Rue, quartier ou zone portuaire" className="sm:col-span-2"><input id="adresseSiege" className={inputClass} value={f.adresseSiege} onChange={(x) => up("adresseSiege", x.target.value)} autoComplete="street-address" placeholder="Zone portuaire d'Owendo, face au terminal" /></Field>
                <Field label="Boîte postale" htmlFor="boitePostale" hint="Facultatif"><input id="boitePostale" className={inputClass} value={f.boitePostale} onChange={(x) => up("boitePostale", x.target.value)} placeholder="BP 1234" /></Field>
                <Field label="Pays du siège social" htmlFor="pays"><input id="pays" className={inputClass} value={f.pays} onChange={(x) => up("pays", x.target.value)} /></Field>
              </div>
            </Panel>
            <Panel title="Responsable du compte">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nom et prénom" htmlFor="contactNom" required error={err1("contactNom")}><input id="contactNom" className={inputClass} value={f.contactNom} onChange={(x) => up("contactNom", x.target.value)} autoComplete="name" /></Field>
                <Field label="Fonction" htmlFor="contactFonction"><input id="contactFonction" className={inputClass} value={f.contactFonction} onChange={(x) => up("contactFonction", x.target.value)} placeholder="Responsable armement" /></Field>
                <Field label="Téléphone" htmlFor="tel" required error={err1("tel")} valid={!e1.tel}><input id="tel" type="tel" className={inputClass} value={f.tel} onChange={(x) => up("tel", x.target.value)} autoComplete="tel" placeholder="077 12 34 56" /></Field>
                <Field label="E-mail professionnel" htmlFor="email" required error={err1("email")} valid={!e1.email}><input id="email" type="email" className={inputClass} value={f.email} onChange={(x) => up("email", x.target.value)} autoComplete="email" /></Field>
              </div>
            </Panel>
            <Panel title={<span className="inline-flex items-center gap-1.5">Personne désignée à terre (DPA) <Aide terme="dpa" /></span>} description="Exigée par le code ISM : contact joignable 24 h/24 en cas d'accident ou de détresse en mer.">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Nom et prénom" htmlFor="dpaNom" required error={err1("dpaNom")}><input id="dpaNom" className={inputClass} value={f.dpaNom} onChange={(x) => up("dpaNom", x.target.value)} /></Field>
                <Field label="Ligne directe 24 h/24" htmlFor="dpaTel" required error={err1("dpaTel")} valid={!e1.dpaTel}><input id="dpaTel" type="tel" className={inputClass} value={f.dpaTel} onChange={(x) => up("dpaTel", x.target.value)} placeholder="066 00 00 00 ou +870…" /></Field>
                <Field label="E-mail" htmlFor="dpaEmail" hint="Facultatif"><input id="dpaEmail" type="email" className={inputClass} value={f.dpaEmail} onChange={(x) => up("dpaEmail", x.target.value)} /></Field>
              </div>
            </Panel>
          </>
        )}

        {etape === 1 && (
          <div className="space-y-4">
            <div className="rounded-lg border-l-4 border-l-gold bg-card p-4 text-sm shadow-card">
              <strong className="text-primary">Avant de remplir :</strong> le nom proposé doit être libre sous pavillon gabonais ; il est vérifié au fil de la saisie puis soumis à l'approbation de la DGMM. Le numéro OMI suit la coque toute sa vie, même après un changement de nom, de propriétaire ou de pavillon.
            </div>
            {flotte.map((n, i) => (
              <FicheNavire
                key={i}
                i={i}
                n={n}
                e={voir(1) ? erreursNavires[i]! : {}}
                eSansAffichage={erreursNavires[i]!}
                ouvert={ouvert === i}
                onOuvrir={() => setOuvert(ouvert === i ? -1 : i)}
                onChange={(p) => majNavire(i, p)}
                onRetirer={flotte.length > 1 ? () => { setFlotte((l) => l.filter((_, j) => j !== i)); setOuvert(-1); } : undefined}
              />
            ))}
            <Button type="button" variant="outline" onClick={() => { setFlotte((l) => [...l, navireVide()]); setOuvert(flotte.length); }}><Plus /> Ajouter un navire</Button>
          </div>
        )}

        {etape === 2 && (
          <>
            <Panel title={<span className="inline-flex items-center gap-2"><FileText className="size-4 text-secondary" /> Pièces de la compagnie</span>} description="PDF ou photo lisible, 5 Mo au plus par fichier.">
              <div className="grid gap-4 sm:grid-cols-2">
                {(Object.keys(PIECES_SOCIETE) as PieceSociete[]).map((k) => (
                  <div key={k}>
                    <PieceJointe id={`piece-${k}`} label={PIECES_SOCIETE[k].titre} required={PIECES_SOCIETE[k].obligatoire} fichier={pieces[k] ?? ""} onChange={(nom) => setPieces((p) => ({ ...p, [k]: nom || undefined }))} error={voir(2) ? e3[k] : undefined} />
                    <p className="mt-1 text-xs text-muted-foreground">{PIECES_SOCIETE[k].detail}</p>
                  </div>
                ))}
              </div>
            </Panel>
            {flotte.map((n, i) => (
              <Panel key={i} title={<span className="inline-flex items-center gap-2"><Ship className="size-4 text-secondary" /> {n.nom.trim().toUpperCase() || `Navire ${i + 1}`}</span>} description={n.provenance === "transfert" ? `Transfert depuis le pavillon ${n.ancienPavillon || "précédent"}` : "Navire neuf"}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[...piecesExigees(n), "jaugeage" as const].map((p) => (
                    <div key={p}>
                      <PieceJointe id={`nav-${i}-${p}`} label={PIECES_NAVIRE[p].titre} required={p !== "jaugeage"} fichier={n.pieces[p] ?? ""} onChange={(nom) => majNavire(i, { pieces: { ...n.pieces, [p]: nom || undefined } })} error={voir(2) && p !== "jaugeage" && !n.pieces[p] ? "Pièce obligatoire." : undefined} />
                      <p className="mt-1 text-xs text-muted-foreground">{p === "propriete" && n.provenance === "neuf" ? "Certificat du constructeur (Builder's Certificate)." : PIECES_NAVIRE[p].detail}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            ))}
          </>
        )}

        {etape === 3 && (
          <>
            <Panel title="Récapitulatif" description="Vérifiez avant d'envoyer : la DGMM se fonde sur ces informations.">
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <Ligne t="Compagnie">{f.raisonSociale} · {f.segment}</Ligne>
                <Ligne t="RCCM / NIF"><span className="font-mono text-xs">{f.rccm.toUpperCase()} · {f.nif.toUpperCase()}</span></Ligne>
                <Ligne t="Siège">{f.adresseSiege}, {f.ville}{f.boitePostale ? ` · ${f.boitePostale}` : ""}</Ligne>
                <Ligne t="Responsable">{f.contactNom} · {f.tel}</Ligne>
                <Ligne t="Personne désignée à terre">{f.dpaNom} · {f.dpaTel}</Ligne>
                <Ligne t="Pièces de la compagnie">{Object.values(pieces).filter(Boolean).length} jointe(s)</Ligne>
              </dl>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Navire (nom proposé)</th><th>Port d'attache</th><th>OMI</th><th>Jauge</th><th>Indicatif</th><th>Effectif mini.</th></tr></thead>
                  <tbody>
                    {flotte.map((n, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 font-semibold text-primary">{n.nom.trim().toUpperCase()}<div className="text-[11px] font-normal text-warning">Soumis à l'approbation de la DGMM</div></td>
                        <td>{n.portAttache}</td>
                        <td className="font-mono text-xs">{imoNormalise(n.imo) || "—"}</td>
                        <td>{n.jauge} GT</td>
                        <td className="font-mono text-xs">{n.indicatifADemander ? "À attribuer" : n.indicatif.toUpperCase()}</td>
                        <td>{effectifMinimal(n.jauge)} (indicatif)</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel title="Identifiants de connexion">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Identifiant souhaité" htmlFor="identifiant" required error={voir(3) ? e4.identifiant : undefined}><input id="identifiant" className={inputClass} value={f.identifiant} onChange={(x) => up("identifiant", x.target.value)} autoComplete="username" /></Field>
                <Field label="Mot de passe" htmlFor="motDePasse" required error={voir(3) ? e4.motDePasse : undefined}><PasswordInput id="motDePasse" value={f.motDePasse} onChange={(v) => up("motDePasse", v)} /><JaugeMdp value={f.motDePasse} /></Field>
                <Field label="Confirmation" htmlFor="confirmation" required error={voir(3) ? e4.confirmation : undefined}><PasswordInput id="confirmation" value={f.confirmation} onChange={(v) => up("confirmation", v)} /></Field>
              </div>
            </Panel>
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm">
                <input id="ok" type="checkbox" className="mt-1" checked={certifie} onChange={(x) => setCertifie(x.target.checked)} />
                <span>Je certifie être habilité à représenter cette compagnie, l'exactitude des informations et l'authenticité des pièces jointes. Les originaux seront présentés au bureau d'immatriculation.</span>
              </label>
              {voir(3) && e4.certifie && <p className="text-xs text-destructive">{e4.certifie}</p>}
            </div>
          </>
        )}

        {voir(etape) && nbErreurs[etape]! > 0 && <p className="text-sm font-medium text-destructive" aria-live="polite">{nbErreurs[etape]} point(s) à corriger sur cette étape.</p>}

        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          {etape > 0 && <Button type="button" variant="outline" onClick={() => setEtape((x) => x - 1)}><ArrowLeft /> Précédent</Button>}
          {etape < 3 ? (
            <Button type="button" variant="gold" onClick={suivant}>Continuer <ArrowRight /></Button>
          ) : (
            <Button type="submit" variant="gold" size="lg"><ShieldCheck /> Envoyer la demande à la DGMM</Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={enregistrer}><Save /> Enregistrer le brouillon</Button>
          {brouillonLe && (
            <span className="text-xs text-muted-foreground">
              Brouillon du {new Date(brouillonLe).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} ·{" "}
              <button type="button" className="font-semibold text-destructive hover:underline" onClick={effacerBrouillon}>effacer</button>
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">Déjà un compte ? <Link to="/armateur" className="font-semibold text-primary hover:underline">Espace Armateurs</Link></span>
        </div>
      </form>
    </EcranConnexion>
  );
}

function Ligne({ t, children }: { t: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{t}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function FicheNavire({
  i, n, e, eSansAffichage, ouvert, onOuvrir, onChange, onRetirer,
}: {
  i: number;
  n: NavireDeclare;
  e: ErreursNavire;
  eSansAffichage: ErreursNavire;
  ouvert: boolean;
  onOuvrir: () => void;
  onChange: (p: Partial<NavireDeclare>) => void;
  onRetirer?: (() => void) | undefined;
}) {
  const id = (k: string) => `nav-${i}-${k}`;
  const nb = Object.keys(eSansAffichage).length;
  const nomLibre = nomNormalise(n.nom).length >= 2 && !eSansAffichage.nom;
  const imoRequis = imoObligatoire(n.categorie, n.jauge);
  const consequences = consequencesJauge(n.categorie, n.jauge);
  return (
    <section className={cn("overflow-hidden rounded-xl border bg-card shadow-card transition-shadow", ouvert && "ring-2 ring-gold/40")}>
      <header className="flex items-center gap-3 px-5 py-3">
        <button type="button" onClick={onOuvrir} aria-expanded={ouvert} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/8 text-primary"><Ship className="size-5" /></span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-primary">{n.nom.trim().toUpperCase() || `Navire ${i + 1}`}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {[n.portAttache, n.jauge ? `${n.jauge} GT` : "", imoNormalise(n.imo)].filter(Boolean).join(" · ") || "À compléter"}
            </span>
          </span>
          <span className={cn("ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", nb ? "bg-warning/15 text-warning" : "bg-success/12 text-success")}>{nb ? `${nb} à compléter` : "Complet"}</span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", ouvert && "rotate-180")} />
        </button>
        {onRetirer && <Button type="button" variant="ghost" size="icon" aria-label={`Retirer le navire ${i + 1}`} onClick={onRetirer}><Trash2 /></Button>}
      </header>
      {ouvert && (
        <div className="space-y-5 border-t px-5 py-4">
          {/* 1. Nom */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom proposé" htmlFor={id("nom")} aide="marquage" required error={e.nom ?? (eSansAffichage.nom && n.nom.trim() ? eSansAffichage.nom : undefined)} valid={nomLibre} hint={nomLibre ? "Nom libre sous pavillon gabonais : il sera soumis à l'approbation de la DGMM." : "Sans préfixe (MV, MT…) : il est ignoré pour vérifier l'unicité."}>
              <input id={id("nom")} className={cn(inputClass, "uppercase")} value={n.nom} onChange={(x) => onChange({ nom: x.target.value })} placeholder="OGOOUÉ EXPRESS" />
            </Field>
            <Field label="Port d'attache" htmlFor={id("port")} required error={e.portAttache}>
              <select id={id("port")} className={selectClass} value={n.portAttache} onChange={(x) => onChange({ portAttache: x.target.value })}><option value="">Choisir…</option>{PORTS_ATTACHE.map((p) => <option key={p}>{p}</option>)}</select>
            </Field>
          </div>
          <MarquageCoque nom={n.nom} port={n.portAttache} />

          {/* 2. Type et jauge */}
          <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
            <Field label="Catégorie de navire" htmlFor={id("cat")} required>
              <select id={id("cat")} className={selectClass} value={n.categorie} onChange={(x) => onChange({ categorie: x.target.value as CategorieNavire })}>
                {(Object.keys(CATEGORIES_NAVIRE) as CategorieNavire[]).map((c) => <option key={c} value={c}>{CATEGORIES_NAVIRE[c]}</option>)}
              </select>
            </Field>
            <Field label="Jauge brute (GT)" htmlFor={id("gt")} aide="jauge" required error={e.jauge} hint="Volume des espaces clos (Convention de 1969), pas un poids.">
              <input id={id("gt")} inputMode="numeric" className={inputClass} value={n.jauge || ""} onChange={(x) => onChange({ jauge: Number(x.target.value.replace(/\D/g, "")) || 0 })} placeholder="Ex. 1 850" />
            </Field>
          </div>
          {consequences.length > 0 && (
            <div className="rounded-lg bg-muted/60 p-3 text-xs">
              <div className="mb-1 font-semibold text-primary">Ce que cette jauge entraîne</div>
              <ul className="list-disc space-y-0.5 pl-4">
                {consequences.map((c) => <li key={c}>{c}</li>)}
                <li>Effectif minimal de sécurité indicatif : {effectifMinimal(n.jauge)} marins (le document officiel du navire fait foi).</li>
              </ul>
            </div>
          )}

          {/* 3. Identifiants */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={`Numéro OMI${imoRequis ? "" : " (facultatif)"}`} htmlFor={id("imo")} aide="omi" required={imoRequis} error={e.imo ?? (n.imo.trim() ? eSansAffichage.imo : undefined)} valid={!!imoNormalise(n.imo) && !eSansAffichage.imo} hint="« IMO » suivi de 7 chiffres">
              <input id={id("imo")} className={cn(inputClass, "font-mono uppercase")} value={n.imo} onChange={(x) => onChange({ imo: x.target.value })} placeholder="IMO 9074729" />
            </Field>
            <Field label="Indicatif d'appel radio" htmlFor={id("ind")} aide="indicatif" required={!n.indicatifADemander} error={e.indicatif}>
              <input id={id("ind")} disabled={n.indicatifADemander} className={cn(inputClass, "font-mono uppercase disabled:opacity-50")} value={n.indicatifADemander ? "" : n.indicatif} onChange={(x) => onChange({ indicatif: x.target.value })} placeholder="TR1234" />
              <label className="flex items-center gap-2 text-xs">
                <input id={id("ind-dem")} type="checkbox" checked={n.indicatifADemander} onChange={(x) => onChange({ indicatifADemander: x.target.checked })} />
                À attribuer par l'administration gabonaise
              </label>
            </Field>
            <Field label="MMSI (facultatif)" htmlFor={id("mmsi")} aide="mmsi" error={e.mmsi} hint="9 chiffres commençant par 626">
              <input id={id("mmsi")} inputMode="numeric" className={cn(inputClass, "font-mono")} value={n.mmsi} onChange={(x) => onChange({ mmsi: x.target.value })} placeholder="626123456" />
            </Field>
          </div>

          {/* 4. Technique et provenance */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Puissance propulsive (kW)" htmlFor={id("kw")} required error={e.puissanceKw} hint="Sert au calcul de l'effectif machine.">
              <input id={id("kw")} inputMode="numeric" className={inputClass} value={n.puissanceKw || ""} onChange={(x) => onChange({ puissanceKw: Number(x.target.value.replace(/\D/g, "")) || 0 })} />
            </Field>
            <Field label="Année de construction" htmlFor={id("an")} hint="Facultatif">
              <input id={id("an")} inputMode="numeric" maxLength={4} className={inputClass} value={n.anneeConstruction} onChange={(x) => onChange({ anneeConstruction: x.target.value.replace(/\D/g, "") })} />
            </Field>
            <Field label="Société de classification" htmlFor={id("classe")} aide="classe" required error={e.classe}>
              <select id={id("classe")} className={selectClass} value={n.classe} onChange={(x) => onChange({ classe: x.target.value })}><option value="">Choisir…</option>{SOCIETES_CLASSIFICATION.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
          </div>
          <fieldset className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
            <legend className="mb-1.5 text-sm font-medium">Provenance du navire <span className="text-destructive">*</span></legend>
            <div className="flex gap-2" role="radiogroup">
              {(["transfert", "neuf"] as const).map((p) => (
                <button key={p} type="button" role="radio" aria-checked={n.provenance === p} onClick={() => onChange({ provenance: p })} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", n.provenance === p ? "border-gold bg-gold text-gold-foreground" : "hover:border-gold")}>
                  {p === "transfert" ? "Vient d'un autre pavillon" : "Navire neuf"}
                </button>
              ))}
            </div>
            {n.provenance === "transfert" && (
              <Field label="Pavillon précédent" htmlFor={id("pav")} aide="radiation" required error={e.ancienPavillon}>
                <input id={id("pav")} className={inputClass} value={n.ancienPavillon} onChange={(x) => onChange({ ancienPavillon: x.target.value })} placeholder="Ex. Panama" />
              </Field>
            )}
          </fieldset>
        </div>
      )}
    </section>
  );
}

function Confirmation({ d }: { d: DemandeArmateur }) {
  return (
    <EcranConnexion profil="armateur" titre="Inscription armateur" accroche="Ouvrez le compte de votre compagnie et inscrivez votre flotte au registre gabonais." large>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-xl border border-success/40 bg-success/8 p-6 text-center">
          <CheckCircle2 className="mx-auto size-12 text-success" />
          <h1 className="mt-3 font-display text-2xl font-bold text-primary">Demande transmise à la DGMM</h1>
          <p className="mt-1 text-sm text-muted-foreground">Numéro de suivi de votre demande :</p>
          <div className="mx-auto mt-3 inline-block rounded-lg bg-primary px-5 py-2 font-mono text-xl font-bold text-gold">{d.numero}</div>
        </div>
        <Panel title="Et ensuite ?">
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>La DGMM examine le nom proposé pour chacun de vos {d.flotte?.length ?? d.navires.length} navire(s) et vous attribue l'indicatif d'appel si vous l'avez demandé.</li>
            <li>Présentez les originaux des pièces au bureau d'immatriculation (immeuble Santullo, Libreville).</li>
            <li>Après approbation, faites marquer le nom à la proue et à la poupe, avec le port d'attache à la poupe.</li>
            <li>Le compte est ensuite activé : connectez-vous avec l'identifiant <strong className="font-mono">{d.identifiant}</strong> pour déclarer vos rôles d'équipage.</li>
          </ol>
        </Panel>
        <div className="text-center"><Link to="/armateur" className="text-sm font-semibold text-primary hover:underline">Aller à l'Espace Armateurs</Link></div>
      </div>
    </EcranConnexion>
  );
}
