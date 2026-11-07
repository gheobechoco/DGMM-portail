import { BellRing, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { formatDate, lastCertificate, setAlertes, useVisites, type Marin } from "@/lib/dgmm/store";
import { cn } from "@/lib/utils";

const JOUR = 86_400_000;

/**
 * Cloche de l'en-tête de l'Espace Marin : ouvre une fenêtre avec les rappels
 * avant l'échéance du certificat d'aptitude et le choix des canaux (SMS, e-mail).
 */
export function AlertesExpirationMarin({ m }: { m: Marin }) {
  const visites = useVisites().filter((v) => v.marinId === m.id && v.signee);
  const cert = lastCertificate(visites, m.id);
  const echeance = cert ? new Date(`${cert.stcw.validJusquau}T23:59:59`) : null;
  const jours = echeance ? Math.ceil((echeance.getTime() - Date.now()) / JOUR) : null;
  const alertes = m.alertes ?? { sms: true, email: !!m.email };
  const rappels = echeance
    ? ([
        ["J-60", new Date(echeance.getTime() - 60 * JOUR)],
        ["J-30", new Date(echeance.getTime() - 30 * JOUR)],
      ] as const)
    : [];

  // Pastille : rouge si expiré ou absent, orange sous 60 jours, rien sinon.
  const ton = jours === null || jours < 0 ? "danger" : jours <= 60 ? "warning" : null;
  const resume =
    jours === null
      ? "Aucun certificat valide"
      : jours < 0
        ? "Certificat expiré"
        : `Certificat valable encore ${jours} j`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex items-center gap-1.5 rounded-md border border-primary-foreground/30 px-2.5 py-1.5 text-xs font-semibold hover:bg-primary-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          aria-label={`Alertes d'expiration — ${resume}`}
        >
          <BellRing className="size-4" />
          <span className="hidden md:inline">Alertes</span>
          {ton && (
            <span
              aria-hidden
              className={cn(
                "absolute -right-1 -top-1 size-2.5 rounded-full ring-2 ring-sidebar",
                ton === "danger" ? "bg-destructive" : "bg-warning",
              )}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <BellRing className="size-4" /> Alertes d'expiration
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Rappels avant l'échéance de votre certificat.
          </p>
        </div>
        <div className="space-y-3 px-4 py-3">
          <div
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-semibold",
              ton === "danger"
                ? "bg-destructive/10 text-destructive"
                : ton === "warning"
                  ? "bg-warning/15 text-warning"
                  : "bg-success/10 text-success",
            )}
          >
            {resume}
            {cert && (
              <span className="block text-xs font-normal opacity-80">
                échéance le {formatDate(cert.stcw.validJusquau)}
              </span>
            )}
          </div>

          <Canal
            icone={MessageSquare}
            libelle="SMS"
            detail={m.tel1 || "aucun numéro"}
            actif={alertes.sms}
            disponible={!!m.tel1}
            onChange={(c) => {
              setAlertes(m.id, { ...alertes, sms: c });
              toast.success(c ? "Alertes SMS activées" : "Alertes SMS désactivées");
            }}
          />
          <Canal
            icone={Mail}
            libelle="E-mail"
            detail={m.email || "aucune adresse"}
            actif={alertes.email}
            disponible={!!m.email}
            onChange={(c) => {
              setAlertes(m.id, { ...alertes, email: c });
              toast.success(c ? "Alertes e-mail activées" : "Alertes e-mail désactivées");
            }}
          />

          <div className="rounded-lg bg-muted p-3 text-xs">
            <div className="mb-1.5 font-semibold text-primary">Rappels programmés</div>
            {rappels.length ? (
              <ul className="space-y-1 text-muted-foreground">
                {rappels.map(([l, d]) => (
                  <li key={l} className="flex justify-between gap-2">
                    <span>{l}</span>
                    <span className="tabular-nums">
                      {d.toLocaleDateString("fr-FR")}
                      {d.getTime() < Date.now() ? " · envoyé" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                Aucun certificat en cours : pas de rappel programmé.
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Canal({
  icone: Icone,
  libelle,
  detail,
  actif,
  disponible,
  onChange,
}: {
  icone: typeof Mail;
  libelle: string;
  detail: string;
  actif: boolean;
  disponible: boolean;
  onChange: (c: boolean) => void;
}) {
  return (
    <label
      className="choix flex cursor-pointer items-center justify-between gap-3"
      data-actif={actif}
    >
      <span className="flex items-center gap-2 text-sm">
        <Icone className="choix-icone size-4 text-muted-foreground" />
        <span>
          {libelle}
          <span className="block text-xs text-muted-foreground">{detail}</span>
        </span>
      </span>
      <Switch checked={actif} disabled={!disponible} onCheckedChange={onChange} />
    </label>
  );
}
