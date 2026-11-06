// Référentiel maritime de démonstration : armateurs, flotte et typologies.

export type TypeFlotte =
  "Offshore pétrolier" | "Remorquage / portuaire" | "Pêche" | "Cabotage" | "Transport de passagers";
export const TYPES_FLOTTE: TypeFlotte[] = [
  "Offshore pétrolier",
  "Remorquage / portuaire",
  "Pêche",
  "Cabotage",
  "Transport de passagers",
];

export interface Navire {
  nom: string;
  imo: string;
  type: TypeFlotte;
  /** Jauge brute (GT / UMS). */
  jauge: number;
  pavillon: string;
}

export interface Armateur {
  nom: string;
  ville: string;
  pays: string;
  type: TypeFlotte;
  navires: Navire[];
}

export const ARMATEURS: Armateur[] = [
  {
    nom: "SNAT Gabon",
    ville: "Owendo",
    pays: "Gabon",
    type: "Cabotage",
    navires: [
      { nom: "MV Ogooué", imo: "9381201", type: "Cabotage", jauge: 2850, pavillon: "Gabon" },
      { nom: "MV Komo", imo: "9381213", type: "Cabotage", jauge: 1940, pavillon: "Gabon" },
    ],
  },
  {
    nom: "Bourbon Offshore",
    ville: "Port-Gentil",
    pays: "France",
    type: "Offshore pétrolier",
    navires: [
      {
        nom: "Bourbon Liberty 231",
        imo: "9608984",
        type: "Offshore pétrolier",
        jauge: 1586,
        pavillon: "Gabon",
      },
      {
        nom: "Bourbon Explorer 512",
        imo: "9590101",
        type: "Offshore pétrolier",
        jauge: 3601,
        pavillon: "Luxembourg",
      },
    ],
  },
  {
    nom: "Gabon Port Management",
    ville: "Owendo",
    pays: "Gabon",
    type: "Remorquage / portuaire",
    navires: [
      {
        nom: "RB Nyanga",
        imo: "9712044",
        type: "Remorquage / portuaire",
        jauge: 480,
        pavillon: "Gabon",
      },
      {
        nom: "RB Ngounié",
        imo: "9712056",
        type: "Remorquage / portuaire",
        jauge: 480,
        pavillon: "Gabon",
      },
    ],
  },
  {
    nom: "Satram",
    ville: "Port-Gentil",
    pays: "Gabon",
    type: "Transport de passagers",
    navires: [
      {
        nom: "NV Akanda",
        imo: "9455120",
        type: "Transport de passagers",
        jauge: 1220,
        pavillon: "Gabon",
      },
    ],
  },
  {
    nom: "Perenco Marine",
    ville: "Port-Gentil",
    pays: "Royaume-Uni",
    type: "Offshore pétrolier",
    navires: [
      {
        nom: "Perenco Mandji",
        imo: "9654321",
        type: "Offshore pétrolier",
        jauge: 2210,
        pavillon: "Gabon",
      },
      {
        nom: "Perenco Olende",
        imo: "9654333",
        type: "Offshore pétrolier",
        jauge: 1780,
        pavillon: "Gabon",
      },
      {
        nom: "Perenco Ozouri",
        imo: "9654345",
        type: "Offshore pétrolier",
        jauge: 980,
        pavillon: "Gabon",
      },
    ],
  },
  {
    nom: "Edelweiss Maritime",
    ville: "Mayumba",
    pays: "Gabon",
    type: "Pêche",
    navires: [
      { nom: "FV Mayumba Star", imo: "8812030", type: "Pêche", jauge: 640, pavillon: "Gabon" },
      { nom: "FV Banio", imo: "8812042", type: "Pêche", jauge: 410, pavillon: "Gabon" },
    ],
  },
];

export function armateur(nom: string | undefined): Armateur | undefined {
  return ARMATEURS.find((a) => a.nom === nom);
}

export const TOUS_NAVIRES: (Navire & { armateur: string })[] = ARMATEURS.flatMap((a) =>
  a.navires.map((n) => ({ ...n, armateur: a.nom })),
);

export const FONCTIONS_BORD = [
  "Capitaine",
  "Second capitaine",
  "Officier de quart pont",
  "Chef mécanicien",
  "Second mécanicien",
  "Officier mécanicien",
  "Officier radio",
  "Maître d'équipage",
  "Matelot",
  "Graisseur",
  "Cuisinier",
  "Élève officier",
];

/* ---------- Référentiel DGMM (dgmm-referentiel.json) ---------- */

export interface StationMaritime {
  code: string;
  nom: string;
  type: string;
  ville: string;
  province: string;
  vhf: string;
  contact: string;
}

export const STATIONS: StationMaritime[] = [
  {
    code: "ST-LBV",
    nom: "Direction des Gens de Mer et de la Navigation Maritime (siège DGMM)",
    type: "Siège — enrôlement & délivrance des titres",
    ville: "Libreville",
    province: "Estuaire",
    vhf: "Canal 16",
    contact: "",
  },
  {
    code: "ST-OWE",
    nom: "Station Maritime d'Owendo",
    type: "Portuaire & Commercial",
    ville: "Owendo",
    province: "Estuaire",
    vhf: "Canal 16 / 12",
    contact: "+241 01 70 70 39",
  },
  {
    code: "ST-POG",
    nom: "Station Maritime de Port-Gentil",
    type: "Pétrolier & Offshore",
    ville: "Port-Gentil",
    province: "Ogooué-Maritime",
    vhf: "Canal 16 / 11",
    contact: "+241 01 55 22 14",
  },
  {
    code: "ST-KAN",
    nom: "Station Fluviale de Kango",
    type: "Fluvial & Transit Komo",
    ville: "Kango",
    province: "Estuaire",
    vhf: "Canal 16",
    contact: "+241 01 79 10 05",
  },
  {
    code: "ST-LAM",
    nom: "Station Fluviale de Lambaréné",
    type: "Fluvial Ogooué",
    ville: "Lambaréné",
    province: "Moyen-Ogooué",
    vhf: "Canal 16",
    contact: "+241 01 58 20 18",
  },
  {
    code: "ST-COC",
    nom: "Station Maritime de Cocobeach",
    type: "Frontière & Pêche artisanale",
    ville: "Cocobeach",
    province: "Estuaire",
    vhf: "Canal 16",
    contact: "+241 01 73 80 44",
  },
  {
    code: "ST-MAY",
    nom: "Station Maritime de Mayumba",
    type: "Façade Sud & Pêche",
    ville: "Mayumba",
    province: "Nyanga",
    vhf: "Canal 16",
    contact: "+241 01 86 11 02",
  },
  {
    code: "ST-OMB",
    nom: "Station Maritime d'Omboué",
    type: "Station secondaire — cabotage et lagune Fernan-Vaz",
    ville: "Omboué",
    province: "Ogooué-Maritime",
    vhf: "Canal 16",
    contact: "",
  },
  {
    code: "ST-GAM",
    nom: "Station Maritime de Gamba",
    type: "Pétrolier & Façade Sud",
    ville: "Gamba",
    province: "Ogooué-Maritime",
    vhf: "Canal 16",
    contact: "",
  },
];

export function station(code: string | undefined): StationMaritime | undefined {
  return STATIONS.find((s) => s.code === code);
}

export interface TexteReglementaire {
  id: string;
  titre: string;
  reference: string;
  categorie: string;
  resume: string;
}

export const TEXTES: TexteReglementaire[] = [
  {
    id: "REG-CEMAC-01",
    titre: "Code Communautaire de la Marine Marchande CEMAC",
    reference: "Règlement n° 03/01-UEAC-088-CM-06",
    categorie: "Législation Régionale",
    resume:
      "Régit l'immatriculation des navires, les droits et devoirs des gens de mer, et les conditions de travail maritime en zone CEMAC.",
  },
  {
    id: "REG-OMI-STCW",
    titre: "Convention STCW 78/2010 - Section A-I/9",
    reference: "Norme internationale OMI",
    categorie: "Santé & Aptitude",
    resume:
      "Normes obligatoires relatives à l'aptitude physique et médicale des gens de mer, examens visuels, auditifs et conditions de service de quart.",
  },
  {
    id: "REG-OMI-MLC",
    titre: "Convention du Travail Maritime (MLC 2006)",
    reference: "Norme OIT / OMI",
    categorie: "Protection Sociale",
    resume:
      "Conditions d'emploi des marins, rapatriement garanti, protection de la santé et couverture médicale à bord.",
  },
];

export interface AvisNavigateurs {
  id: string;
  station: string;
  niveau: "Urgent" | "Avertissement" | "Information";
  titre: string;
  date: string;
  message: string;
}

export const AVURNAV: AvisNavigateurs[] = [
  {
    id: "AVURNAV-2026-042",
    station: "Owendo",
    niveau: "Avertissement",
    titre: "Présence de grumes en dérive - Chenal d'Owendo",
    date: "2026-11-01T08:00:00Z",
    message:
      "Plusieurs grumes signalées entre la bouée 3 et la balise d'atterrage. Vigilance renforcée recommandée de nuit.",
  },
  {
    id: "AVURNAV-2026-041",
    station: "Port-Gentil",
    niveau: "Information",
    titre: "Travaux sous-marins au large du Cap Lopez",
    date: "2026-10-30T14:30:00Z",
    message:
      "Navire support en opération de plongée. Garder une distance de sécurité de 1 mille nautique.",
  },
];
