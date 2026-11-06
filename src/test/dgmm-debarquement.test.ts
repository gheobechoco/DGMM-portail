import { beforeEach, describe, expect, it } from "vitest";
import {
  CLE_DONNEES,
  joursEmbarquement,
  resetDemo,
  rejeterEmbarquementDgmm,
  saveRole,
  soumettreDebarquementLot,
  validerRoleEquipageDgmm,
  verifierAudit,
  type Marin,
} from "@/lib/dgmm/store";

type DonneesStockees = {
  marins: Marin[];
  audit: Parameters<typeof verifierAudit>[0];
};

function donneesStockees(): DonneesStockees {
  return JSON.parse(localStorage.getItem(CLE_DONNEES) ?? "{}") as DonneesStockees;
}

describe("workflow régalien de débarquement", () => {
  beforeEach(() => {
    localStorage.removeItem(CLE_DONNEES);
    resetDemo();
  });

  it("crédite le temps de mer uniquement après le visa DGMM", () => {
    const marinInitial = donneesStockees().marins[0];
    if (!marinInitial) throw new Error("Le marin de démonstration est introuvable.");

    const role = saveRole(
      {
        armateur: marinInitial.entreprise,
        navire: "Navire de démonstration",
        appareillage: "2026-01-01T10:00:00.000Z",
        membres: [{ marinId: marinInitial.id, fonction: "Matelot" }],
      },
      "Armateur de démonstration",
    );
    const embarquement = donneesStockees()
      .marins.find((marin) => marin.id === marinInitial.id)
      ?.embarquements?.find((ligne) => ligne.roleId === role.id);
    if (!embarquement) throw new Error("L'embarquement du rôle n'a pas été créé.");
    const marinAvecRole = donneesStockees().marins.find((marin) => marin.id === marinInitial.id);
    if (!marinAvecRole) throw new Error("Le marin du rôle est introuvable.");
    const totalAvantSoumission = (marinAvecRole.embarquements ?? []).reduce(
      (total, item) => total + (item.statut === "valide_dgmm" ? joursEmbarquement(item) : 0),
      0,
    );
    const joursActifsAvantSoumission = joursEmbarquement(embarquement);

    const selection = {
      marinId: marinInitial.id,
      embId: embarquement.id,
      dateDebarquement: "2026-01-03T10:00:00.000Z",
      justificatif: "tampon-navire.png",
    };
    soumettreDebarquementLot(
      marinInitial.entreprise,
      role.id,
      [selection],
      "Armateur de démonstration",
      "role-desarmement.pdf",
    );

    let marin = donneesStockees().marins.find((item) => item.id === marinInitial.id);
    let ligne = marin?.embarquements?.find((item) => item.id === embarquement.id);
    expect(ligne).toMatchObject({
      statut: "en_attente_validation",
      debarquement: selection.dateDebarquement,
      justificatifTampon: selection.justificatif,
    });
    expect(joursEmbarquement(ligne!)).toBe(3);
    expect(
      (marin?.embarquements ?? []).reduce(
        (total, item) => total + (item.statut === "valide_dgmm" ? joursEmbarquement(item) : 0),
        0,
      ),
    ).toBe(totalAvantSoumission - joursActifsAvantSoumission);
    expect(
      (marin?.embarquements ?? []).some(
        (item) => !item.debarquement || item.statut !== "valide_dgmm",
      ),
    ).toBe(true);

    rejeterEmbarquementDgmm(
      marinInitial.id,
      embarquement.id,
      "Tampon manquant ou illisible",
      "Agent DGMM",
    );
    ligne = donneesStockees()
      .marins.find((item) => item.id === marinInitial.id)
      ?.embarquements?.find((item) => item.id === embarquement.id);
    expect(ligne).toMatchObject({
      statut: "rejete",
      motifRejet: "Tampon manquant ou illisible",
    });

    soumettreDebarquementLot(
      marinInitial.entreprise,
      role.id,
      [selection],
      "Armateur de démonstration",
      "role-desarmement.pdf",
    );
    expect(validerRoleEquipageDgmm(role.id, "Station Maritime de Port-Gentil", "Agent DGMM")).toBe(
      3,
    );

    const final = donneesStockees();
    marin = final.marins.find((item) => item.id === marinInitial.id);
    ligne = marin?.embarquements?.find((item) => item.id === embarquement.id);
    expect(ligne).toMatchObject({
      statut: "valide_dgmm",
      validePar: "Agent DGMM",
      stationValidation: "Station Maritime de Port-Gentil",
    });
    expect(ligne?.valideLe).toBeTruthy();
    expect(
      (marin?.embarquements ?? []).some(
        (item) => !item.debarquement || item.statut !== "valide_dgmm",
      ),
    ).toBe(false);
    expect(
      (marin?.embarquements ?? []).reduce(
        (total, item) => total + (item.statut === "valide_dgmm" ? joursEmbarquement(item) : 0),
        0,
      ),
    ).toBe(totalAvantSoumission - joursActifsAvantSoumission + 3);
    expect(verifierAudit(final.audit)).toBeNull();
    expect(final.audit.at(-1)?.action).toContain("Visa DGMM du rôle");
  });
});
