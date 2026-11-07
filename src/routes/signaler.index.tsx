import { Aide } from "@/components/dgmm/Aide";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { CheckCircle2, Copy, EyeOff, ImagePlus, Lock, Send, ShieldCheck, Siren, Trash2 } from "lucide-react";
import { PublicShell } from "@/components/dgmm/PublicShell";
import { Field, Panel, inputClass, selectClass, textareaClass } from "@/components/dgmm/Page";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { marinSession } from "@/lib/dgmm/auth";
import { STATIONS, TOUS_NAVIRES } from "@/lib/dgmm/maritime";
import { ENTREPRISES_CHOIX, fullName, useMarins } from "@/lib/dgmm/store";
import { CATEGORIES, NIVEAUX, deposerAlerte, destinataires, lirePiece, type Alerte, type Niveau, type Piece, type Syndicat } from "@/lib/dgmm/alertes";

export const Route = createFileRoute("/signaler/")({
  head: () => ({ meta: [{ title: "Signaler un danger ou un abus — DGMM" }] }),
  component: Signaler,
});

function Signaler() {
  const id = marinSession.use();
  const marin = useMarins().find((m) => String(m.id) === id);
  const [anonyme, setAnonyme] = useState(true);
  const [niveau, setNiveau] = useState<Niveau | "">("");
  const [f, setF] = useState({ categorie: "", navire: "", armateur: "", lieu: "", dateFaits: new Date().toISOString().slice(0, 10), description: "", nom: "", tel: "" });
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [syndicat, setSyndicat] = useState<Syndicat>("aucun");
  const [tente, setTente] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<Alerte | null>(null);
  const [copie, setCopie] = useState(false);
  const up = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const e: Partial<Record<"niveau" | "categorie" | "description" | "ou" | "nom", string>> = {};
  if (!niveau) e.niveau = "Choisissez la gravité.";
  if (!f.categorie) e.categorie = "Choisissez le type de problème.";
  if (f.description.trim().length < 20) e.description = "Décrivez les faits en quelques phrases (20 caractères au moins).";
  if (!f.navire.trim() && !f.armateur.trim() && !f.lieu.trim()) e.ou = "Indiquez au moins le navire, la compagnie ou le lieu.";
  if (!anonyme && !marin && !f.nom.trim()) e.nom = "Indiquez votre nom, ou cochez « anonyme ».";
  const err = (k: keyof typeof e) => (tente ? e[k] : undefined);

  const ajouter = async (files: FileList | null) => {
    setErreur(null);
    for (const file of [...(files ?? [])].slice(0, 4 - pieces.length)) {
      const r = await lirePiece(file);
      if (typeof r === "string") setErreur(r);
      else setPieces((p) => [...p, r]);
    }
  };

  const envoyer = (ev: FormEvent) => {
    ev.preventDefault();
    setTente(true);
    if (Object.keys(e).length || !niveau) return;
    const r = deposerAlerte({
      niveau, categorie: f.categorie, description: f.description.trim(), navire: f.navire.trim(), armateur: f.armateur.trim(), lieu: f.lieu.trim(), dateFaits: f.dateFaits,
      pieces, anonyme, syndicat,
      marinId: !anonyme && marin ? marin.id : undefined,
      declarant: anonyme ? undefined : marin ? `${fullName(marin)} (${marin.nip})` : `${f.nom.trim()}${f.tel.trim() ? ` · ${f.tel.trim()}` : ""}`,
    });
    if (typeof r === "string") return setErreur(r);
    setFait(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (fait) {
    return (
      <PublicShell titre="Signalement">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="rounded-xl border border-success/40 bg-success/8 p-6 text-center">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h1 className="mt-3 font-display text-2xl font-bold text-primary">Signalement transmis</h1>
            <p className="mt-1 text-sm text-muted-foreground">Dossier {fait.numero}. Notez votre code de suivi : c'est le seul moyen de retrouver votre signalement{fait.anonyme ? ", car il ne contient pas votre identité" : ""}.</p>
            <div className="mx-auto mt-4 inline-flex items-center gap-3 rounded-lg bg-primary px-5 py-3">
              <span className="select-all font-mono text-2xl font-bold tracking-widest text-gold">{fait.code}</span>
              <button type="button" aria-label="Copier le code" className="text-primary-foreground/80 hover:text-gold" onClick={() => { navigator.clipboard.writeText(fait.code).then(() => setCopie(true), () => setCopie(false)); }}><Copy className="size-5" /></button>
            </div>
            {copie && <p className="mt-2 text-xs text-success">Code copié.</p>}
          </div>
          <Panel title="Où part votre signalement ?">
            <ul className="space-y-2 text-sm">{destinataires(fait).map((d) => <li key={d} className="flex gap-2"><Send className="mt-0.5 size-4 shrink-0 text-secondary" />{d}</li>)}</ul>
            <p className="mt-3 text-xs text-muted-foreground">Il est transmis directement, sans passer par la station maritime locale.</p>
            {fait.niveau === "rouge" && <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">Danger grave : une inspection d'urgence est demandée au prochain port.</p>}
          </Panel>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/signaler/suivi" search={{ code: fait.code }} className="font-semibold text-primary hover:underline">Suivre mon signalement</Link>
            <Link to="/" className="font-semibold text-primary hover:underline">Retour à l'accueil</Link>
          </div>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell titre="Signalement">
      <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-destructive">Alerte et signalement</div>
          <h1 className="mt-1 font-display text-3xl font-bold text-primary">Signaler un danger ou un abus</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Sécurité à bord, salaire non versé, contrat absent, conditions de vie, pression ou menace : votre signalement part directement à la Direction générale à Libreville et à l'Inspection du travail maritime, sans passer par la station locale.</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-sm shadow-card">
          <div className="flex items-center gap-2 font-semibold text-primary"><Lock className="size-4" /> Votre protection</div>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            <li>En mode anonyme, votre nom, votre NIP et votre appareil ne sont pas enregistrés.</li>
            <li>Vous suivez la réponse avec un code que vous seul connaissez.</li>
            <li>Vous pouvez aussi prévenir votre syndicat.</li>
          </ul>
        </div>
      </div>
      <form onSubmit={envoyer} noValidate className="space-y-6">
        <Panel title={<span className="inline-flex items-center gap-1.5">1. Gravité <Aide terme="feux" /></span>}>
          <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Gravité">
            {(Object.keys(NIVEAUX) as Niveau[]).map((n) => (
              <button key={n} type="button" role="radio" aria-checked={niveau === n} onClick={() => setNiveau(n)} className={cn("rounded-xl border-2 p-4 text-left transition-colors", niveau === n ? "bg-card shadow-card" : "border-border hover:border-[color:var(--c)]")} style={{ ["--c" as string]: NIVEAUX[n].couleur, borderColor: niveau === n ? NIVEAUX[n].couleur : undefined }}>
                <span className="flex items-center gap-2"><span className="size-3.5 rounded-full" style={{ background: NIVEAUX[n].couleur }} /><span className="font-semibold text-primary">{NIVEAUX[n].titre}</span></span>
                <span className="mt-1 block text-xs text-muted-foreground">{NIVEAUX[n].texte}</span>
                <span className="mt-2 block text-xs italic text-muted-foreground">Ex. : {NIVEAUX[n].exemples}</span>
              </button>
            ))}
          </div>
          {err("niveau") && <p className="mt-2 text-xs text-destructive">{err("niveau")}</p>}
        </Panel>

        <Panel title="2. Les faits">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type de problème" htmlFor="al-cat" required error={err("categorie")}>
              <select id="al-cat" className={selectClass} value={f.categorie} onChange={(x) => up("categorie", x.target.value)}><option value="">Choisir…</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Date des faits" htmlFor="al-date"><input id="al-date" type="date" className={inputClass} value={f.dateFaits} max={new Date().toISOString().slice(0, 10)} onChange={(x) => up("dateFaits", x.target.value)} /></Field>
            <Field label="Navire" htmlFor="al-navire" error={err("ou")}>
              <input id="al-navire" list="al-navires" className={inputClass} value={f.navire} onChange={(x) => up("navire", x.target.value)} placeholder="Nom du navire ou de la plateforme" />
              <datalist id="al-navires">{TOUS_NAVIRES.map((n) => <option key={n.imo} value={n.nom}>{n.armateur}</option>)}</datalist>
            </Field>
            <Field label="Compagnie (armateur)" htmlFor="al-armateur">
              <input id="al-armateur" list="al-armateurs" className={inputClass} value={f.armateur} onChange={(x) => up("armateur", x.target.value)} />
              <datalist id="al-armateurs">{ENTREPRISES_CHOIX.map((n) => <option key={n} value={n} />)}</datalist>
            </Field>
            <Field label="Lieu" htmlFor="al-lieu" className="sm:col-span-2">
              <input id="al-lieu" list="al-lieux" className={inputClass} value={f.lieu} onChange={(x) => up("lieu", x.target.value)} placeholder="Port, zone de mouillage, plateforme, position…" />
              <datalist id="al-lieux">{STATIONS.map((s) => <option key={s.code} value={s.ville} />)}</datalist>
            </Field>
            <Field label="Ce qui s'est passé" htmlFor="al-desc" required error={err("description")} className="sm:col-span-2">
              <textarea id="al-desc" className={cn(textareaClass, "min-h-28")} value={f.description} onChange={(x) => up("description", x.target.value)} placeholder="Décrivez les faits : quoi, depuis quand, qui est concerné. N'écrivez pas votre nom si vous voulez rester anonyme." />
            </Field>
          </div>
        </Panel>

        <Panel title="3. Preuves (facultatif)" description="Photos (réduites automatiquement) ou courte vidéo de 2 Mo au plus ; 4 fichiers maximum.">
          <div className="flex flex-wrap gap-3">
            {pieces.map((p, i) => (
              <div key={i} className="relative size-24 overflow-hidden rounded-lg border">
                {p.type.startsWith("image/") ? <img src={p.data} alt={p.nom} className="size-full object-cover" /> : <video src={p.data} className="size-full object-cover" muted />}
                <button type="button" aria-label={`Retirer ${p.nom}`} onClick={() => setPieces((l) => l.filter((_, j) => j !== i))} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-card/90 text-destructive"><Trash2 className="size-3.5" /></button>
              </div>
            ))}
            {pieces.length < 4 && (
              <label className="grid size-24 cursor-pointer place-items-center rounded-lg border border-dashed text-center text-xs text-muted-foreground hover:border-gold">
                <span><ImagePlus className="mx-auto mb-1 size-5" />Ajouter</span>
                <input id="al-pieces" type="file" accept="image/*,video/*" capture="environment" multiple className="sr-only" onChange={(x) => { void ajouter(x.target.files); x.target.value = ""; }} />
              </label>
            )}
          </div>
          {erreur && <p className="mt-2 text-xs text-destructive">{erreur}</p>}
        </Panel>

        <Panel title={<span className="inline-flex items-center gap-1.5">4. Votre identité et votre syndicat <Aide terme="anonymat" /></span>}>
          <label className="choix flex cursor-pointer items-start gap-3" data-actif={anonyme}>
            <input id="al-anonyme" type="checkbox" className="mt-1" checked={anonyme} onChange={(x) => setAnonyme(x.target.checked)} />
            <span className="text-sm"><span className="flex items-center gap-1.5 font-semibold text-primary"><EyeOff className="choix-icone size-4" /> Signalement anonyme</span><span className="text-muted-foreground">Aucune donnée permettant de vous identifier n'est enregistrée.</span></span>
          </label>
          {!anonyme && (
            marin ? (
              <p className="mt-3 text-sm">Signalement au nom de <strong>{fullName(marin)}</strong> ({marin.nip}).</p>
            ) : (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Nom et prénom" htmlFor="al-nom" required error={err("nom")}><input id="al-nom" className={inputClass} value={f.nom} onChange={(x) => up("nom", x.target.value)} /></Field>
                <Field label="Téléphone (pour être rappelé)" htmlFor="al-tel"><input id="al-tel" type="tel" className={inputClass} value={f.tel} onChange={(x) => up("tel", x.target.value)} /></Field>
              </div>
            )
          )}
          <div className="mt-4 text-sm font-medium">Prévenir aussi les délégués d'un syndicat</div>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Syndicat">
            {(["aucun", "OMEPR", "SYNAMM"] as Syndicat[]).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={syndicat === s} onClick={() => setSyndicat(s)} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", syndicat === s ? "border-gold bg-gold text-gold-foreground" : "hover:border-gold")}>{s === "aucun" ? "Aucun" : s}</button>
            ))}
          </div>
        </Panel>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" variant="destructive" size="lg"><Siren /> Envoyer le signalement</Button>
          {tente && Object.keys(e).length > 0 && <span className="text-sm text-destructive">{Object.keys(e).length} point(s) à compléter.</span>}
          <Link to="/signaler/suivi" className="text-sm font-semibold text-primary hover:underline">J'ai déjà un code de suivi</Link>
        </div>
        <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" /> En cas de danger immédiat en mer, appelez d'abord les secours sur le canal VHF 16.</p>
      </form>
    </PublicShell>
  );
}
