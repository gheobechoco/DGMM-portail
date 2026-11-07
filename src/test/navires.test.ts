import { describe, expect, it } from "vitest";
import {
  CERTIFICATS_NAVIRE,
  ajouterMois,
  echeanceCritique,
  etatNavire,
  manquesScellement,
  peutAppareiller,
  type Inspection,
  type SaisieCertificat,
} from "@/lib/dgmm/navires";

const complet = (effet: string): Record<string, SaisieCertificat> =>
  Object.fromEntries(
    CERTIFICATS_NAVIRE.map((c) => {
      if (c.nature === "registre") return [c.id, { conforme: true }];
      if (c.nature === "escale") return [c.id, { conforme: true, scan: "dms.pdf", effet }];
      const d = c.durees![c.durees!.length - 1]!;
      return [c.id, { conforme: true, scan: "x.pdf", dureeMois: d, effet, echeance: ajouterMois(effet, d), ...(c.variantes ? { variante: c.variantes[0] } : {}) }];
    }),
  );

const insp = (p: Partial<Inspection>): Inspection => ({
  id: 1, numero: "INS-1", navireId: "IMO9381201", navire: "MV Ogooué", imo: "9381201", armateur: "SNAT Gabon", date: "2026-06-01", port: "Owendo",
  inspecteur: "Inspecteur", commandant: "Cdt", rapport: "r.pdf", certificats: complet("2026-06-01"), statut: "vise", scelleLe: "2026-06-01T10:00:00Z", sceau: "", ...p,
});

describe("sécurité des navires : double verrouillage", () => {
  it("calcule les échéances en mois", () => {
    expect(ajouterMois("2026-11-07", 12)).toBe("2027-11-07");
    expect(ajouterMois("2026-11-07", 3)).toBe("2027-02-07");
  });
  it("refuse de sceller un dossier incomplet ou non conforme", () => {
    const base = { port: "Owendo", commandant: "Cdt", rapport: "r.pdf", certificats: complet("2026-11-07") };
    expect(manquesScellement(base)).toEqual([]);
    expect(manquesScellement({ ...base, rapport: "" })).toContain("Rapport d'inspection co-signé (scan)");
    const nc = { ...base, certificats: { ...base.certificats, radio: { conforme: false } } };
    expect(manquesScellement(nc).some((m) => m.includes("radio"))).toBe(true);
    const sansVariante = { ...base, certificats: { ...base.certificats, sanitaire: { ...base.certificats["sanitaire"]!, variante: undefined } } };
    expect(manquesScellement(sansVariante).some((m) => m.includes("exemption"))).toBe(true);
  });
  it("retient le certificat le plus court (analyse d'eau à 3 mois)", () => {
    expect(echeanceCritique({ certificats: complet("2026-11-07") })).toMatchObject({ id: "eau", echeance: "2027-02-07" });
  });
  it("donne l'état du navire selon le visa et les échéances", () => {
    const now = new Date("2026-11-07T12:00:00");
    expect(etatNavire([], "IMO9381201", now).etat).toBe("non_inspecte");
    expect(etatNavire([insp({ statut: "en_attente_visa" })], "IMO9381201", now).etat).toBe("attente_visa");
    expect(etatNavire([insp({ statut: "visa_refuse" })], "IMO9381201", now).etat).toBe("visa_refuse");
    expect(etatNavire([insp({ certificats: complet("2026-10-01") })], "IMO9381201", now).etat).toBe("autorise");
    expect(etatNavire([insp({ certificats: complet("2026-08-20") })], "IMO9381201", now)).toMatchObject({ etat: "a_surveiller", jours: 14 });
    expect(etatNavire([insp({ certificats: complet("2026-06-01") })], "IMO9381201", now).etat).toBe("expire");
    expect(peutAppareiller("attente_visa")).toBe(false);
    expect(peutAppareiller("a_surveiller")).toBe(true);
  });
});
