import { useId, type ReactNode } from "react";
import type { HabillageId } from "@/lib/dgmm/saisons";

/*
 * Accessoires de saison du sceau DGMM, dessinés en SVG (repère 300 × 300 du sceau).
 * Chaque pièce a ses dégradés, ses reflets et une animation CSS (classes hab-*),
 * coupée quand l'utilisateur demande moins de mouvement.
 */

const NAVY = "#13294B";
const VERT = "#009E60";
const JAUNE = "#FCD116";
const BLEU = "#3A75C4";

function useUid() {
  return useId().replace(/[^a-zA-Z0-9]/g, "");
}

/** Ombre portée douce, commune aux accessoires. */
function Ombre({ id }: { id: string }) {
  return (
    <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0a192f" floodOpacity="0.35" />
    </filter>
  );
}

/* ---------- Ruban de sensibilisation en satin (Novembre Bleu, Octobre Rose, sida) ---------- */

const TEINTES = {
  bleu: ["#0A3170", "#1565C0", "#42A5F5", "#BBDEFB"],
  rose: ["#8E1046", "#D81B60", "#F06292", "#FFD1E3"],
  rouge: ["#6D0A0A", "#C62828", "#EF5350", "#FFCDD2"],
} as const;

/** Encoche en queue d'aronde au bout d'une bande (direction dx, dy). */
function encoche(x: number, y: number, dx: number, dy: number, demi = 13) {
  const n = Math.hypot(dx, dy);
  const ux = dx / n, uy = dy / n, px = -uy, py = ux;
  const p = (a: number, b: number) => `${(x + ux * a + px * b).toFixed(1)},${(y + uy * a + py * b).toFixed(1)}`;
  return `${p(2, -demi - 4)} ${p(2, demi + 4)} ${p(30, demi + 4)} ${p(30, -demi - 4)} ${p(-12, 0)}`;
}

export function RubanSatin({ teinte }: { teinte: keyof typeof TEINTES }) {
  const u = useUid();
  const [fonce, moyen, clair, reflet] = TEINTES[teinte];
  const ARRIERE = "M98 138 L48 62 C26 34 38 4 62 4";
  const AVANT = "M58 4 C86 4 96 34 74 62 L24 138";
  return (
    <g transform="translate(186 150) scale(0.92)">
      <defs>
        <linearGradient id={`${u}a`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor={fonce} />
          <stop offset="0.55" stopColor={moyen} />
          <stop offset="1" stopColor={fonce} />
        </linearGradient>
        <linearGradient id={`${u}f`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={moyen} />
          <stop offset="0.35" stopColor={clair} />
          <stop offset="0.5" stopColor={reflet} />
          <stop offset="0.65" stopColor={clair} />
          <stop offset="1" stopColor={moyen} />
        </linearGradient>
        <mask id={`${u}m`} maskUnits="userSpaceOnUse" x="-20" y="-20" width="170" height="210">
          <rect x="-20" y="-20" width="170" height="210" fill="#fff" />
          <polygon points={encoche(98, 138, 50, 76)} fill="#000" />
          <polygon points={encoche(24, 138, -50, 76)} fill="#000" />
        </mask>
        <Ombre id={`${u}o`} />
      </defs>
      <g className="hab-balance" style={{ transformOrigin: "60px 8px" }}>
        <g filter={`url(#${u}o)`} mask={`url(#${u}m)`} fill="none" strokeLinecap="butt">
          <path d={ARRIERE} stroke={`url(#${u}a)`} strokeWidth="28" />
          {/* Ombre de la bande avant sur la bande arrière, au croisement */}
          <path d="M68 70 L56 90" stroke={fonce} strokeOpacity="0.45" strokeWidth="10" />
          <path d={AVANT} stroke={`url(#${u}f)`} strokeWidth="28" />
          <path d="M64 10 C82 12 88 36 72 58 L30 122" stroke="#fff" strokeOpacity="0.45" strokeWidth="3.5" strokeLinecap="round" className="hab-reflet" pathLength="100" strokeDasharray="28 72" />
          <path d="M44 30 C40 44 44 56 52 70" stroke="#fff" strokeOpacity="0.25" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
    </g>
  );
}

/* ---------- Muguet (Fête du Travail) ---------- */

function Clochette({ x, y, r, delai, grad }: { x: number; y: number; r: number; delai: number; grad: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(1.75)`}>
      <g className="hab-clochette" style={{ transformOrigin: "0px 0px", animationDelay: `${delai}s` }}>
        <path d="M0 0 L0 6" stroke="#5B8C3A" strokeWidth="1.6" />
        <path
          d="M-7.5 15 C-8 8 -5 5 0 5 C5 5 8 8 7.5 15 L9 19 Q6 17.2 4.5 19.6 Q2.4 17.4 0 19.8 Q-2.4 17.4 -4.5 19.6 Q-6 17.2 -9 19 Z"
          fill={`url(#${grad})`}
          stroke="#B8C9AE"
          strokeWidth="0.8"
        />
        <path d="M-3.5 9 C-4.5 12 -4.5 15 -3.5 17" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      </g>
    </g>
  );
}

export function Muguet() {
  const u = useUid();
  const tige = "M52 196 C56 140 76 80 118 34 C126 26 134 22 142 22";
  const fleurs: [number, number, number][] = [
    [128, 30, 28], [112, 46, 16], [98, 66, 6], [86, 90, 0], [76, 116, -6]
  ];
  return (
    <g transform="translate(-34 98) scale(0.9)">
      <defs>
        <linearGradient id={`${u}l`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2F6B2A" />
          <stop offset="0.45" stopColor="#6BAF4B" />
          <stop offset="0.55" stopColor="#4E9339" />
          <stop offset="1" stopColor="#24561F" />
        </linearGradient>
        <radialGradient id={`${u}c`} cx="0.35" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.7" stopColor="#F2F6EE" />
          <stop offset="1" stopColor="#CFDCC6" />
        </radialGradient>
        <Ombre id={`${u}o`} />
      </defs>
      <g filter={`url(#${u}o)`}>
        <g className="hab-feuille" style={{ transformOrigin: "44px 196px" }}>
          <path d="M44 198 C8 150 6 70 50 2 C70 62 74 150 44 198 Z" fill={`url(#${u}l)`} stroke="#24561F" strokeWidth="1.2" />
          <path d="M44 194 C40 140 42 70 50 8" stroke="#BFE3A6" strokeOpacity="0.7" strokeWidth="1.6" fill="none" />
          {[0, 1, 2, 3].map((k) => (
            <path key={k} d={`M${38 - k * 4} ${180 - k * 4} C${30 - k * 3} 130 ${32 - k * 2} 80 ${46 - k} 20`} stroke="#24561F" strokeOpacity="0.25" strokeWidth="1" fill="none" />
          ))}
        </g>
        <path d={tige} stroke="#4E8A32" strokeWidth="3" fill="none" strokeLinecap="round" />
        {fleurs.map(([x, y, r], i) => (
          <Clochette key={i} x={x} y={y} r={r} delai={i * 0.25} grad={`${u}c`} />
        ))}
        <circle cx="143" cy="22" r="5" fill="#E8F1DF" stroke="#9DB98C" strokeWidth="0.8" />
      </g>
    </g>
  );
}

/* ---------- Voilier fendant les vagues (Journée mondiale de la Mer) ---------- */

export function Voilier() {
  const u = useUid();
  return (
    <g>
      <defs>
        <clipPath id={`${u}c`}>
          <circle cx="240" cy="240" r="53" />
        </clipPath>
        <linearGradient id={`${u}v`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1C3F7A" />
          <stop offset="1" stopColor="#0B2350" />
        </linearGradient>
        <Ombre id={`${u}o`} />
      </defs>
      <g filter={`url(#${u}o)`}>
        <circle cx="240" cy="240" r="56" fill="#F3F8FD" stroke={NAVY} strokeWidth="6" />
      </g>
      <g clipPath={`url(#${u}c)`}>
        <g className="hab-tangage" style={{ transformOrigin: "240px 262px" }}>
          {/* Grand-voile et foc, comme sur le pictogramme de référence */}
          <path d="M238 196 C262 210 276 232 280 254 L242 258 C250 236 248 214 238 196 Z" fill={`url(#${u}v)`} />
          <path d="M232 206 C238 222 238 240 232 258 L216 260 C224 244 230 226 232 206 Z" fill={`url(#${u}v)`} />
          <path d="M240 200 C248 220 248 240 242 258" stroke="#fff" strokeWidth="2" fill="none" />
          <path d="M206 262 L282 254 L272 274 Q244 280 214 276 Z" fill={NAVY} />
        </g>
        <g className="hab-vague">
          <path d="M150 284 C170 272 190 272 210 280 S250 290 270 280 S310 270 330 280" stroke="#29A3DC" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M150 296 C170 286 190 286 210 292 S250 300 270 292 S310 284 330 292" stroke="#7CC8EC" strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      </g>
    </g>
  );
}

/* ---------- Bonnet de Noël ---------- */

export function BonnetNoel() {
  const u = useUid();
  return (
    <g transform="translate(150 -46) scale(0.7) rotate(14 100 80)">
      <defs>
        <linearGradient id={`${u}r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E53935" />
          <stop offset="0.45" stopColor="#C62828" />
          <stop offset="1" stopColor="#7F0000" />
        </linearGradient>
        <radialGradient id={`${u}b`} cx="0.4" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.75" stopColor="#ECEFF4" />
          <stop offset="1" stopColor="#C9D0DA" />
        </radialGradient>
        <filter id={`${u}p`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="t" />
          <feDisplacementMap in="SourceGraphic" in2="t" scale="6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <Ombre id={`${u}o`} />
      </defs>
      <g filter={`url(#${u}o)`}>
        {/* Corps du bonnet qui retombe vers la droite */}
        <path d="M14 112 C18 56 70 12 128 14 C170 16 196 52 194 104 C193 124 188 140 182 152 C178 128 172 100 156 86 C148 80 140 84 142 100 L140 112 Z" fill={`url(#${u}r)`} />
        <path d="M70 40 C96 30 126 34 146 52" stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M150 34 C170 52 178 80 176 110" stroke="#5B0000" strokeOpacity="0.4" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M100 30 C112 54 116 80 112 104" stroke="#5B0000" strokeOpacity="0.25" strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* Bordure en fourrure */}
        <g filter={`url(#${u}p)`}>
          <path d="M4 104 C40 86 104 82 152 96 C160 98 164 106 162 114 L158 132 C110 116 52 118 10 138 C2 142 -2 132 0 122 Z" fill={`url(#${u}b)`} />
        </g>
        <g className="hab-pompon" style={{ transformOrigin: "182px 120px" }}>
          <path d="M182 120 L184 150" stroke="#9F1B1B" strokeWidth="6" strokeLinecap="round" />
          <g filter={`url(#${u}p)`}>
            <circle cx="186" cy="160" r="19" fill={`url(#${u}b)`} />
          </g>
        </g>
      </g>
    </g>
  );
}

/* ---------- Symbole féminin au poing levé (Journée des droits de la femme) ---------- */

export function SymboleFeminin() {
  const u = useUid();
  const M = "#B0197E";
  return (
    <g transform="translate(196 150) scale(0.78)">
      <defs>
        <linearGradient id={`${u}m`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D1359E" />
          <stop offset="1" stopColor="#8E1366" />
        </linearGradient>
        <Ombre id={`${u}o`} />
      </defs>
      <g className="hab-pop-poing" style={{ transformOrigin: "56px 60px" }} filter={`url(#${u}o)`}>
        <circle cx="56" cy="58" r="44" fill="#FFFFFF" />
        <circle cx="56" cy="58" r="44" fill="none" stroke={`url(#${u}m)`} strokeWidth="18" />
        <rect x="47" y="100" width="18" height="52" fill={`url(#${u}m)`} />
        <rect x="28" y="116" width="56" height="18" fill={`url(#${u}m)`} />
        {/* Poing levé */}
        <g fill={M}>
          <rect x="49" y="62" width="15" height="34" rx="3" />
          <rect x="40" y="30" width="34" height="36" rx="9" />
          <path d="M40 46 C34 44 32 52 38 56 L46 58 Z" />
        </g>
        <g stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M48 31 V44" />
          <path d="M56 30 V44" />
          <path d="M64 31 V44" />
          <path d="M42 50 C48 48 56 50 60 54" />
        </g>
      </g>
    </g>
  );
}

/* ---------- Chapeau de fête et gerbes (Nouvel An) ---------- */

export function CotillonNouvelAn() {
  const u = useUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}c`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5B2A9E" />
          <stop offset="0.5" stopColor="#9B5DE5" />
          <stop offset="1" stopColor="#4A1F86" />
        </linearGradient>
        <radialGradient id={`${u}p`} cx="0.35" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#FFF6B3" />
          <stop offset="1" stopColor="#E0A800" />
        </radialGradient>
        <Ombre id={`${u}o`} />
      </defs>
      <g transform="rotate(22 236 40)" filter={`url(#${u}o)`}>
        <polygon points="236,-26 202,64 270,64" fill={`url(#${u}c)`} />
        {[[226, 18], [246, 30], [222, 46], [250, 52], [238, 6]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4" fill={i % 2 ? JAUNE : "#FF5D8F"} />
        ))}
        <path d="M200 62 Q214 70 226 62 Q240 70 254 62 Q266 70 274 62 L274 70 L200 70 Z" fill="#FF5D8F" />
        <g className="hab-pompon" style={{ transformOrigin: "236px -26px" }}>
          <circle cx="236" cy="-30" r="11" fill={`url(#${u}p)`} />
        </g>
      </g>
      {[[34, 40, "#FF5D8F", 0], [64, 6, "#4CC9F0", 0.6], [10, 78, JAUNE, 1.2]].map(([x, y, c, d]) => (
        <g key={`${x}`} className="hab-gerbe" style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${d}s` }} stroke={c as string} strokeWidth="3.5" strokeLinecap="round">
          {Array.from({ length: 10 }, (_, k) => {
            const a = (k * Math.PI) / 5;
            return <line key={k} x1={(x as number) + Math.cos(a) * 6} y1={(y as number) + Math.sin(a) * 6} x2={(x as number) + Math.cos(a) * 17} y2={(y as number) + Math.sin(a) * 17} />;
          })}
        </g>
      ))}
    </g>
  );
}

/* ---------- Lauriers dorés (Fête de la Rénovation) ---------- */

export function LauriersDores() {
  const u = useUid();
  const feuilles = (cote: 1 | -1) =>
    Array.from({ length: 8 }, (_, i) => {
      const a = ((cote === 1 ? 98 + i * 10 : 82 - i * 10) * Math.PI) / 180;
      const x = 150 + Math.cos(a) * 152, y = 150 + Math.sin(a) * 152;
      const rot = (a * 180) / Math.PI + (cote === 1 ? 52 : -52);
      return (
        <g key={`${cote}-${i}`} transform={`rotate(${rot} ${x} ${y})`}>
          <ellipse cx={x} cy={y} rx="18" ry="7.5" fill={`url(#${u}g)`} stroke="#8A6400" strokeWidth="1" />
          <path d={`M${x - 15} ${y} L${x + 15} ${y}`} stroke="#FFF2B0" strokeOpacity="0.8" strokeWidth="1.2" />
        </g>
      );
    });
  return (
    <g className="hab-scintille">
      <defs>
        <linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE58A" />
          <stop offset="0.5" stopColor="#E0AE1E" />
          <stop offset="1" stopColor="#9C7200" />
        </linearGradient>
      </defs>
      <path d="M56 268 A152 152 0 0 0 244 268" fill="none" stroke="#B88A10" strokeWidth="3.5" />
      {feuilles(1)}
      {feuilles(-1)}
    </g>
  );
}

/* ---------- Écusson (barre de gouvernail, chaîne brisée) ---------- */

function Ecusson({ children, fond = "#FFFFFF" }: { children: ReactNode; fond?: string }) {
  const u = useUid();
  return (
    <g>
      <defs>
        <Ombre id={`${u}o`} />
      </defs>
      <circle cx="240" cy="240" r="56" fill={fond} stroke={NAVY} strokeWidth="6" filter={`url(#${u}o)`} />
      {children}
    </g>
  );
}

export function Gouvernail() {
  const u = useUid();
  return (
    <Ecusson>
      <defs>
        <linearGradient id={`${u}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B07A45" />
          <stop offset="0.5" stopColor="#8A5A2B" />
          <stop offset="1" stopColor="#5E3A17" />
        </linearGradient>
      </defs>
      <g className="hab-roue" style={{ transformOrigin: "240px 240px" }}>
        {Array.from({ length: 8 }, (_, k) => {
          const a = (k * Math.PI) / 4;
          const c = Math.cos(a), s = Math.sin(a);
          return (
            <g key={k}>
              <line x1={240 + c * 10} y1={240 + s * 10} x2={240 + c * 44} y2={240 + s * 44} stroke={`url(#${u}b)`} strokeWidth="6" strokeLinecap="round" />
              <circle cx={240 + c * 44} cy={240 + s * 44} r="5" fill="#6B4320" />
            </g>
          );
        })}
        <circle cx="240" cy="240" r="28" fill="none" stroke={`url(#${u}b)`} strokeWidth="9" />
        <circle cx="240" cy="240" r="28" fill="none" stroke="#E8C49A" strokeOpacity="0.5" strokeWidth="2" />
        <circle cx="240" cy="240" r="9" fill={JAUNE} stroke={NAVY} strokeWidth="3" />
      </g>
    </Ecusson>
  );
}

export function ChaineBrisee() {
  const u = useUid();
  const maillon = (x: number, y: number, r: number) => (
    <g transform={`rotate(${r} ${x} ${y})`}>
      <rect x={x - 22} y={y - 12} width="44" height="24" rx="12" fill="none" stroke={`url(#${u}m)`} strokeWidth="8" />
      <rect x={x - 22} y={y - 12} width="44" height="24" rx="12" fill="none" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="1.5" />
    </g>
  );
  return (
    <Ecusson>
      <defs>
        <linearGradient id={`${u}m`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E3E8EF" />
          <stop offset="0.5" stopColor="#8D99A8" />
          <stop offset="1" stopColor="#4B5563" />
        </linearGradient>
      </defs>
      <g className="hab-ecarte-g" style={{ transformOrigin: "240px 240px" }}>{maillon(214, 246, -22)}</g>
      <g className="hab-ecarte-d" style={{ transformOrigin: "240px 240px" }}>{maillon(266, 246, 22)}</g>
      <g stroke={JAUNE} strokeWidth="3.5" strokeLinecap="round" className="hab-scintille">
        <path d="M240 212 L236 222 M228 216 L233 225 M252 216 L246 225" />
      </g>
    </Ecusson>
  );
}

/* ---------- Cocarde tricolore (Indépendance) ---------- */

export function Cocarde() {
  const u = useUid();
  const plis = Array.from({ length: 24 }, (_, k) => {
    const a = (k * Math.PI) / 12, b = ((k + 0.5) * Math.PI) / 12;
    return `${240 + Math.cos(a) * 58},${240 + Math.sin(a) * 58} ${240 + Math.cos(b) * 50},${240 + Math.sin(b) * 50}`;
  }).join(" ");
  return (
    <g>
      <defs>
        <radialGradient id={`${u}r`} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.15" />
        </radialGradient>
        <Ombre id={`${u}o`} />
      </defs>
      <g filter={`url(#${u}o)`}>
        <g className="hab-balance" style={{ transformOrigin: "240px 270px" }}>
          <path d="M224 270 L206 326 L228 314 L238 334 L250 276 Z" fill={VERT} />
          <path d="M256 270 L274 326 L252 314 L242 334 L230 276 Z" fill={BLEU} />
        </g>
        <polygon points={plis} fill={VERT} />
        <circle cx="240" cy="240" r="40" fill={JAUNE} />
        <circle cx="240" cy="240" r="24" fill={BLEU} />
        <circle cx="240" cy="240" r="58" fill={`url(#${u}r)`} />
      </g>
    </g>
  );
}

export function Accessoire({ id }: { id: HabillageId }) {
  switch (id) {
    case "nouvel-an":
      return <CotillonNouvelAn />;
    case "noel":
      return <BonnetNoel />;
    case "renovation":
      return <LauriersDores />;
    case "droits-femme":
      return <SymboleFeminin />;
    case "travail":
      return <Muguet />;
    case "gens-de-mer":
      return <Gouvernail />;
    case "independance":
      return <Cocarde />;
    case "liberation":
      return <ChaineBrisee />;
    case "journee-mer":
      return <Voilier />;
    case "octobre-rose":
      return <RubanSatin teinte="rose" />;
    case "novembre-bleu":
      return <RubanSatin teinte="bleu" />;
    case "sida":
      return <RubanSatin teinte="rouge" />;
  }
}
