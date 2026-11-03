import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import type { Ambiance as Type, Habillage } from "@/lib/dgmm/saisons";
import { estSombre, usePrefs } from "@/lib/dgmm/prefs";
import { INTENSITE, useSysteme } from "@/lib/dgmm/systeme";

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number; // angle
  va: number;
  c: string;
  t: number; // phase / âge
  side: boolean;
  life?: number;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Largeur de la barre latérale visible (zone où les particules sont plus denses). */
function zoneLaterale(): number {
  const el = document.querySelector<HTMLElement>("[data-ambiance-zone]");
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.left < 5 ? r.right : 0;
}

/* ---------- Zones de lecture à laisser libres ---------- */

/**
 * Blocs de contenu que l'ambiance ne doit jamais recouvrir : cartes et panneaux,
 * tableaux, images, cartes géographiques, champs et boutons, fenêtres.
 */
const SELECTEUR_BLOCS = [
  ".bg-card", ".shadow-card", "[class*='rounded'][class*='border']",
  "table", "img", "svg", "video", "iframe", "canvas:not([data-ambiance])", "[role=img]",
  "input", "select", "textarea", "button", "[role=radio]", "[role=tab]",
  ".maplibregl-map", "[data-ambiance-obstacle]",
].join(",");
/** Marge laissée autour du contenu (px) pour que rien ne frôle le texte. */
const MARGE = 10;

/**
 * Rectangles (coordonnées de l'écran) occupés par du contenu visible : blocs ci-dessus
 * et lignes de texte libres (titres, paragraphes, libellés hors cartes).
 * Un bloc qui couvre presque toute la largeur est un fond de page, pas du contenu.
 */
function zonesOccupees(): DOMRect[] {
  const W = window.innerWidth, H = window.innerHeight;
  const vu = (r: DOMRect) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W;
  const out: DOMRect[] = [];
  document.querySelectorAll<HTMLElement>(SELECTEUR_BLOCS).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (vu(r) && !(r.width > W * 0.97 && r.height > H * 0.6)) out.push(r);
  });
  const parcours = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const plage = document.createRange();
  while (parcours.nextNode()) {
    const n = parcours.currentNode;
    const parent = n.parentElement;
    // Déjà couvert par son bloc, ou invisible (lecteurs d'écran, scripts).
    if (!parent || parent.closest(SELECTEUR_BLOCS) || parent.closest(".sr-only,script,style,noscript")) continue;
    plage.selectNodeContents(n);
    for (const r of plage.getClientRects()) if (vu(r)) out.push(r);
  }
  return out;
}

const dansZone = (x: number, y: number, zones: DOMRect[], m = MARGE) =>
  zones.some((r) => x > r.left - m && x < r.right + m && y > r.top - m && y < r.bottom + m);

/**
 * Animation d'ambiance liée à l'habillage du jour (neige, confettis, pétales…).
 * Couche décorative : non cliquable, ignorée des lecteurs d'écran, coupée si
 * l'utilisateur réduit les animations ou la désactive dans les préférences.
 */
const PAGES_SANS_AMBIANCE = ["/carte", "/mon-espace/trajet"];
/** Durées du cycle d'ambiance (millisecondes). */
const DUREE_VISIBLE = 25_000;
const DUREE_PAUSE = 45_000;

export function AmbianceSaison({ habillage }: { habillage: Habillage | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const prefs = usePrefs();
  const sys = useSysteme();
  const chemin = useRouterState({ select: (s) => s.location.pathname });
  // Pas d'ambiance sur les pages de carte : la carte doit rester parfaitement lisible.
  const pageCarte = PAGES_SANS_AMBIANCE.some((p) => chemin.startsWith(p));
  const actif = !!habillage && prefs.animationsSaison && sys.animations && !pageCarte;
  // L'ambiance passe par intervalles : visible un moment, puis pause, puis reprise.
  const [visible, setVisible] = useState(true);
  const visibleRef = useRef(true);
  useEffect(() => {
    if (!actif) return;
    let t = 0;
    const cycle = (on: boolean) => {
      visibleRef.current = on;
      setVisible(on);
      t = window.setTimeout(() => cycle(!on), on ? DUREE_VISIBLE : DUREE_PAUSE);
    };
    cycle(true);
    return () => window.clearTimeout(t);
  }, [actif]);
  const facteur = INTENSITE[sys.intensite];
  const sombre = estSombre(prefs);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || !habillage || !actif) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const type: Type = habillage.ambiance;
    const couleurs = habillage.couleurs;
    let W = 0, H = 0, side = 0, raf = 0, last = performance.now(), tick = 0;
    // Contenu à préserver, recalculé régulièrement et après chaque défilement.
    let zones: DOMRect[] = [];
    let fenetreOuverte = false;
    let defileLe = 0;
    const mesurer = () => {
      fenetreOuverte = !!document.querySelector("[role=dialog],[role=alertdialog]");
      zones = fenetreOuverte ? [] : zonesOccupees();
    };
    let attente = 0;
    const auDefilement = () => {
      defileLe = performance.now();
      window.clearTimeout(attente);
      attente = window.setTimeout(mesurer, 160);
    };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      W = window.innerWidth; H = window.innerHeight; side = zoneLaterale();
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    mesurer();
    window.addEventListener("resize", resize);
    window.addEventListener("resize", auDefilement);
    // capture : le défilement peut venir d'un conteneur intérieur, pas seulement de la page.
    document.addEventListener("scroll", auDefilement, { capture: true, passive: true });
    const mesure = window.setInterval(mesurer, 700);

    const monte = type === "bulles" || type === "etincelles" || type === "envol";
    const nait = (enHaut: boolean, dansCote: boolean): P => {
      const xMin = dansCote ? 0 : side, xMax = dansCote ? side : W;
      const x = rnd(xMin, Math.max(xMin + 1, xMax));
      const y = enHaut ? (monte ? H + rnd(0, 40) : rnd(-40, -10)) : rnd(0, H);
      const lent = type === "neige" ? 1 : type === "rubans" ? 0.55 : 0.8;
      return {
        x, y,
        vx: type === "envol" ? rnd(10, 30) : rnd(-8, 8),
        vy: (monte ? -1 : 1) * rnd(18, 48) * lent,
        r: type === "neige" ? rnd(1.4, 3.6) : type === "bulles" ? rnd(3, 9) : rnd(4, 8),
        a: rnd(0, Math.PI * 2), va: rnd(-1.5, 1.5),
        c: couleurs[Math.floor(Math.random() * couleurs.length)] ?? "#fff",
        t: rnd(0, 100), side: dansCote,
      };
    };
    const densite = (type === "rubans" ? 0.45 : type === "envol" ? 0.35 : 1) * facteur;
    const nSide = side ? Math.round(34 * densite) : 0; // complété dès que la barre latérale apparaît
    const nMain = Math.round(Math.min(46, (W - side) / 34) * densite);
    let ps: P[] = [];
    if (type !== "vagues" && type !== "feux") {
      for (let i = 0; i < nSide; i++) ps.push(nait(false, true));
      for (let i = 0; i < nMain; i++) ps.push(nait(false, false));
    }

    const couleurNeige = (p: P) => (p.side || sombre ? "rgba(255,255,255,0.9)" : "rgba(120,155,200,0.55)");

    const dessine = (p: P) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      switch (type) {
        case "neige":
          ctx.fillStyle = couleurNeige(p);
          if (p.side) { ctx.shadowColor = "rgba(255,255,255,0.8)"; ctx.shadowBlur = 4; }
          ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
          break;
        case "petales":
          ctx.rotate(p.a); ctx.globalAlpha = 0.75; ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
          break;
        case "clochettes": {
          ctx.rotate(Math.sin(p.t * 2) * 0.4); ctx.globalAlpha = 0.9;
          const k = p.r / 6;
          ctx.strokeStyle = "#5B8C3A"; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(0, -7 * k); ctx.lineTo(0, -3 * k); ctx.stroke();
          ctx.fillStyle = p.side || sombre ? "#ffffff" : "#f4f8ef";
          ctx.strokeStyle = "#a9bf9a"; ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(-5 * k, 5 * k);
          ctx.bezierCurveTo(-5.5 * k, -1 * k, -3 * k, -3 * k, 0, -3 * k);
          ctx.bezierCurveTo(3 * k, -3 * k, 5.5 * k, -1 * k, 5 * k, 5 * k);
          ctx.lineTo(6 * k, 7.5 * k); ctx.quadraticCurveTo(3 * k, 6 * k, 0, 8 * k); ctx.quadraticCurveTo(-3 * k, 6 * k, -6 * k, 7.5 * k);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          break;
        }
        case "feuilles":
          ctx.rotate(p.a); ctx.globalAlpha = 0.7; ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.6, p.r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(-p.r * 1.5, 0); ctx.lineTo(p.r * 1.5, 0); ctx.stroke();
          break;
        case "confettis":
          ctx.rotate(p.a); ctx.scale(1, Math.cos(p.t * 4)); ctx.fillStyle = p.c; ctx.globalAlpha = 0.85;
          ctx.fillRect(-p.r * 0.6, -p.r * 0.3, p.r * 1.2, p.r * 0.6);
          break;
        case "rubans": {
          ctx.rotate(Math.sin(p.t) * 0.35); ctx.globalAlpha = 0.6; ctx.strokeStyle = p.c;
          ctx.lineWidth = 2.6; ctx.lineCap = "round"; ctx.lineJoin = "round";
          const s = p.r / 7;
          ctx.beginPath();
          ctx.moveTo(-6 * s, 12 * s); ctx.lineTo(1.5 * s, -2 * s);
          ctx.bezierCurveTo(4.5 * s, -8 * s, 2.5 * s, -12 * s, 0, -12 * s);
          ctx.bezierCurveTo(-2.5 * s, -12 * s, -4.5 * s, -8 * s, -1.5 * s, -2 * s);
          ctx.lineTo(6 * s, 12 * s);
          ctx.stroke();
          break;
        }
        case "bulles":
          ctx.globalAlpha = 0.55; ctx.strokeStyle = p.side || sombre ? p.c : "#5b8fc9"; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 0.35; ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.arc(-p.r * 0.35, -p.r * 0.35, p.r * 0.25, 0, Math.PI * 2); ctx.fill();
          break;
        case "etincelles": {
          const tw = 0.4 + 0.6 * Math.abs(Math.sin(p.t * 3));
          ctx.globalAlpha = tw; ctx.fillStyle = p.c;
          ctx.beginPath();
          for (let k = 0; k < 4; k++) {
            const a = (k * Math.PI) / 2;
            ctx.lineTo(Math.cos(a) * p.r * 0.9, Math.sin(a) * p.r * 0.9);
            ctx.lineTo(Math.cos(a + Math.PI / 4) * p.r * 0.25, Math.sin(a + Math.PI / 4) * p.r * 0.25);
          }
          ctx.closePath(); ctx.fill();
          break;
        }
        case "envol": {
          const b = Math.sin(p.t * 6) * 4;
          ctx.globalAlpha = 0.75; ctx.strokeStyle = p.side || sombre ? "#ffffff" : "#5b6f8c"; ctx.lineWidth = 2; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(-p.r * 1.4, -b); ctx.quadraticCurveTo(-p.r * 0.6, -p.r * 0.6, 0, 0);
          ctx.quadraticCurveTo(p.r * 0.6, -p.r * 0.6, p.r * 1.4, -b); ctx.stroke();
          break;
        }
      }
      ctx.restore();
    };

    // Feux d'artifice : gerbes qui éclatent et retombent.
    const gerbes: P[] = [];
    const eclate = () => {
      const dansCote = side > 0 && Math.random() < 0.4;
      // Les gerbes éclatent dans un espace libre (jusqu'à 12 essais, sinon on renonce).
      let cx = 0, cy = 0, libre = false;
      for (let essai = 0; essai < 12 && !libre; essai++) {
        cx = dansCote ? rnd(20, side - 20) : rnd(side + 60, W - 60);
        cy = rnd(60, H * 0.6);
        libre = !dansZone(cx, cy, zones, 70);
      }
      if (!libre) return;
      const c = couleurs[Math.floor(Math.random() * couleurs.length)] ?? "#fff";
      for (let k = 0; k < 34; k++) {
        const a = (k / 34) * Math.PI * 2, v = rnd(60, 130);
        gerbes.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 2, a: 0, va: 0, c, t: 0, side: dansCote, life: rnd(1.1, 1.6) });
      }
    };

    const boucle = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now; tick += dt;
      // Onglet caché, ou pause du cycle une fois le fondu terminé : on ne dessine rien.
      if (document.hidden || (!visibleRef.current && cv.style.opacity === "0")) { raf = requestAnimationFrame(boucle); return; }
      ctx.clearRect(0, 0, W, H);
      // Pendant un défilement les zones bougent : on suspend l'affichage le temps de remesurer.
      // Une fenêtre (dialogue) ouverte demande toute l'attention : rien n'est dessiné.
      const enPause = fenetreOuverte || now - defileLe < 260;
      if (type === "vagues") {
        const bandes = [[0.2, 22, 0.9], [0.14, 16, 1.4], [0.1, 10, 2.1]] as const;
        bandes.forEach(([al, amp, sp], i) => {
          ctx.beginPath(); ctx.moveTo(0, H);
          for (let x = 0; x <= W; x += 12) ctx.lineTo(x, H - 18 - i * 9 + Math.sin(x / 90 + tick * sp + i) * amp * 0.5);
          ctx.lineTo(W, H); ctx.closePath();
          ctx.fillStyle = (couleurs[i % couleurs.length] ?? "#3A75C4") + Math.round(al * 255).toString(16).padStart(2, "0");
          ctx.fill();
        });
      } else if (type === "feux") {
        if (Math.random() < dt * 0.9 * facteur) eclate();
        for (let i = gerbes.length - 1; i >= 0; i--) {
          const g = gerbes[i]!;
          g.t += dt; g.vy += 60 * dt; g.vx *= 0.985; g.vy *= 0.985;
          g.x += g.vx * dt; g.y += g.vy * dt;
          const vie = 1 - g.t / (g.life ?? 1.4);
          if (vie <= 0) { gerbes.splice(i, 1); continue; }
          ctx.globalAlpha = vie * (g.side || sombre ? 1 : 0.8); ctx.fillStyle = g.c;
          ctx.beginPath(); ctx.arc(g.x, g.y, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else {
        for (const p of ps) {
          p.t += dt; p.a += p.va * dt;
          p.x += (p.vx + Math.sin(p.t * 1.3) * 12) * dt;
          p.y += p.vy * dt;
          const sortie = monte ? p.y < -30 : p.y > H + 30;
          if (sortie || p.x < -40 || p.x > W + 40) Object.assign(p, nait(true, p.side && side > 0));
          dessine(p);
        }
      }
      if (enPause) ctx.clearRect(0, 0, W, H);
      else if (zones.length) {
        // Gomme le contenu : l'ambiance ne reste visible que sur les bords et les espaces vides.
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "#000";
        for (const r of zones) ctx.fillRect(r.left - MARGE, r.top - MARGE, r.width + 2 * MARGE, r.height + 2 * MARGE);
        ctx.restore();
      }
      raf = requestAnimationFrame(boucle);
    };
    raf = requestAnimationFrame(boucle);
    const zone = window.setInterval(() => {
      const s = zoneLaterale();
      if (s === side) return;
      const avant = side;
      side = s;
      if (type === "vagues" || type === "feux") return;
      if (!s) ps = ps.map((p) => (p.side ? nait(false, false) : p));
      else if (!avant) for (let i = 0; i < Math.round(34 * densite); i++) ps.push(nait(false, true));
    }, 400);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(zone);
      window.clearInterval(mesure);
      window.clearTimeout(attente);
      window.removeEventListener("resize", resize);
      window.removeEventListener("resize", auDefilement);
      document.removeEventListener("scroll", auDefilement, { capture: true });
    };
  }, [habillage, actif, sombre, facteur]);

  if (!actif) return null;
  return (
    <canvas
      ref={ref}
      data-ambiance
      aria-hidden
      style={{ opacity: visible ? 1 : 0 }}
      className="no-print pointer-events-none fixed inset-0 z-[35] transition-opacity duration-[1500ms] ease-in-out"
    />
  );
}
