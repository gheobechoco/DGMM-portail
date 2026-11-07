import { useEffect, useState } from "react";

/**
 * Texte qui « se tape » lettre par lettre, suivi d'un curseur qui clignote puis s'efface.
 * Joué une seule fois par session de navigation pour un même texte ; ensuite affiché tel quel.
 */
export function TexteTape({ texte, vitesse = 45 }: { texte: string; vitesse?: number }) {
  const [animer] = useState(() => {
    if (typeof window === "undefined") return false;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
    const cle = `dgmm-tape:${texte}`;
    try {
      if (sessionStorage.getItem(cle)) return false;
      sessionStorage.setItem(cle, "1");
    } catch {
      /* stockage indisponible : on anime quand même */
    }
    return true;
  });
  const lettres = [...texte];
  const [n, setN] = useState(animer ? 0 : lettres.length);
  const [curseur, setCurseur] = useState(animer);

  useEffect(() => {
    if (!animer) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setN(i);
      if (i >= lettres.length) window.clearInterval(id);
    }, vitesse);
    const fin = window.setTimeout(() => setCurseur(false), lettres.length * vitesse + 1200);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(fin);
    };
  }, [animer, lettres.length, vitesse]);

  if (!animer) return <>{texte}</>;
  return (
    <span aria-label={texte}>
      <span aria-hidden>{lettres.slice(0, n).join("")}</span>
      {curseur && <span aria-hidden className="tape-curseur" />}
    </span>
  );
}
