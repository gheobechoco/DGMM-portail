import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculerStatistiquesDgmm } from "@/lib/dgmm/statistiques";
import type { Marin, Visite } from "@/lib/dgmm/store";

const now = new Date("2026-11-06T12:00:00.000Z");

function marin(overrides: Partial<Marin> = {}): Marin {
  return {
    id: 1,
    nip: "GAB-2026-000001",
    livret: "LIV-001",
    nom: "TEST",
    prenom: "Marin",
    sexe: "M",
    dateNaissance: "1990-01-01",
    profession: "Capitaine",
    nationalite: "Gabonaise",
    entreprise: "Compagnie A",
    tel1: "",
    tel2: "",
    quartier: "",
    email: "",
    signeParticulier: "",
    couleurYeux: "",
    couleurCheveux: "",
    taille: "",
    quartierInscription: "",
    dateMariage: "",
    lieuMariage: "",
    documents: {},
    validationAdmin: "validee",
    validationMedicale: "validee",
    login: "test",
    mdp: "secret",
    creePar: "Agent DGMM",
    creeLe: "2026-01-01T00:00:00.000Z",
    modifieLe: "2026-01-01T00:00:00.000Z",
    embarquements: [
      {
        id: 1,
        roleId: 1,
        navire: "Navire A",
        imo: "IMO-1",
        typeNavire: "Pétrolier",
        jauge: 3000,
        armateur: "Compagnie A",
        fonction: "Capitaine",
        embarquement: "2026-01-01T00:00:00.000Z",
        debarquement: "",
        saisiPar: "Armateur",
        saisiLe: "2026-01-01T00:00:00.000Z",
        statut: "en_attente_validation",
      },
    ],
    ...overrides,
  };
}

describe("agrégats statistiques DGMM", () => {
  beforeEach(() => {
    localStorage.removeItem("dgmm-psc-verifications-v1");
    vi.resetModules();
  });

  it("compte les équipages actifs, la gabonisation et les scans PSC sans géolocalisation", () => {
    const stats = calculerStatistiquesDgmm({
      marins: [
        marin(),
        marin({
          id: 2,
          nationalite: "Française",
          embarquements: marin().embarquements?.map((e) => ({ ...e, id: 2 })),
        }),
      ],
      visites: [],
      roles: [],
      audit: [],
      preInscription: { pre: [], armateurs: [] },
      verifications: [
        { date: "2026-11-06T09:00:00.000Z", canal: "qr", resultat: "conforme" },
        { date: "2026-11-06T10:00:00.000Z", canal: "nip", resultat: "anomalie" },
      ],
      now,
    });

    expect(stats).toMatchObject({
      naviresActifs: 1,
      marinsActifsEnMer: 2,
      marinsGabonaisActifs: 1,
      tauxGabonisation: 50,
      verificationPublique: { total: 2, conformes: 1, anomalies: 1 },
    });
  });

  it("n'inclut pas les embarquements futurs dans les navires actifs", () => {
    const future = marin({
      embarquements: marin().embarquements?.map((emb) => ({
        ...emb,
        embarquement: "2026-12-01T00:00:00.000Z",
      })),
    });
    const stats = calculerStatistiquesDgmm({
      marins: [future],
      visites: [] as Visite[],
      roles: [],
      audit: [],
      preInscription: { pre: [], armateurs: [] },
      verifications: [],
      now,
    });
    expect(stats.naviresActifs).toBe(0);
    expect(stats.marinsActifsEnMer).toBe(0);
  });

  it("enregistre les résultats PSC localement sans conserver l'identifiant vérifié", async () => {
    const { enregistrerVerificationPublique } = await import("@/lib/dgmm/statistiques");
    enregistrerVerificationPublique("qr", "anomalie");

    const stocke = JSON.parse(localStorage.getItem("dgmm-psc-verifications-v1") ?? "[]") as {
      canal: string;
      resultat: string;
      date: string;
      nip?: string;
    }[];
    expect(stocke).toHaveLength(1);
    expect(stocke[0]).toMatchObject({ canal: "qr", resultat: "anomalie" });
    expect(stocke[0]?.date).toBeTruthy();
    expect(stocke[0]).not.toHaveProperty("nip");
  });
});
