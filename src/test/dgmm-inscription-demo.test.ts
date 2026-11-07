import { beforeEach, describe, expect, it, vi } from "vitest";

describe("démonstrations des pré-inscriptions", () => {
  beforeEach(() => {
    localStorage.removeItem("dgmm-inscriptions");
    vi.resetModules();
  });

  it("crée un dossier déjà converti et une demande à enrôler sans doublons", async () => {
    const { chargerDemosPreInscription } = await import("@/lib/dgmm/inscriptions");

    const exemples = chargerDemosPreInscription(42);
    expect(exemples.map((p) => [p.numero, p.statut])).toEqual([
      ["PRE-DEMO-CREE", "convertie"],
      ["PRE-DEMO-ATTENTE", "en_attente"],
    ]);
    expect(exemples[0]?.marinId).toBe(42);
    expect(chargerDemosPreInscription(42)).toHaveLength(2);
    expect(JSON.parse(localStorage.getItem("dgmm-inscriptions") ?? "{}").pre).toHaveLength(2);
  });
});
