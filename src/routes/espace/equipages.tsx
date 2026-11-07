import { Pagination, usePagination } from "@/components/dgmm/Listes";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, FileSearch, Ship, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { RequirePerm } from "@/components/dgmm/Guard";
import {
  EmptyState,
  Field,
  PageHeader,
  Panel,
  StatCard,
  selectClass,
} from "@/components/dgmm/Page";
import { SectionStatistiques, LienStatistiques } from "@/components/dgmm/Statistiques";
import { RoleCard, aptitudeAu } from "@/components/dgmm/RoleCard";
import { Aide } from "@/components/dgmm/Aide";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DocViewer } from "@/components/dgmm/DocViewer";
import { can, certificateStatus } from "@/lib/dgmm/rules";
import { STATIONS } from "@/lib/dgmm/maritime";
import {
  formatDate,
  lastCertificate,
  rejeterEmbarquementDgmm,
  useMarins,
  useRoles,
  useVisites,
  validerRoleEquipageDgmm,
  type Embarquement,
  type Marin,
  type RoleEquipage,
} from "@/lib/dgmm/store";
import type { Account } from "@/lib/dgmm/auth";

export const Route = createFileRoute("/espace/equipages")({
  head: () => ({ meta: [{ title: "Rôles d'équipage — GDM | DGMM" }] }),
  component: () => (
    <RequirePerm perm="roles.lecture">{(session) => <Equipages session={session} />}</RequirePerm>
  ),
});

/** Consultation (lecture seule) des rôles d'équipage déclarés par les armateurs. */
function Equipages({ session }: { session: Account }) {
  const roles = useRoles();
  const marins = useMarins();
  const visites = useVisites();
  const [armateur, setArmateur] = useState("");
  const liste = useMemo(
    () =>
      [...roles]
        .filter((r) => !armateur || r.armateur === armateur)
        .sort((a, b) => a.appareillage.localeCompare(b.appareillage)),
    [roles, armateur],
  );
  const conforme = (r: (typeof roles)[number]) =>
    r.membres.length > 0 &&
    r.membres.every((x) => {
      const { st } = aptitudeAu(
        marins.find((m) => m.id === x.marinId),
        visites,
        r.appareillage,
      );
      return st === "valide" || st === "expire_bientot";
    });
  const nbOk = liste.filter(conforme).length;
  const pg = usePagination(liste, 6);

  return (
    <>
      <PageHeader
        eyebrow="Contrôle des armements"
        title="Rôles d'équipage"
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            Rôles déclarés par les armateurs, avec la conformité médicale à la date d'appareillage{" "}
            <Aide terme="role" />
          </span>
        }
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            {can(session.role, "embarquements.valider") ? (
              <>
                <ShieldCheck className="size-3.5" /> Contrôle DGMM
              </>
            ) : (
              <>
                <Eye className="size-3.5" /> Lecture seule
              </>
            )}
          </span>
        }
      />
      <LienStatistiques theme="equipages" texte="Rôles déclarés et conformité des équipages par armateur" />
      <Panel
        bodyClassName="space-y-4"
        actions={
          <label>
            <span className="sr-only">Armateur</span>
            <select
              className={selectClass}
              value={armateur}
              onChange={(e) => setArmateur(e.target.value)}
            >
              <option value="">Tous les armateurs</option>
              {[...new Set(roles.map((r) => r.armateur))].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        }
        title="Appareillages"
      >
        {liste.length === 0 ? (
          <EmptyState icon={Ship} title="Aucun rôle d'équipage déclaré" />
        ) : (
          <div className="stagger space-y-4">
            {pg.visibles.map((r) => (
              <div key={r.id}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-secondary">
                  {r.armateur}
                </div>
                <RoleCard r={r} marins={marins} visites={visites} />
              </div>
            ))}
            <Pagination {...pg} className="rounded-lg border bg-card" />
          </div>
        )}
      </Panel>
      <MouvementsAttente
        roles={roles}
        marins={marins}
        agent={session.nom}
        visites={visites}
        peutValider={can(session.role, "embarquements.valider")}
      />
    </>
  );
}

const MOTIFS_REJET = [
  "Tampon manquant ou illisible",
  "Incohérence de dates",
  "Dossier incomplet",
] as const;

function MouvementsAttente({
  roles,
  marins,
  agent,
  visites,
  peutValider,
}: {
  roles: RoleEquipage[];
  marins: Marin[];
  agent: string;
  visites: ReturnType<typeof useVisites>;
  peutValider: boolean;
}) {
  const [station, setStation] = useState(STATIONS[0]?.nom ?? "");
  const [motif, setMotif] = useState<(typeof MOTIFS_REJET)[number]>(MOTIFS_REJET[0]);
  const [rejeter, setRejeter] = useState<{ marinId: number; embId: number } | null>(null);
  const [document, setDocument] = useState<{ titre: string; value: string } | null>(null);
  const groupes = roles
    .map((role) => ({
      role,
      lignes: marins.flatMap((marin) =>
        (marin.embarquements ?? [])
          .filter((emb) => emb.roleId === role.id && emb.statut === "en_attente_validation")
          .map((emb) => ({ marin, emb })),
      ),
    }))
    .filter(({ lignes }) => lignes.length > 0);
  const nombre = groupes.reduce((sum, group) => sum + group.lignes.length, 0);

  const valider = (role: RoleEquipage) => {
    try {
      const jours = validerRoleEquipageDgmm(role.id, station, agent);
      toast.success("Rôle d'équipage validé par la DGMM", {
        description: `${role.navire} · ${groupes.find((g) => g.role.id === role.id)?.lignes.length ?? 0} marin(s) libéré(s) · ${jours} jour(s) de mer crédité(s).`,
      });
    } catch (error) {
      toast.error("Validation impossible", {
        description: error instanceof Error ? error.message : "Le rôle n'a pas pu être validé.",
      });
    }
  };

  const confirmerRejet = () => {
    if (!rejeter) return;
    try {
      rejeterEmbarquementDgmm(rejeter.marinId, rejeter.embId, motif, agent);
      toast.success("Débarquement rejeté", { description: motif });
      setRejeter(null);
    } catch (error) {
      toast.error("Rejet impossible", {
        description:
          error instanceof Error ? error.message : "Le débarquement n'a pas pu être rejeté.",
      });
    }
  };

  return (
    <>
      <Panel
        title="Mouvements d'équipages en attente de visa"
        description="Les marins restent administrativement à bord jusqu'au visa de l'agent DGMM. Chaque validation groupe crédite leur temps de mer officiel."
        className="mt-6"
        actions={
          <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
            {nombre} marin(s)
          </span>
        }
      >
        {groupes.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Aucun débarquement en attente">
            Les lots transmis par les armateurs apparaîtront ici.
          </EmptyState>
        ) : (
          <div className="space-y-5">
            {peutValider && (
              <Field label="Station de validation" htmlFor="station-validation-mouvements">
                <select
                  id="station-validation-mouvements"
                  className={selectClass}
                  value={station}
                  onChange={(event) => setStation(event.target.value)}
                >
                  {STATIONS.map((item) => (
                    <option key={item.code} value={item.nom}>
                      {item.nom}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {groupes.map(({ role, lignes }) => (
              <article key={role.id} className="overflow-hidden rounded-lg border">
                <header className="flex flex-wrap items-center gap-3 bg-primary/5 px-4 py-3">
                  <Ship className="size-5 text-primary" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-semibold text-primary">{role.navire}</h3>
                    <p className="text-xs text-muted-foreground">
                      OMI {role.navireImo ?? "non renseigné"} · {role.armateur} · rôle {role.id} ·{" "}
                      {lignes.length} marin(s)
                    </p>
                  </div>
                  {role.justificatifDebarquement && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setDocument({
                          titre: `Rôle de désarmement — ${role.navire}`,
                          value: role.justificatifDebarquement!,
                        })
                      }
                    >
                      <FileSearch /> Voir le rôle de désarmement
                    </Button>
                  )}
                  {peutValider && (
                    <Button type="button" size="sm" variant="gold" onClick={() => valider(role)}>
                      <ShieldCheck /> Valider tout le rôle
                    </Button>
                  )}
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2">Marin</th>
                        <th className="px-3 py-2">Fin de campagne</th>
                        <th className="px-3 py-2">Contrôles médicaux / Ishihara</th>
                        <th className="px-3 py-2">Tampon physique</th>
                        {peutValider && <th className="px-4 py-2 text-right">Décision</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {lignes.map(({ marin, emb }) => (
                        <LigneMouvement
                          key={`${marin.id}:${emb.id}`}
                          marin={marin}
                          embarquement={emb}
                          role={role}
                          visites={visites}
                          peutValider={peutValider}
                          onVoir={(titre, value) => setDocument({ titre, value })}
                          onRejeter={() => setRejeter({ marinId: marin.id, embId: emb.id })}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
      <DocViewer
        titre={document?.titre ?? ""}
        value={document?.value}
        open={!!document}
        onOpenChange={(open) => !open && setDocument(null)}
      />
      <Dialog open={!!rejeter} onOpenChange={(open) => !open && setRejeter(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle>Rejeter le débarquement</DialogTitle>
          <DialogDescription>
            Le marin restera à bord jusqu'à la transmission d'un nouveau justificatif et au visa
            DGMM.
          </DialogDescription>
          <Field label="Motif du rejet" htmlFor="motif-rejet-debarquement">
            <select
              id="motif-rejet-debarquement"
              className={selectClass}
              value={motif}
              onChange={(event) => setMotif(event.target.value as (typeof MOTIFS_REJET)[number])}
            >
              {MOTIFS_REJET.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRejeter(null)}>
              Annuler
            </Button>
            <Button type="button" variant="destructive" onClick={confirmerRejet}>
              Rejeter avec motif
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LigneMouvement({
  marin,
  embarquement,
  role,
  visites,
  peutValider,
  onVoir,
  onRejeter,
}: {
  marin: Marin;
  embarquement: Embarquement;
  role: RoleEquipage;
  visites: ReturnType<typeof useVisites>;
  peutValider: boolean;
  onVoir: (titre: string, value: string) => void;
  onRejeter: () => void;
}) {
  const certificat = lastCertificate(visites, marin.id);
  const dateControle = new Date(embarquement.debarquement);
  const medicalOk =
    !!certificat &&
    (certificateStatus(certificat.stcw.validJusquau, dateControle) === "valide" ||
      certificateStatus(certificat.stcw.validJusquau, dateControle) === "expire_bientot");
  const ishiharaOk =
    medicalOk &&
    certificat?.stcw.couleurs === "oui" &&
    !!certificat.stcw.dateTestCouleurs &&
    new Date(certificat.stcw.dateTestCouleurs) <= dateControle;
  return (
    <tr>
      <td className="px-4 py-3">
        <div className="font-medium">
          {marin.nom} {marin.prenom}
        </div>
        <div className="font-mono text-xs text-muted-foreground">{marin.nip}</div>
      </td>
      <td className="px-3 py-3 tabular-nums">{formatDate(embarquement.debarquement)}</td>
      <td className="px-3 py-3">
        <div className={medicalOk ? "text-success" : "text-destructive"}>
          {medicalOk ? "🟢" : "🔴"} Aptitude médicale
        </div>
        <div className={ishiharaOk ? "text-success" : "text-destructive"}>
          {ishiharaOk ? "🟢" : "🔴"} Ishihara
        </div>
      </td>
      <td className="px-3 py-3">
        {embarquement.justificatifTampon ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onVoir(
                `Tampon physique — ${marin.nom} ${marin.prenom} · ${role.navire}`,
                embarquement.justificatifTampon!,
              )
            }
          >
            <FileSearch /> Voir le tampon du navire
          </Button>
        ) : (
          <span className="text-xs text-destructive">Justificatif absent</span>
        )}
      </td>
      {peutValider && (
        <td className="px-4 py-3 text-right">
          <Button type="button" size="sm" variant="destructive" onClick={onRejeter}>
            Rejeter avec motif
          </Button>
        </td>
      )}
    </tr>
  );
}
