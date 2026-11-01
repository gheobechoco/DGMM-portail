import { Moon, Sun } from "lucide-react";
import { basculerTheme, estSombre, usePrefs } from "@/lib/dgmm/prefs";
import { cn } from "@/lib/utils";

/** Bouton mode nuit ⇄ mode clair (mémorisé ; suit le système tant que rien n'est choisi). */
export function ThemeToggle({
  className,
  light,
}: {
  className?: string | undefined;
  light?: boolean | undefined;
}) {
  const prefs = usePrefs();
  const sombre = estSombre(prefs);
  const label = sombre ? "Passer en mode clair" : "Passer en mode nuit";
  return (
    <button
      type="button"
      onClick={basculerTheme}
      aria-label={label}
      title={label}
      aria-pressed={sombre}
      className={cn(
        "relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border transition-colors",
        light
          ? "border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
          : "text-muted-foreground hover:border-gold hover:text-primary",
        className,
      )}
    >
      <Sun
        className={cn(
          "absolute size-4 transition-all duration-300",
          sombre ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
        )}
      />
      <Moon
        className={cn(
          "absolute size-4 transition-all duration-300",
          sombre ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
        )}
      />
    </button>
  );
}
