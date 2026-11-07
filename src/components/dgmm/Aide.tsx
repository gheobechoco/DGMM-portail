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
      "Contrôle par l'agent de la DGMM des pièces déposées : acte de naissance, casier judiciaire, diplômes et certificats STCW, pièce d'identité, photo. Il n'est possible qu'après la visite médicale d'aptitude (certificat du Médecin des Gens de Mer). Après validation du Directeur des Gens de Mer, le fascicule de marin (livret maritime) est généré.",
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
  identification: {
    titre: "Photo d'identité et signature",
    texte:
      "La photo d'identité est recadrée au format passeport (35 × 45 mm) et la signature du marin est tracée à l'écran lors de l'enrôlement ; toutes deux sont reportées sur le livret maritime.",
  },
  televersement: {
    titre: "Joindre un document scanné",
    texte:
      "Pour l'agent RH : numérisez d'abord le document papier avec un scanner ou prenez une photo nette, puis cliquez sur « Joindre » et sélectionnez le fichier (PDF, JPG ou PNG). Le portail ne commande pas le scanner. Vérifiez que toutes les pages sont lisibles et correspondent au marin ; les originaux papier restent à contrôler au guichet. Le certificat médical d'aptitude est établi par le médecin et ne doit pas être téléversé ici.",
  },
  doubleVerrou: {
    titre: "Double verrouillage des certificats du navire",
    texte:
      "1. L'inspecteur de la sécurité des navires contrôle à bord, fait co-signer son rapport par le commandant, saisit chaque certificat puis scelle le dossier. 2. Le responsable RH de la DGMM vise (ou refuse). Le navire n'est autorisé à appareiller qu'après ces deux étapes, jusqu'à l'échéance du certificat le plus court.",
  },
  francBord: {
    titre: "Certificat de franc-bord",
    texte:
      "Fixe l'enfoncement maximal du navire, donc sa charge maximale, selon la Convention internationale sur les lignes de charge. La marque de franc-bord peinte sur la coque ne doit jamais être immergée.",
  },
  smdsm: {
    titre: "SMDSM — Système mondial de détresse et de sécurité en mer",
    texte:
      "Ensemble des équipements radio (VHF, balises de détresse par satellite, récepteurs d'avis de sécurité) qui permettent au navire d'alerter les secours et d'être localisé. Le certificat de sécurité radio atteste leur bon fonctionnement.",
  },
  sanitaireNavire: {
    titre: "Contrôle sanitaire du navire (SSCEC / SSCC)",
    texte:
      "Prévu par le Règlement sanitaire international (2005) et valable 6 mois. SSCEC : exemption de contrôle, l'hygiène du bord est satisfaisante. SSCC : délivré après des mesures (désinfection, dératisation) quand un risque a été constaté.",
  },
  mlc: {
    titre: "Convention du travail maritime (MLC 2006)",
    texte:
      "Convention de l'OIT qui fixe les droits minimaux des gens de mer : contrat écrit, salaire versé au moins chaque mois, durée du travail et repos, congés payés, rapatriement aux frais de l'armateur, alimentation, logement et soins à bord.",
  },
  dms: {
    titre: "Déclaration maritime de santé",
    texte:
      "Questionnaire signé par le commandant à chaque escale : il déclare s'il y a eu à bord des malades, des décès ou des cas suspects de maladie contagieuse. Elle n'a pas de durée de validité, elle accompagne chaque voyage.",
  },
  cem: {
    titre: "Contrat d'engagement maritime (CEM)",
    texte:
      "Contrat de travail du marin, établi sur le modèle unique de la DGMM et signé dans l'ordre par l'armateur, le marin puis l'inspecteur DGMM. Une fois validé, il est scellé : toute modification se voit. Le portail vérifie avant validation le salaire, la durée, les congés, les heures, le rapatriement, la CNSS et l'aptitude du marin.",
  },
  feux: {
    titre: "Feux tricolores des alertes",
    texte:
      "Vert : problème social ou réglementaire (salaire en retard, nourriture). Orange : équipement défectueux sans danger immédiat. Rouge : danger grave (voie d'eau, absence de canot de sauvetage, piraterie) : une inspection d'urgence est demandée au prochain port.",
  },
  anonymat: {
    titre: "Signalement anonyme et code de suivi",
    texte:
      "En mode anonyme, ni le nom ni le poste utilisé ne sont enregistrés. Le marin reçoit un code personnel qui est le seul moyen de suivre son dossier et de lire les réponses : il faut le noter. L'alerte part en même temps à la Direction générale et à l'inspecteur de la sécurité des navires.",
  },
  agrement: {
    titre: "Agrément de médecin des gens de mer",
    texte:
      "Habilitation délivrée par la DGMM, sans laquelle un médecin ne peut pas examiner les marins ni signer leurs certificats STCW. Circuit : demande du médecin, contrôle des pièces par le RH, assermentation par le Directeur des Gens de Mer. Validité de 3 ans (à confirmer), rappel 90 jours avant l'échéance.",
  },
  omi: {
    titre: "Numéro OMI",
    texte:
      "Identifiant unique de la coque : « IMO » suivi de 7 chiffres, dont le dernier est une clé de contrôle. Il est obligatoire pour les navires de charge de 300 GT et plus et les navires à passagers de 100 GT et plus, et ne change jamais, même après un changement de nom, de propriétaire ou de pavillon.",
  },
  indicatif: {
    titre: "Indicatif d'appel radio (call sign)",
    texte:
      "Identifiant radio unique attribué au navire par l'administration du pavillon. Les indicatifs gabonais commencent par « TR ». S'il n'en a pas encore, l'armateur demande son attribution lors de l'inscription.",
  },
  mmsi: {
    titre: "MMSI — identité du service mobile maritime",
    texte:
      "Numéro à 9 chiffres programmé dans la radio et l'AIS du navire. Les trois premiers chiffres désignent le pays : 626 pour le Gabon.",
  },
  classe: {
    titre: "Société de classification",
    texte:
      "Organisme technique qui vérifie la solidité de la structure et des machines du navire et délivre ses certificats de classe. Elle doit être reconnue par l'administration gabonaise.",
  },
  radiation: {
    titre: "Certificat de radiation",
    texte:
      "Preuve que le navire a été retiré du registre de son ancien pavillon. Un navire ne peut porter qu'un seul pavillon : sans ce certificat, il ne peut pas être inscrit au registre gabonais.",
  },
  dpa: {
    titre: "Personne désignée à terre (DPA)",
    texte:
      "Exigée par le code ISM : un responsable de la compagnie, à terre, joignable 24 h/24, qui fait le lien entre les navires et la direction en cas d'accident, de pollution ou de détresse.",
  },
  marquage: {
    titre: "Nom du navire et marquage de la coque",
    texte:
      "Le nom proposé doit être libre sous pavillon gabonais et approuvé par la DGMM. Une fois approuvé, il est marqué de façon permanente et visible à la proue (des deux bords) et à la poupe, avec le port d'attache.",
  },
  effectifMinimal: {
    titre: "Effectif minimal de sécurité",
    texte:
      "Nombre et qualifications minimaux des marins pour que le navire navigue en sécurité, fixés par l'État du pavillon dans le document d'effectif minimal du navire. Le chiffre affiché ici est indicatif ; le document officiel du navire fait foi.",
  },
  journal: {
    titre: "Journal d'audit chaîné",
    texte:
      "Chaque action sensible (visa, signature, délivrance, scellement, décision) est inscrite avec son auteur, sa date et le poste utilisé. Chaque entrée contient l'empreinte de la précédente : si une ligne est modifiée ou supprimée, la chaîne est rompue et le portail le signale.",
  },
  rccm: {
    titre: "RCCM et NIF",
    texte:
      "RCCM : numéro d'immatriculation de la société au Registre du commerce (au Gabon, il commence par « GA- » suivi du code de la ville). NIF : numéro d'identification fiscale délivré par la Direction générale des impôts.",
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
