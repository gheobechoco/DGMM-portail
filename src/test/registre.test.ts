import { describe, expect, it } from "vitest";
import {
  controlerNavire,
  imoNormalise,
  imoObligatoire,
  indicatifValide,
  mmsiValide,
  navireVide,
  nomNormalise,
  registreOccupe,
  telValide,
  type NavireDeclare,
} from "@/lib/dgmm/registre";

const ok = (p: Partial<NavireDeclare> = {}): NavireDeclare => ({
  ...navireVide(),
  nom: "Etoile de Mandji", portAttache: "Port-Gentil", categorie: "charge", jauge: 450, imo: "IMO 9074729",
  indicatifADemander: true, puissanceKw: 1200, classe: "Bureau Veritas (BV)", provenance: "transfert", ancienPavillon: "Panama",
  ...p,
});

describe("registre des navires", () => {
  it("normalise les noms pour l'unicité", () => {
    expect(nomNormalise("  MV  Ogooué ")).toBe("OGOOUE");
    expect(nomNormalise("m/v ogooue")).toBe("OGOOUE");
  });
  it("lit le numéro OMI sous ses différentes formes", () => {
    expect(imoNormalise("IMO 9074729")).toBe("IMO9074729");
    expect(imoNormalise("9074729")).toBe("IMO9074729");
    expect(imoNormalise("IMO 907472")).toBe("");
  });
  it("exige l'OMI selon la catégorie et la jauge", () => {
    expect(imoObligatoire("charge", 299)).toBe(false);
    expect(imoObligatoire("charge", 300)).toBe(true);
    expect(imoObligatoire("passagers", 100)).toBe(true);
    expect(imoObligatoire("peche", 2000)).toBe(false);
  });
  it("contrôle indicatif, MMSI et téléphone", () => {
    expect(indicatifValide("TR 1234")).toBe(true);
    expect(indicatifValide("ZS1234")).toBe(false);
    expect(mmsiValide("626123456")).toBe(true);
    expect(mmsiValide("123456789")).toBe(false);
    expect(telValide("077 12 34 56")).toBe(true);
    expect(telValide("077 12 34 567")).toBe(false);
    expect(telValide("+241 066 00 00 00")).toBe(true);
    expect(telValide("+870773123456")).toBe(true);
  });
  it("refuse un nom ou un OMI déjà présent sous pavillon gabonais", () => {
    const occ = registreOccupe([]);
    expect(controlerNavire(ok(), occ, [], false)).toEqual({});
    expect(controlerNavire(ok({ nom: "MV OGOOUÉ" }), occ, [], false).nom).toMatch(/déjà porté/);
    expect(controlerNavire(ok({ imo: "9381201" }), occ, [], false).imo).toMatch(/Clé|déjà attribué/);
    expect(controlerNavire(ok({ imo: "" }), occ, [], false).imo).toMatch(/Obligatoire/);
    expect(controlerNavire(ok({ imo: "IMO 9074728" }), occ, [], false).imo).toMatch(/Clé/);
    expect(controlerNavire(ok(), occ, [ok()], false).nom).toMatch(/Deux navires/);
  });
  it("exige les pièces selon la provenance et la classe", () => {
    const occ = registreOccupe([]);
    const e = controlerNavire(ok(), occ, [], true);
    expect(Object.keys(e).sort()).toEqual(["classe", "propriete", "radiation"]);
    const neuf = controlerNavire(ok({ provenance: "neuf", classe: "Non classé (petit navire)" }), occ, [], true);
    expect(Object.keys(neuf)).toEqual(["propriete"]);
  });
});
