/**
 * Aperçu du marquage réglementaire de la coque : le nom approuvé est peint de façon
 * permanente à la proue (des deux bords) et à la poupe, avec le port d'attache.
 */
export function MarquageCoque({ nom, port }: { nom: string; port: string }) {
  const n = nom.trim().toUpperCase() || "NOM DU NAVIRE";
  const p = (port || "PORT D'ATTACHE").toUpperCase();
  const taille = Math.max(9, Math.min(15, 190 / Math.max(6, n.length)));
  return (
    <figure className="rounded-lg border bg-gradient-to-b from-sky-50 to-sky-100/60 p-3 dark:from-slate-900 dark:to-slate-800">
      <div className="grid gap-3 sm:grid-cols-[1.6fr_1fr]">
        {/* Vue de côté : nom à la proue */}
        <svg viewBox="0 0 320 120" role="img" aria-label={`Proue : ${n}`} className="w-full">
          <rect x="70" y="22" width="90" height="26" rx="3" fill="#f8fafc" stroke="#94a3b8" />
          <rect x="84" y="10" width="40" height="14" rx="2" fill="#e2e8f0" stroke="#94a3b8" />
          <path d="M18 50 H292 L270 92 Q160 100 40 92 Z" fill="#13294B" />
          <path d="M18 50 H292 L289 57 H21 Z" fill="#C62828" />
          <path d="M40 92 Q160 100 270 92 L266 86 Q160 93 44 86 Z" fill="#7f1d1d" />
          <text x="252" y="76" textAnchor="end" fontFamily="Inter, system-ui, sans-serif" fontWeight="800" fontSize={taille} fill="#ffffff" letterSpacing="1">{n}</text>
          <path d="M0 98 Q20 94 40 98 T80 98 T120 98 T160 98 T200 98 T240 98 T280 98 T320 98 V120 H0 Z" fill="#3A75C4" opacity="0.55" />
          <text x="252" y="114" textAnchor="end" fontSize="9" fill="#13294B" fontFamily="Inter, system-ui, sans-serif" fontWeight="600">PROUE (tribord et bâbord)</text>
        </svg>
        {/* Vue arrière : nom + port d'attache à la poupe */}
        <svg viewBox="0 0 200 120" role="img" aria-label={`Poupe : ${n}, ${p}`} className="w-full">
          <path d="M20 30 H180 L165 92 Q100 100 35 92 Z" fill="#13294B" />
          <path d="M20 30 H180 L178 37 H22 Z" fill="#C62828" />
          <text x="100" y="60" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="800" fontSize={Math.max(8, Math.min(14, 150 / Math.max(6, n.length)))} fill="#ffffff">{n}</text>
          <text x="100" y="78" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="600" fontSize="10" fill="#FCD116">{p}</text>
          <path d="M0 98 Q20 94 40 98 T80 98 T120 98 T160 98 T200 98 V120 H0 Z" fill="#3A75C4" opacity="0.55" />
          <text x="100" y="114" textAnchor="middle" fontSize="9" fill="#13294B" fontFamily="Inter, system-ui, sans-serif" fontWeight="600">POUPE</text>
        </svg>
      </div>
      <figcaption className="mt-2 text-xs text-muted-foreground">
        Une fois le nom approuvé par la DGMM, il est marqué de façon permanente et visible à la proue et à la poupe, la poupe portant aussi le port d'attache.
      </figcaption>
    </figure>
  );
}
