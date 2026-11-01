import { useId } from "react";

/**
 * Emblème officiel DGMM redessiné en vectoriel : ancre et cordage,
 * ovale central, « Direction Générale » (vert), « De la » (or),
 * « MARINE MARCHANDE » (bleu marine).
 */
export function DgmmLogo({ className, title = "Direction Générale de la Marine Marchande" }: { className?: string; title?: string }) {
  const uid = useId().replace(/:/g, "");
  const top = `top-${uid}`;
  const bottom = `bottom-${uid}`;
  const steel = `steel-${uid}`;
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <defs>
        <path id={top} d="M 30 100 A 70 70 0 0 1 170 100" />
        <path id={bottom} d="M 21 100 A 79 79 0 0 0 179 100" />
        <linearGradient id={steel} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#24456f" />
          <stop offset="1" stopColor="#0a192f" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="97" fill="#ffffff" stroke="#0a192f" strokeWidth="4" />
      <circle cx="100" cy="100" r="90" fill="none" stroke="#d4af37" strokeWidth="1.5" />
      <ellipse cx="100" cy="100" rx="58" ry="62" fill="#f4f7fb" stroke="#0a3622" strokeWidth="2.2" />
      <text fill="#0a3622" fontFamily="Inter, Arial, sans-serif" fontWeight="800" fontSize="17" letterSpacing="0.5">
        <textPath href={`#${top}`} startOffset="50%" textAnchor="middle">Direction Générale</textPath>
      </text>
      <text fill="#0a192f" fontFamily="Inter, Arial, sans-serif" fontWeight="800" fontSize="15" letterSpacing="1">
        <textPath href={`#${bottom}`} startOffset="50%" textAnchor="middle">MARINE MARCHANDE</textPath>
      </text>
      <circle cx="19" cy="104" r="3" fill="#d4af37" />
      <circle cx="181" cy="104" r="3" fill="#d4af37" />
      {/* Ancre */}
      <g fill="none" stroke={`url(#${steel})`} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="100" cy="55" r="7" strokeWidth="4.5" />
        <line x1="78" y1="72" x2="122" y2="72" strokeWidth="6" />
        <line x1="100" y1="62" x2="100" y2="148" strokeWidth="7" />
        <path d="M 64 118 Q 68 148 100 150 Q 132 148 136 118" strokeWidth="6" />
      </g>
      <path d="M 55 126 L 63 106 L 75 122 Z" fill={`url(#${steel})`} />
      <path d="M 145 126 L 137 106 L 125 122 Z" fill={`url(#${steel})`} />
      {/* Cordage */}
      <path
        d="M 93 56 C 70 60 72 88 100 94 C 128 100 128 124 106 132 C 92 137 84 128 90 120"
        fill="none"
        stroke="#d4af37"
        strokeWidth="2.6"
        strokeDasharray="3.2 2.2"
        strokeLinecap="round"
      />
      <text x="76" y="100" fill="#b8901f" fontFamily="Inter, Arial, sans-serif" fontWeight="700" fontSize="13" textAnchor="middle">De</text>
      <text x="125" y="100" fill="#b8901f" fontFamily="Inter, Arial, sans-serif" fontWeight="700" fontSize="13" textAnchor="middle">la</text>
    </svg>
  );
}
