import { describe, expect, it } from "vitest";
import {
  DELAI_APPARITION_MS,
  FONDU_APPARITION_MS,
  OPACITE_MAX,
  estRevelee,
} from "@/lib/dgmm/ambiance";

describe("apparition de l'animation d'habillage", () => {
  it("reste invisible pendant le délai", () => {
    expect(estRevelee(0)).toBe(false);
    expect(estRevelee(DELAI_APPARITION_MS - 1)).toBe(false);
  });
  it("s'installe une fois le délai écoulé", () => {
    expect(estRevelee(DELAI_APPARITION_MS)).toBe(true);
    expect(estRevelee(DELAI_APPARITION_MS + 5000)).toBe(true);
  });
  it("garde un délai et un fondu réels, sans opacité pleine", () => {
    expect(DELAI_APPARITION_MS).toBeGreaterThan(0);
    expect(FONDU_APPARITION_MS).toBeGreaterThan(0);
    expect(OPACITE_MAX).toBeLessThan(1);
  });
});
