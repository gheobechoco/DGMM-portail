import { CircleHelp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Glossaire réglementaire maritime affiché dans les info-bulles « ? ». */
export const GLOSSAIRE = {
  nip: {
    titre: "NIP — Numéro d'Identification Personnel",
    texte:
      "Identifiant unique attribué par la DGMM à l'enrôlement (ex. GAB-2024-001284). Il figure sur le livret, le certificat et sert de clé de recherche et de connexion à l'Espace Marin.",
  },
  stcw: {
    titre: "Convention STCW — règle I/9, section A-I/9",
    texte:
      "Convention internationale de l'OMI sur les normes de formation des gens de mer. La section A-I/9 fixe les normes minimales d'aptitude médicale : vue, ouïe, perception des couleurs, aptitude physique au service à bord.",
  },
  aptitude: {
    titre: "Décision d'aptitude — durée légale",
    texte:
      "Le certificat médical est valable 2 ans au maximum pour un marin adulte et 1 an au maximum pour un marin de moins de 18 ans. L'échéance est calculée automatiquement à partir de la date de délivrance. Une aptitude peut être assortie de restrictions (verres correcteurs, navigation côtière…).",
  },
  ishihara: {
    titre: "Test d'Ishihara",
    texte:
      "Test de perception des couleurs par planches pseudo-isochromatiques. Indispensable pour les fonctions de quart (lecture des feux de navigation et des signaux). Sa date doit figurer sur le certificat.",
  },
  abuja: {
    titre: "MoU d'Abuja — contrôle par l'État du port",
    texte:
      "Mémorandum d'entente régional sur le contrôle des navires par l'État du port en Afrique de l'Ouest et du Centre, auquel le Gabon participe. Les inspecteurs (PSC) y vérifient notamment les certificats médicaux et les titres des équipages.",
  },
  role: {
    titre: "Rôle d'équipage (rôle de bord)",
    texte:
      "Liste nominative des marins embarqués, déclarée par l'armateur pour chaque appareillage. Chaque membre doit détenir un certificat médical valide à la date de départ.",
  },
  jauge: {
    titre: "Jauge brute (GT / UMS)",
    texte:
      "Volume intérieur total du navire mesuré selon la Convention de 1969 sur le jaugeage. Les seuils de jauge déterminent les brevets STCW exigés et sont pris en compte dans le relevé des services en mer.",
  },
  visa: {
    titre: "Visa administratif DGMM",
    texte:
      "Contrôle des pièces (photo, CNI/passeport, justificatifs) par un agent de la DGMM. Avec la validation médicale, il conditionne la délivrance du livret maritime.",
  },
  seaService: {
    titre: "Services en mer (sea service)",
    texte:
      "Temps de navigation effectif inscrit au livret (navire, fonction, dates). Il est exigé pour l'accès aux brevets STCW supérieurs (officier, capitaine, chef mécanicien).",
  },
  description: {
    titre: "Description physique & signes particuliers",
    texte:
      "Remplace l'ancien « signalement anthropométrique », terme qui n'existe plus dans les textes ni les formulaires de la Marine marchande gabonaise. On relève la taille, le poids, la couleur des yeux et des cheveux, et — section obligatoire — les signes particuliers servant à l'identification : cicatrices visibles, tatouages, amputations, taches de naissance (ou « Néant »).",
  },
  biometrie: {
    titre: "Données biométriques",
    texte:
      "Le vrai remplaçant du signalement à la règle et au compas. À la création du dossier de gens de mer, l'administration enregistre les empreintes digitales numériques, une photographie d'identité normalisée (reconnaissance faciale) et la signature numérisée du marin.",
  },
} as const;

export type Terme = keyof typeof GLOSSAIRE;

/** Petit badge « ? » ouvrant une explication réglementaire. */
export function Aide({
  terme,
  className,
  light,
}: {
  terme: Terme;
  className?: string | undefined;
  light?: boolean | undefined;
}) {
  const g = GLOSSAIRE[terme];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Aide : ${g.titre}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-grid size-[18px] shrink-0 place-items-center rounded-full align-middle transition-colors",
            light
              ? "text-primary-foreground/70 hover:text-gold"
              : "text-muted-foreground hover:bg-gold/20 hover:text-primary",
            className,
          )}
        >
          <CircleHelp className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-left" align="start">
        <div className="font-display text-sm font-semibold text-primary">{g.titre}</div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{g.texte}</p>
      </PopoverContent>
    </Popover>
  );
}
