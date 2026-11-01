import { describe, expect, it } from "vitest";
import {
  canIssueLivret,
  can,
  certificateStatus,
  evaluateCertStatus,
  libelleJours,
} from "@/lib/dgmm/rules";
import { codeValidation, emptyStcw, type Visite } from "@/lib/dgmm/store";

const NOW = new Date("2026-11-01T10:00:00");

describe("evaluateCertStatus (dossier technique DGMM)", () => {
  it("valide au-delà de 30 jours", () => {
    expect(evaluateCertStatus("2028-03-14", NOW)).toMatchObject({ status: "valide" });
  });
  it("expire_bientot à 30 jours ou moins", () => {
    const r = evaluateCertStatus("2026-11-20", NOW);
    expect(r.status).toBe("expire_bientot");
    expect(r.joursRestants).toBe(20);
  });
  it("expire avec un nombre de jours négatif", () => {
    const r = evaluateCertStatus("2026-10-12", NOW);
    expect(r.status).toBe("expire");
    expect(r.joursRestants).toBeLessThan(0);
    expect(libelleJours(r.joursRestants)).toMatch(/^expiré depuis/);
  });
  it("concorde avec certificateStatus", () => {
    expect(certificateStatus("2026-11-20", NOW)).toBe("expire_bientot");
    expect(certificateStatus(undefined, NOW)).toBe("aucun");
  });
});

describe("canIssueLivret", () => {
  it("exige la validation administrative puis médicale", () => {
    expect(
      canIssueLivret({ validationAdmin: "en_attente", validationMedicale: "validee" }),
    ).toEqual({
      canIssue: false,
      motif: "Validation administrative DGMM requise.",
    });
    expect(
      canIssueLivret({ validationAdmin: "validee", validationMedicale: "en_attente" }),
    ).toEqual({
      canIssue: false,
      motif: "Certificat médical STCW valide requis.",
    });
    expect(canIssueLivret({ validationAdmin: "validee", validationMedicale: "validee" })).toEqual({
      canIssue: true,
    });
  });
});

describe("matrice des droits", () => {
  it("seul le Gestionnaire MM délivre le livret, seul le médecin signe", () => {
    expect(can("gestionnaire_mm", "marins.livret")).toBe(true);
    expect(can("rh_marine", "marins.livret")).toBe(false);
    expect(can("medecin", "visites.signer")).toBe(true);
    expect(can("gestionnaire_medical", "visites.signer")).toBe(false);
    expect(can("medecin", "marins.creer")).toBe(false);
    expect(can("rh_marine", "roles.lecture")).toBe(true);
  });
});

describe("code de validation du certificat", () => {
  it("suit le format GAB-DGMM-AAAA-MED-NNNN-XXXX et dépend du titulaire", () => {
    const v: Visite = {
      id: 3842,
      numero: "VM-2026-0042",
      marinId: 24,
      praticien: "Dr MOUGOULA Christian",
      creeLe: "2026-03-15T09:30:00.000Z",
      traiteLe: "2026-03-15T10:12:00.000Z",
      examens: {
        taille: "",
        poids: "",
        tension: "",
        pouls: "",
        vision: "",
        audition: "",
        observations: "",
      },
      complementaires: "",
      recommandations: "",
      documents: [],
      stcw: {
        ...emptyStcw(),
        verdict: "apte",
        dateDelivrance: "2026-03-15",
        validJusquau: "2028-03-14",
      },
      signee: true,
      signataire: "Dr MOUGOULA Christian",
    };
    const a = codeValidation(v, "GAB-2024-001284");
    expect(a).toMatch(/^GAB-DGMM-2026-MED-0042-[0-9A-Z]{4}$/);
    expect(codeValidation(v, "GAB-2024-001285")).not.toBe(a);
  });
});

describe("description physique & biométrie", () => {
  it("le dossier n'est complet qu'avec empreintes et signature numérisée", async () => {
    const { dossierIncomplet, manquants } = await import("@/lib/dgmm/store");
    const base = {
      dateNaissance: "1988-06-14",
      taille: "178",
      couleurYeux: "Marron",
      couleurCheveux: "Noir",
      quartierInscription: "Libreville",
      signeParticulier: "Néant",
      documents: { photo: "photo.jpg", piece: "cni.pdf" },
    } as unknown as Parameters<typeof dossierIncomplet>[0];
    expect(dossierIncomplet(base)).toBe(true);
    expect(manquants(base)).toEqual(["Empreintes digitales", "Signature numérisée"]);
    const complet = {
      ...base,
      biometrie: {
        empreintes: { statut: "capturees" as const, doigts: 10 },
        signature: "data:image/png;base64,AA",
      },
    };
    expect(dossierIncomplet(complet)).toBe(false);
  });
});
