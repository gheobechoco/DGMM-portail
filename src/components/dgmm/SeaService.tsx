import { useMemo, useState } from "react";
import { Anchor, Plus, Ship } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  EmptyState,
  Field,
  Panel,
  StatCard,
  inputClass,
  selectClass,
} from "@/components/dgmm/Page";
import { StatusPill } from "@/components/dgmm/Brand";
import { Aide } from "@/components/dgmm/Aide";
import { FONCTIONS_BORD, TOUS_NAVIRES, TYPES_FLOTTE } from "@/lib/dgmm/maritime";
import { ajouterEmbarquement, formatDate, joursEmbarquement, type Marin } from "@/lib/dgmm/store";

/** Relevé des services en mer (sea service) : base des brevets STCW supérieurs. */
export function SeaService({ m, canEdit, auteur }: { m: Marin; canEdit: boolean; auteur: string }) {
  const list = useMemo(
    () => [...(m.embarquements ?? [])].sort((a, b) => b.embarquement.localeCompare(a.embarquement)),
    [m.embarquements],
  );
  const [open, setOpen] = useState(false);
  const total = list.reduce(
    (s, e) => s + (e.statut === "valide_dgmm" ? joursEmbarquement(e) : 0),
    0,
  );
  const joursEnAttente = list.reduce(
    (s, e) => s + (e.statut === "en_attente_validation" ? joursEmbarquement(e) : 0),
    0,
  );
  const enCours = list.find((e) => !e.debarquement || e.statut !== "valide_dgmm");
  const jaugeMax = Math.max(0, ...list.map((e) => e.jauge));
  const mois = Math.floor(total / 30.4);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Temps de navigation"
          value={`${total} j`}
          icon={Anchor}
          hint={`soit ${mois} mois de service en mer`}
        />
        <StatCard label="Embarquements" value={list.length} icon={Ship} />
        <StatCard
          label="En attente de visa DGMM"
          value={`${joursEnAttente} j`}
          icon={Anchor}
          tone="warning"
          hint="durée informative, non créditée"
        />
        <StatCard
          label="Plus forte jauge"
          value={jaugeMax ? `${jaugeMax.toLocaleString("fr-FR")} GT` : "—"}
          icon={Ship}
          tone="gold"
        />
        <StatCard
          label="Situation actuelle"
          value={
            enCours?.statut === "en_attente_validation"
              ? "Débarquement en attente"
              : enCours?.statut === "rejete"
                ? "À bord · rejet DGMM"
                : enCours
                  ? "À bord"
                  : "À terre / disponible"
          }
          icon={Anchor}
          tone={
            enCours?.statut === "rejete"
              ? "danger"
              : enCours?.statut === "en_attente_validation"
                ? "warning"
                : enCours
                  ? "success"
                  : "primary"
          }
          hint={
            enCours ? `${enCours.navire} depuis le ${formatDate(enCours.embarquement)}` : undefined
          }
        />
      </div>

      <Panel
        title={
          <span className="inline-flex items-center gap-1.5">
            Relevé des services en mer <Aide terme="seaService" />
          </span>
        }
        description="Seuls les embarquements visés par la DGMM sont crédités au temps officiel de mer. Les lignes en attente sont informatives."
        bodyClassName="p-0"
        actions={
          canEdit && (
            <Button
              size="sm"
              variant="gold"
              onClick={() => setOpen(true)}
              disabled={!!enCours}
              title={enCours ? "Enregistrez d'abord le débarquement en cours" : undefined}
            >
              <Plus /> Embarquement
            </Button>
          )
        }
      >
        {list.length === 0 ? (
          <EmptyState icon={Ship} title="Aucun embarquement inscrit" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Navire</th>
                  <th className="px-3 py-2.5 font-semibold">Type · jauge</th>
                  <th className="px-3 py-2.5 font-semibold">Fonction à bord</th>
                  <th className="px-3 py-2.5 font-semibold">Embarquement</th>
                  <th className="px-3 py-2.5 font-semibold">Débarquement</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Durée</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.map((e) => (
                  <tr key={e.id}>
                    <td className="px-5 py-2.5">
                      <div className="font-semibold text-primary">{e.navire}</div>
                      <div className="text-xs text-muted-foreground">
                        IMO {e.imo} · {e.armateur}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {e.typeNavire}
                      <div className="text-xs tabular-nums">
                        {e.jauge.toLocaleString("fr-FR")} GT
                      </div>
                    </td>
                    <td className="px-3 py-2.5">{e.fonction}</td>
                    <td className="px-3 py-2.5 tabular-nums">{formatDate(e.embarquement)}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {e.debarquement ? (
                        formatDate(e.debarquement)
                      ) : (
                        <StatusPill status="valide" label="À bord" />
                      )}
                      {e.statut === "en_attente_validation" && (
                        <span className="mt-1 block text-xs font-semibold text-warning">
                          🟡 En attente de visa DGMM
                        </span>
                      )}
                      {e.statut === "rejete" && (
                        <span className="mt-1 block text-xs font-semibold text-destructive">
                          🔴 Rejeté : {e.motifRejet ?? "motif à vérifier"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold tabular-nums">
                      {joursEmbarquement(e)} j
                      {e.statut === "en_attente_validation" && (
                        <span className="block text-xs font-normal text-warning">informatif</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/40">
                  <td
                    colSpan={5}
                    className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Total du service en mer
                  </td>
                  <td className="px-5 py-2.5 text-right font-display font-bold tabular-nums text-primary">
                    {total} j
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>

      <EmbarquementDialog open={open} onOpenChange={setOpen} m={m} auteur={auteur} />
    </div>
  );
}

function EmbarquementDialog({
  open,
  onOpenChange,
  m,
  auteur,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  m: Marin;
  auteur: string;
}) {
  const navires = TOUS_NAVIRES;
  const [navire, setNavire] = useState("");
  const [autre, setAutre] = useState({
    nom: "",
    imo: "",
    type: TYPES_FLOTTE[0] as string,
    jauge: "",
    armateur: "",
  });
  const [fonction, setFonction] = useState(
    FONCTIONS_BORD.includes(m.profession) ? m.profession : "Matelot",
  );
  const [debut, setDebut] = useState(new Date().toISOString().slice(0, 10));
  const [fin, setFin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const nav = navires.find((n) => n.nom === navire);

  const submit = () => {
    const data = nav
      ? {
          navire: nav.nom,
          imo: nav.imo,
          typeNavire: nav.type,
          jauge: nav.jauge,
          armateur: nav.armateur,
        }
      : {
          navire: autre.nom.trim(),
          imo: autre.imo.trim(),
          typeNavire: autre.type,
          jauge: Number(autre.jauge),
          armateur: autre.armateur.trim(),
        };
    if (!data.navire) return setErr("Choisissez ou saisissez le navire.");
    if (!/^\d{7}$/.test(data.imo)) return setErr("Le numéro IMO comporte 7 chiffres.");
    if (!data.jauge || data.jauge < 1) return setErr("Indiquez la jauge brute.");
    if (!debut) return setErr("Indiquez la date d'embarquement.");
    if (fin && fin < debut) return setErr("Le débarquement doit suivre l'embarquement.");
    const chevauche = (m.embarquements ?? []).some(
      (e) => debut <= (e.debarquement || "9999-12-31") && (fin || "9999-12-31") >= e.embarquement,
    );
    if (chevauche) return setErr("Cette période chevauche un embarquement déjà inscrit.");
    ajouterEmbarquement(
      m.id,
      { ...data, fonction, embarquement: debut, debarquement: fin },
      auteur,
    );
    toast.success(`Embarquement sur ${data.navire} inscrit au livret`);
    setErr(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Inscrire un embarquement</DialogTitle>
        <DialogDescription>
          Mention portée au relevé des services en mer de {m.prenom} {m.nom}.
        </DialogDescription>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Navire" htmlFor="navire" className="sm:col-span-2">
            <select
              id="navire"
              className={selectClass}
              value={navire}
              onChange={(e) => setNavire(e.target.value)}
            >
              <option value="">Autre navire (saisie manuelle)…</option>
              {navires.map((n) => (
                <option key={n.imo} value={n.nom}>
                  {n.nom} — {n.armateur} ({n.jauge} GT)
                </option>
              ))}
            </select>
          </Field>
          {!nav && (
            <>
              <Field label="Nom du navire" htmlFor="a-nom">
                <input
                  id="a-nom"
                  className={inputClass}
                  value={autre.nom}
                  onChange={(e) => setAutre({ ...autre, nom: e.target.value })}
                />
              </Field>
              <Field label="N° IMO" htmlFor="a-imo">
                <input
                  id="a-imo"
                  inputMode="numeric"
                  className={inputClass}
                  value={autre.imo}
                  onChange={(e) => setAutre({ ...autre, imo: e.target.value })}
                />
              </Field>
              <Field label="Type" htmlFor="a-type">
                <select
                  id="a-type"
                  className={selectClass}
                  value={autre.type}
                  onChange={(e) => setAutre({ ...autre, type: e.target.value })}
                >
                  {TYPES_FLOTTE.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Jauge brute (GT)" aide="jauge" htmlFor="a-jauge">
                <input
                  id="a-jauge"
                  inputMode="numeric"
                  className={inputClass}
                  value={autre.jauge}
                  onChange={(e) => setAutre({ ...autre, jauge: e.target.value })}
                />
              </Field>
              <Field label="Armateur" htmlFor="a-arm" className="sm:col-span-2">
                <input
                  id="a-arm"
                  className={inputClass}
                  value={autre.armateur}
                  onChange={(e) => setAutre({ ...autre, armateur: e.target.value })}
                />
              </Field>
            </>
          )}
          <Field label="Fonction à bord" htmlFor="fonction" className="sm:col-span-2">
            <select
              id="fonction"
              className={selectClass}
              value={fonction}
              onChange={(e) => setFonction(e.target.value)}
            >
              {[...new Set([...FONCTIONS_BORD, m.profession])].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field label="Embarquement" htmlFor="debut">
            <input
              id="debut"
              type="date"
              className={inputClass}
              value={debut}
              onChange={(e) => setDebut(e.target.value)}
            />
          </Field>
          <Field label="Débarquement" htmlFor="fin" hint="Laisser vide si le marin est à bord">
            <input
              id="fin"
              type="date"
              className={inputClass}
              value={fin}
              onChange={(e) => setFin(e.target.value)}
            />
          </Field>
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="gold" onClick={submit}>
            Inscrire au livret
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
