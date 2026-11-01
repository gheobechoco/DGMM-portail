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
