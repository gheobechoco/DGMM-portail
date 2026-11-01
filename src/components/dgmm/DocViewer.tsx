import { Download, FileQuestion, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { parseDoc } from "@/lib/dgmm/store";

/** Visionneuse intégrée (images et PDF) : évite de télécharger les pièces pour les consulter. */
export function DocViewer({
  titre,
  value,
  open,
  onOpenChange,
}: {
  titre: string;
  value: string | undefined;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const d = parseDoc(value);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-center gap-3 pr-8">
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate font-display text-base text-primary">
              {titre}
            </DialogTitle>
            <DialogDescription className="truncate text-xs">
              {d?.nom ?? "Aucun fichier"}
            </DialogDescription>
          </div>
          {d?.url && (
            <>
              <Button asChild size="sm" variant="outline">
                <a href={d.url} target="_blank" rel="noreferrer">
                  <Maximize2 /> Plein écran
                </a>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <a href={d.url} download={d.nom}>
                  <Download /> Télécharger
                </a>
              </Button>
            </>
          )}
        </div>
        <div className="grid min-h-0 flex-1 place-items-center overflow-auto rounded-lg bg-muted">
          {d?.image ? (
            <img src={d.url} alt={titre} className="max-h-full max-w-full object-contain" />
          ) : d?.pdf ? (
            <iframe src={d.url} title={titre} className="h-full w-full rounded-lg bg-white" />
          ) : (
            <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <FileQuestion className="size-10" />
              {d
                ? "Aperçu indisponible : pièce de démonstration enregistrée sans contenu."
                : "Aucune pièce jointe."}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
