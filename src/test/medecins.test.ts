import { beforeEach, describe, expect, it } from "vitest";
import {
  ajouterAns,
  assermenter,
  controlerPiece,
  deposerDemandeAgrement,
  etatAgrement,
  getMedecins,
  medecinDeVisite,
  piecesConformes,
  transmettreAuDirecteur,
  type DemandeAgrement,
} from "@/lib/dgmm/medecins";
import { comptesPersonnel } from "@/lib/dgmm/auth";

const base = { nom: "MBADINGA", prenom: "Paul", onmg: "2001-GAB", structure: "CLI-POG", tel: "077 12 34 56", email: "p@x.ga", identifiant: "mbadinga", motDePasse: "Azerty!2026", pieces: { diplome: "d.pdf", onmg: "o.pdf" } };

describe("agrément des médecins des gens de mer", () => {
  beforeEach(() => localStorage.removeItem("dgmm-medecins-v1"));

  it("classe l'agrément : valide, à renouveler sous 90 jours, expiré", () => {
    const now = new Date("2026-11-07T12:00:00");
    expect(etatAgrement({ expireLe: "2027-06-01" }, now).etat).toBe("valide");
    expect(etatAgrement({ expireLe: "2026-12-20" }, now).etat).toBe("a_renouveler");
    expect(etatAgrement({ expireLe: "2026-11-01" }, now).etat).toBe("expire");
    expect(ajouterAns("2026-11-07", 3)).toBe("2029-11-07");
  });

  it("retrouve le médecin d'une visite par agrément ou par nom", () => {
    const { medecins } = getMedecins();
    expect(medecinDeVisite({ praticien: "Dr MOUGOULA Christian" }, medecins)?.numero).toBe("AGM-2024-0007");
    expect(medecinDeVisite({ praticien: "x", agrement: "AGM-2023-0003" }, medecins)?.nom).toBe("KONGO");
    expect(medecinDeVisite({ praticien: "Dr INCONNU" }, medecins)).toBeUndefined();
  });

  it("suit le circuit RH puis Directeur et ouvre le compte médecin", () => {
    const d = deposerDemandeAgrement({ ...base, type: "initiale" }) as DemandeAgrement;
    expect(d.statut).toBe("en_instruction");
    expect(transmettreAuDirecteur(d.id, "RH")).toBeUndefined();
    controlerPiece(d.id, "diplome", true);
    controlerPiece(d.id, "onmg", true);
    expect(piecesConformes(getMedecins().demandes.find((x) => x.id === d.id)!)).toBe(true);
    expect(transmettreAuDirecteur(d.id, "RH")?.statut).toBe("attente_directeur");
    const m = assermenter(d.id, "Directeur", new Date("2026-11-07T10:00:00Z"))!;
    expect(m.numero).toMatch(/^AGM-2026-\d{4}$/);
    expect(m.expireLe).toBe("2029-11-07");
    expect(comptesPersonnel().find((a) => a.username === "mbadinga")?.role).toBe("medecin");
  });

  it("renouvelle à partir de l'échéance en cours", () => {
    const kongo = getMedecins().medecins.find((m) => m.nom === "KONGO")!;
    expect(deposerDemandeAgrement({ ...base, type: "renouvellement", ancienNumero: "AGM-1999-0001", onmg: "0000" })).toMatch(/inconnu/);
    const d = deposerDemandeAgrement({ ...base, type: "renouvellement", ancienNumero: kongo.numero, nom: "KONGO", prenom: "A.", onmg: kongo.onmg, identifiant: "kongo.a" }) as DemandeAgrement;
    controlerPiece(d.id, "diplome", true);
    controlerPiece(d.id, "onmg", true);
    transmettreAuDirecteur(d.id, "RH");
    const m = assermenter(d.id, "Directeur")!;
    expect(m.numero).toBe(kongo.numero);
    expect(m.expireLe).toBe(ajouterAns(kongo.expireLe, 3));
  });
});
