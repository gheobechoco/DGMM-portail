import { describe, expect, it } from "vitest";
import { decoderJeton, encoderJeton, lireCodeScanne, type JetonCertificat } from "@/lib/dgmm/jetonQr";

const cert: JetonCertificat = {
  t: "c", num: "VM-2026-0042", nom: "OBAME NGUEMA Jean-Pierre", nip: "GAB-2024-001284",
  v: "apte_restrictions", del: "2026-03-15", fin: "2028-03-14", med: "Dr MOUGOULA Christian", res: "Port de lunettes",
};

describe("Jetons des QR codes", () => {
  it("restitue le document à l'identique, accents compris", () => {
    const lu = decoderJeton(encoderJeton(cert));
    expect(lu?.intact).toBe(true);
    expect(lu?.jeton).toEqual(cert);
  });

  it("détecte une modification du contenu", () => {
    const [corps, sceau] = encoderJeton(cert).split(".");
    const falsifie = encoderJeton({ ...cert, fin: "2030-03-14" }).split(".")[0];
    expect(decoderJeton(`${falsifie}.${sceau}`)?.intact).toBe(false);
    expect(decoderJeton(`${corps}`)?.intact).toBe(false);
    expect(decoderJeton("n'importe quoi")).toBeNull();
  });

  it("interprète les liens et les anciens formats lus par un scanner", () => {
    expect(lireCodeScanne("DGMM-PRE:PRE-2026-0004")).toMatchObject({ type: "recepisse", id: "PRE-2026-0004" });
    expect(lireCodeScanne("https://portail.ga/suivi-demande?numero=PRE-2026-0004&d=abc.def")).toMatchObject({ type: "recepisse", id: "PRE-2026-0004", d: "abc.def" });
    expect(lireCodeScanne("https://portail.ga/verifier/certificat/GAB-DGMM-2026-MED-0042-U60U?source=qr&d=x.y")).toMatchObject({ type: "certificat", id: "GAB-DGMM-2026-MED-0042-U60U", d: "x.y" });
    expect(lireCodeScanne("https://portail.ga/verifier/GAB-2024-001284?source=qr")).toMatchObject({ type: "livret", id: "GAB-2024-001284" });
    expect(lireCodeScanne(" pre-2026-0007 ")).toMatchObject({ type: "recepisse", id: "PRE-2026-0007" });
  });
});
