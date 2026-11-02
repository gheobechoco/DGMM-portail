import { useId, type ReactNode } from "react";
import { useHabillage, type HabillageId } from "@/lib/dgmm/saisons";

const NAVY = "#13294B";
const VERT = "#009E60";
const JAUNE = "#FCD116";
const BLEU = "#3A75C4";
const FONT = "Montserrat, Inter, 'Helvetica Neue', Arial, sans-serif";
const CORDE =
  "M108 47 C124 58 118 80 100 84 C84 88 84 104 100 108 C116 112 116 128 106 134 C100 138 96 140 92 140";

/**
 * Sceau officiel DGMM : ancre au jas tricolore (l'horizon national), cordage or,
 * « Direction Générale de la Marine Marchande » en arc.
 * Même visuel que /public/dgmm-sceau.svg (favicon et filigranes).
 */
export function DgmmLogo({
  className,
  title = "Direction Générale de la Marine Marchande",
  habille = true,
}: {
  className?: string;
  title?: string;
  /** false sur les documents officiels : le sceau y reste toujours nu. */
  habille?: boolean | undefined;
}) {
  const h = useHabillage();
  const deco = habille ? h : null;
  const uid = useId().replace(/:/g, "");
  const haut = `arc-haut-${uid}`;
  const bas = `arc-bas-${uid}`;
  return (
    <svg
      viewBox="0 0 300 300"
      className={className}
      role="img"
      aria-label={deco ? `${title} — ${deco.evenement}` : title}
      overflow="visible"
    >
      <title>{deco ? `${title} — ${deco.evenement}` : title}</title>
      <defs>
        <path id={haut} d="M42 150 A108 108 0 0 1 258 150" />
        <path id={bas} d="M26 150 A124 124 0 0 0 274 150" />
      </defs>
      <circle cx="150" cy="150" r="144" fill="#FFFFFF" stroke={NAVY} strokeWidth="5" />
      <circle cx="150" cy="150" r="136" fill="none" stroke={JAUNE} strokeWidth="2" />
      <circle cx="150" cy="150" r="98" fill="none" stroke={NAVY} strokeWidth="2.5" />
      <text fontFamily={FONT} fontWeight="700" fontSize="19" letterSpacing="2" fill={NAVY}>
        <textPath href={`#${haut}`} startOffset="50%" textAnchor="middle">
          DIRECTION GÉNÉRALE
        </textPath>
      </text>
      <text fontFamily={FONT} fontWeight="800" fontSize="19" letterSpacing="2" fill={NAVY}>
        <textPath href={`#${bas}`} startOffset="50%" textAnchor="middle">
          MARINE MARCHANDE
        </textPath>
      </text>
      {[33, 267].map((x) => (
        <g key={x}>
          <circle cx={x} cy="141" r="3" fill={VERT} />
          <circle cx={x} cy="150" r="3" fill={JAUNE} />
          <circle cx={x} cy="159" r="3" fill={BLEU} />
        </g>
      ))}
      <g transform="translate(150,152) scale(1.15) translate(-100,-91)">
        <g fill={NAVY} stroke={NAVY} transform="translate(0,-6)">
          <circle cx="100" cy="42" r="9" fill="none" strokeWidth="6" />
          <rect x="96" y="51" width="8" height="99" rx="2" stroke="none" />
          {/* Jas tricolore */}
          <rect x="64" y="64" width="24" height="9" rx="4.5" fill={VERT} stroke="none" />
          <rect x="88" y="64" width="24" height="9" fill={JAUNE} stroke="none" />
          <rect x="112" y="64" width="24" height="9" rx="4.5" fill={BLEU} stroke="none" />
          {/* Cordage enroulé */}
          <g fill="none" strokeLinecap="round">
            <path d={CORDE} stroke={NAVY} strokeWidth="6.5" />
            <path d={CORDE} stroke={JAUNE} strokeWidth="3.6" />
            <path
              d={CORDE}
              stroke={NAVY}
              strokeWidth="3.6"
              strokeDasharray="1.1 3.2"
              strokeLinecap="butt"
            />
          </g>
          <rect x="96" y="78" width="8" height="12" stroke="none" />
          <rect x="96" y="128" width="8" height="12" stroke="none" />
          <g
            fontFamily={FONT}
            fontWeight="800"
            fontSize="11"
            letterSpacing="1"
            stroke="none"
            fill={BLEU}
          >
            <text x="81" y="102" textAnchor="end">
              DE
            </text>
            <text x="120" y="102">
              LA
            </text>
          </g>
          <path
            d="M58 112 Q60 150 100 152 Q140 150 142 112"
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <polygon points="58,98 48,118 67,116" stroke="none" />
          <polygon points="142,98 152,118 133,116" stroke="none" />
        </g>
      </g>
      {deco && <Accessoire id={deco.id} />}
    </svg>
  );
}

/**
 * Filigrane du sceau DGMM en arrière-plan d'une page ou d'un document.
 * Décoratif : ignoré par les lecteurs d'écran et non cliquable.
 */
export function SceauFiligrane({
  className,
  opacite = 0.06,
}: {
  className?: string | undefined;
  opacite?: number;
}) {
  return (
    <img
      src="/dgmm-sceau.svg"
      alt=""
      aria-hidden
      draggable={false}
      className={`sceau-filigrane pointer-events-none select-none ${className ?? ""}`}
      style={{ opacity: opacite }}
    />
  );
}

/* ---------- Accessoires de saison (repère 300 × 300 du sceau) ---------- */

const ROUGE = "#C62828";

/** Écusson rond en bas à droite, qui porte le symbole du jour. */
function Ecusson({ children, fond = "#FFFFFF" }: { children: ReactNode; fond?: string }) {
  return (
    <g className="habillage-pop">
      <circle cx="240" cy="240" r="56" fill={fond} stroke={NAVY} strokeWidth="6" />
      <g transform="translate(196.5,196.5) scale(1.45)">{children}</g>
    </g>
  );
}

const RUBAN = "M18 54 L33 26 C39 14 35 6 30 6 C25 6 21 14 27 26 L42 54";

function Ruban({ couleur }: { couleur: string }) {
  return (
    <Ecusson>
      <path d={RUBAN} fill="none" stroke={couleur} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </Ecusson>
  );
}

function Lauriers({ couleur }: { couleur: string }) {
  const feuilles = (cote: 1 | -1) =>
    Array.from({ length: 7 }, (_, i) => {
      const a = ((cote === 1 ? 100 + i * 11 : 80 - i * 11) * Math.PI) / 180;
      const x = 150 + Math.cos(a) * 150;
      const y = 150 + Math.sin(a) * 150;
      const rot = (a * 180) / Math.PI + (cote === 1 ? 50 : -50);
      return <ellipse key={`${cote}-${i}`} cx={x} cy={y} rx="17" ry="7" fill={couleur} stroke={NAVY} strokeWidth="1.5" transform={`rotate(${rot} ${x} ${y})`} />;
    });
  return (
    <g className="habillage-pop">
      <path d="M58 270 A150 150 0 0 0 242 270" fill="none" stroke={couleur} strokeWidth="3" />
      {feuilles(1)}
      {feuilles(-1)}
    </g>
  );
}

export function Accessoire({ id }: { id: HabillageId }) {
  switch (id) {
    case "nouvel-an":
      return (
        <g className="habillage-pop">
          <g transform="rotate(22 236 40)">
            <polygon points="236,-22 206,62 266,62" fill="#9B5DE5" stroke={NAVY} strokeWidth="4" strokeLinejoin="round" />
            <path d="M221 20 L251 20 M214 40 L258 40" stroke={JAUNE} strokeWidth="6" />
            <circle cx="236" cy="-24" r="10" fill={JAUNE} stroke={NAVY} strokeWidth="3" />
            <rect x="200" y="58" width="72" height="9" rx="4.5" fill="#FF5D8F" stroke={NAVY} strokeWidth="3" />
          </g>
          {[[40, 36, "#FF5D8F"], [62, 8, "#4CC9F0"]].map(([x, y, c]) => (
            <g key={`${x}`} stroke={c as string} strokeWidth="3.5" strokeLinecap="round">
              {Array.from({ length: 8 }, (_, k) => {
                const a = (k * Math.PI) / 4;
                return <line key={k} x1={(x as number) + Math.cos(a) * 6} y1={(y as number) + Math.sin(a) * 6} x2={(x as number) + Math.cos(a) * 15} y2={(y as number) + Math.sin(a) * 15} />;
              })}
            </g>
          ))}
        </g>
      );
    case "noel":
      return (
        <g className="habillage-pop">
          <path d="M184 60 C196 10 246 -6 282 28 C292 40 296 58 292 76 L270 56 C254 44 222 46 184 60 Z" fill={ROUGE} stroke={NAVY} strokeWidth="4" strokeLinejoin="round" />
          <path d="M176 60 C214 40 254 40 286 60 L284 78 C252 60 214 58 180 80 Z" fill="#FFFFFF" stroke={NAVY} strokeWidth="4" strokeLinejoin="round" />
          <circle cx="292" cy="82" r="13" fill="#FFFFFF" stroke={NAVY} strokeWidth="4" />
        </g>
      );
    case "renovation":
      return <Lauriers couleur="#E0AE1E" />;
    case "droits-femme":
      return (
        <g className="habillage-pop">
          <circle cx="150" cy="150" r="149" fill="none" stroke="#8E44AD" strokeWidth="7" />
          <Ecusson>
            <circle cx="30" cy="24" r="13" fill="none" stroke="#8E44AD" strokeWidth="6" />
            <path d="M30 37 V58 M20 48 H40" stroke="#8E44AD" strokeWidth="6" strokeLinecap="round" />
          </Ecusson>
        </g>
      );
    case "travail":
      return (
        <g className="habillage-pop">
          <path d="M44 270 C40 220 22 180 6 150" fill="none" stroke="#7A5230" strokeWidth="5" strokeLinecap="round" />
          {Array.from({ length: 9 }, (_, i) => {
            const t = i / 8;
            const x = 44 - 38 * t - 4 * Math.sin(t * 3);
            const y = 270 - 120 * t;
            return (
              <g key={i}>
                <path d={`M${x} ${y} q 22 -4 34 -20`} fill="none" stroke="#2E8B57" strokeWidth="6" strokeLinecap="round" />
                <path d={`M${x} ${y} q -18 -10 -24 -28`} fill="none" stroke="#3FA463" strokeWidth="6" strokeLinecap="round" />
              </g>
            );
          })}
        </g>
      );
    case "gens-de-mer":
      return (
        <Ecusson>
          <g stroke="#7A5230" strokeWidth="5" strokeLinecap="round" fill="none">
            {Array.from({ length: 8 }, (_, k) => {
              const a = (k * Math.PI) / 4;
              return <line key={k} x1={30 + Math.cos(a) * 6} y1={30 + Math.sin(a) * 6} x2={30 + Math.cos(a) * 30} y2={30 + Math.sin(a) * 30} />;
            })}
            <circle cx="30" cy="30" r="18" strokeWidth="6" />
            <circle cx="30" cy="30" r="6" fill={JAUNE} stroke={NAVY} strokeWidth="3" />
          </g>
        </Ecusson>
      );
    case "independance":
      return (
        <g className="habillage-pop">
          <path d="M222 266 L206 318 L228 308 L238 326 L248 272 Z" fill={VERT} stroke={NAVY} strokeWidth="3" />
          <path d="M258 266 L274 318 L252 308 L242 326 L232 272 Z" fill={BLEU} stroke={NAVY} strokeWidth="3" />
          <circle cx="240" cy="240" r="54" fill={VERT} stroke={NAVY} strokeWidth="5" strokeDasharray="7 4" />
          <circle cx="240" cy="240" r="38" fill={JAUNE} />
          <circle cx="240" cy="240" r="22" fill={BLEU} />
        </g>
      );
    case "liberation":
      return (
        <Ecusson>
          <g fill="none" stroke={NAVY} strokeWidth="6" strokeLinecap="round">
            <rect x="2" y="22" width="26" height="16" rx="8" transform="rotate(-20 15 30)" />
            <rect x="32" y="22" width="26" height="16" rx="8" transform="rotate(20 45 30)" />
          </g>
          <path d="M30 6 L27 14 M22 10 L26 16 M38 10 L33 16 M30 54 L33 46 M22 50 L27 44 M38 50 L34 44" stroke={JAUNE} strokeWidth="3.5" strokeLinecap="round" />
        </Ecusson>
      );
    case "journee-mer":
      return (
        <Ecusson fond="#E8F1FB">
          <path d="M6 34 H54 L46 46 H14 Z" fill={NAVY} />
          <rect x="16" y="22" width="9" height="12" fill={ROUGE} />
          <rect x="26" y="22" width="9" height="12" fill={JAUNE} />
          <rect x="36" y="22" width="9" height="12" fill={VERT} />
          <rect x="40" y="12" width="7" height="10" fill={NAVY} />
          <path d="M0 52 q7 -6 15 0 t15 0 t15 0 t15 0" fill="none" stroke={BLEU} strokeWidth="4" strokeLinecap="round" />
        </Ecusson>
      );
    case "octobre-rose":
      return <Ruban couleur="#EC407A" />;
    case "sida":
      return <Ruban couleur={ROUGE} />;
    case "novembre-bleu":
      return (
        <Ecusson>
          <path d="M30 30 C24 22 12 22 6 30 C4 34 0 36 0 36 C10 40 22 38 30 32 C38 38 50 40 60 36 C60 36 56 34 54 30 C48 22 36 22 30 30 Z" fill="#2F80ED" stroke={NAVY} strokeWidth="2.5" strokeLinejoin="round" />
        </Ecusson>
      );
  }
}
