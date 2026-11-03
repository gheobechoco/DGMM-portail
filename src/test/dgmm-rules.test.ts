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

describe("description physique & signature", () => {
  it("le dossier n'est complet qu'avec la signature du titulaire, sans aucune empreinte", async () => {
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
    expect(manquants(base)).toEqual(["Signature du titulaire"]);
    expect(dossierIncomplet({ ...base, signature: "data:image/png;base64,AA" })).toBe(false);
  });
});

describe("circuit DGMM : visa administratif", () => {
  it("exige d'abord le certificat médical, puis les pièces officielles", async () => {
    const { motifVisa } = await import("@/lib/dgmm/store");
    const m = {
      id: 99,
      documents: { photo: "p.jpg", piece: "cni.pdf" },
    } as unknown as Parameters<typeof motifVisa>[0];
    expect(motifVisa(m, [])).toMatch(/Médecin des Gens de Mer/);
    const v = {
      id: 1,
      marinId: 99,
      signee: true,
      stcw: { verdict: "apte", validJusquau: "2099-01-01" },
    } as unknown as Visite;
    expect(motifVisa(m, [v])).toBe(
      "Pièces manquantes : Acte de naissance, Casier judiciaire, Diplômes / certificats STCW.",
    );
    const complet = {
      ...m,
      documents: { ...m.documents, naissance: "a", casier: "c", stcw: "s" },
    } as typeof m;
    expect(motifVisa(complet, [v])).toBeNull();
  });
});

describe("calendrier des habillages du sceau", () => {
  it("choisit l'habillage du jour, les dates précises avant les mois", async () => {
    const { habillageDu } = await import("@/lib/dgmm/saisons");
    const id = (s: string) => habillageDu(new Date(s + "T12:00:00"))?.id ?? null;
    expect(id("2027-01-01")).toBe("nouvel-an");
    expect(id("2027-03-12")).toBe("renovation");
    expect(id("2027-04-17")).toBe("droits-femme");
    expect(id("2027-05-01")).toBe("travail");
    expect(id("2027-06-25")).toBe("gens-de-mer");
    expect(id("2027-08-16")).toBe("independance");
    expect(id("2027-08-17")).toBe("independance");
    expect(id("2027-08-30")).toBe("liberation");
    expect(id("2026-09-24")).toBe("journee-mer"); // dernier jeudi de septembre 2026
    expect(id("2026-09-17")).toBeNull();
    expect(id("2026-10-15")).toBe("octobre-rose");
    expect(id("2026-11-02")).toBe("novembre-bleu");
    expect(id("2026-12-01")).toBe("sida");
    expect(id("2026-12-20")).toBe("noel");
    expect(id("2026-12-26")).toBe("noel");
    expect(id("2026-12-27")).toBeNull();
    expect(id("2027-07-10")).toBeNull();
  });
});

describe("administrateur système", () => {
  it("supervise sans acte métier", () => {
    expect(can("admin_systeme", "systeme")).toBe(true);
    expect(can("admin_systeme", "audit")).toBe(true);
    expect(can("admin_systeme", "visites.signer")).toBe(false);
    expect(can("admin_systeme", "marins.valider_admin")).toBe(false);
    expect(can("admin_systeme", "marins.livret")).toBe(false);
    expect(can("gestionnaire_mm", "systeme")).toBe(false);
  });
  it("l'habillage suit les réglages de l'administrateur", async () => {
    const { habillageActif } = await import("@/lib/dgmm/saisons");
    const base = { habillageMode: "calendrier", habillageForce: "noel", evenementsInactifs: [], animations: true, intensite: "normale", maintenance: { actif: false, message: "" } } as const;
    const nov = new Date("2026-11-02T12:00:00");
    expect(habillageActif({ ...base, evenementsInactifs: [] }, nov, null)?.id).toBe("novembre-bleu");
    expect(habillageActif({ ...base, evenementsInactifs: ["novembre-bleu"] }, nov, null)).toBeNull();
    expect(habillageActif({ ...base, evenementsInactifs: [], habillageMode: "force" }, nov, null)?.id).toBe("noel");
    expect(habillageActif({ ...base, evenementsInactifs: [], habillageMode: "desactive" }, nov, null)).toBeNull();
    expect(habillageActif({ ...base, evenementsInactifs: [], habillageMode: "desactive" }, nov, "travail")?.id).toBe("travail");
  });
});

describe("référentiel géographique", () => {
  it("rattache les entreprises à leurs stations et estime les trajets", async () => {
    const g = await import("@/lib/dgmm/geo");
    const { STATIONS } = await import("@/lib/dgmm/maritime");
    const codes = new Set(STATIONS.map((s) => s.code));
    for (const e of g.ENTREPRISES_MARITIMES) for (const c of e.stations) expect(codes.has(c)).toBe(true);
    for (const s of STATIONS) expect(g.POSITION_STATION[s.code]).toBeDefined();
    const owendo = g.POSITION_STATION["ST-OWE"]!, pog = g.POSITION_STATION["ST-POG"]!;
    expect(g.distanceKm(owendo, pog)).toBeGreaterThan(130);
    expect(g.distanceKm(owendo, pog)).toBeLessThan(160);
    const v = g.estimer(owendo, g.lieuEntreprise("CMA CGM Gabon")!, "voiture");
    const p = g.estimer(owendo, g.lieuEntreprise("CMA CGM Gabon")!, "pied");
    expect(p.minutes).toBeGreaterThan(v.minutes);
    expect(g.lienGoogleMaps(owendo, null, "pied")).toContain("travelmode=walking");
    expect(g.duree(95)).toBe("1 h 35");
  });
});
