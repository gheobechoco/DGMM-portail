import { useId } from "react";
import { useHabillage } from "@/lib/dgmm/saisons";
import { Accessoire } from "@/components/dgmm/Habillages";

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
