import { useId } from "react";

/** Cachet circulaire du centre médical agréé (tampon encré). */
export function Cachet({
  centre = "Polyclinique EDELWEISS",
  sousTitre = "Centre médical agréé DGMM",
  className,
}: {
  centre?: string;
  sousTitre?: string;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 140 140" className={className} role="img" aria-label={`Cachet : ${centre}`}>
      <defs>
        <path id={`top-${uid}`} d="M 20 70 A 50 50 0 0 1 120 70" />
        <path id={`bot-${uid}`} d="M 26 76 A 44 44 0 0 0 114 76" />
      </defs>
      <g fill="none" stroke="oklch(0.45 0.13 255)" opacity="0.85" transform="rotate(-12 70 70)">
        <circle cx="70" cy="70" r="66" strokeWidth="3" />
        <circle cx="70" cy="70" r="58" strokeWidth="1" />
        <circle cx="70" cy="70" r="30" strokeWidth="1" />
        <text
          fill="oklch(0.45 0.13 255)"
          stroke="none"
          fontSize="9"
          fontWeight="700"
          letterSpacing="0.6"
          fontFamily="Inter, sans-serif"
        >
          <textPath href={`#top-${uid}`} startOffset="50%" textAnchor="middle">
            {centre.toUpperCase()}
          </textPath>
        </text>
        <text
          fill="oklch(0.45 0.13 255)"
          stroke="none"
          fontSize="8"
          fontWeight="600"
          letterSpacing="0.8"
          fontFamily="Inter, sans-serif"
        >
          <textPath href={`#bot-${uid}`} startOffset="50%" textAnchor="middle">
            {sousTitre.toUpperCase()}
          </textPath>
        </text>
        <path
          d="M70 52 v36 M52 70 h36"
          stroke="oklch(0.45 0.13 255)"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
