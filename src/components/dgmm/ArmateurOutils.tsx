import { useState } from "react";
import { Building2, CheckCircle2, FileText, Hash, XCircle } from "lucide-react";
import { Panel } from "@/components/dgmm/Page";
import { Input } from "@/components/ui/input";
import { imoValide } from "@/lib/dgmm/conformite";
import { cn } from "@/lib/utils";

const ETAPES = [
  "Préparer le dossier : titre de propriété, certificat de jauge, NIF et RCCM de l'armateur.",
  "Déposer le dossier au bureau d'immatriculation maritime (3ᵉ étage, immeuble Santullo, Libreville).",
  "Contrôle documentaire et inspection du navire par la DGMM.",
  "Délivrance de l'acte de francisation et du certificat d'immatriculation sous pavillon gabonais.",
  "Déclarer ensuite les rôles d'équipage ici, dans GDM, avant chaque appareillage.",
];

export function ArmateurOutils() {
  const [imo, setImo] = useState("");
  const saisi = imo.replace(/\D/g, "").length === 7;
  const ok = imoValide(imo);
  return (
    <div className="mb-6 grid gap-6 lg:grid-cols-2">
      <Panel
        title={
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="size-4" /> Pavillonnement et immatriculation
          </span>
        }
        description="Démarches au guichet DGMM — Immeuble Santullo, Libreville"
      >
        <ol className="space-y-2 text-sm">
          {ETAPES.map((e, i) => (
            <li key={e} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span>{e}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <FileText className="mt-0.5 size-3.5 shrink-0" /> Liste indicative : la liste officielle
          des pièces est remise par le bureau d'immatriculation.
        </p>
      </Panel>
      <Panel
        title={
          <span className="inline-flex items-center gap-1.5">
            <Hash className="size-4" /> Vérifier un numéro OMI
          </span>
        }
        description="Contrôle de la clé du numéro OMI à 7 chiffres d'un navire"
      >
        <Input
          value={imo}
          onChange={(e) => setImo(e.target.value)}
          placeholder="Ex. IMO 9074729"
          inputMode="numeric"
          aria-label="Numéro OMI"
        />
        {saisi && (
          <div
            className={cn(
              "mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
              ok ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground",
            )}
          >
            {ok ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
            {ok ? "Numéro OMI cohérent" : "Clé de contrôle invalide — vérifiez la saisie"}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Ce test vérifie seulement la forme du numéro, pas l'existence du navire au registre.
        </p>
      </Panel>
    </div>
  );
}
