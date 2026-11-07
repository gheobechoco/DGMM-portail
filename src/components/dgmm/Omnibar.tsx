import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BookOpenCheck,
  FileText,
  LayoutDashboard,
  Search,
  Ship,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { MarinPhoto } from "@/components/dgmm/MarinBits";
import { TOUS_NAVIRES } from "@/lib/dgmm/maritime";
import { can } from "@/lib/dgmm/rules";
import type { Account } from "@/lib/dgmm/auth";
import { fullName, useMarins, useVisites } from "@/lib/dgmm/store";

/** Recherche globale instantanée (Ctrl/⌘ + K) : NIP, n° de livret, nom, n° de certificat. */
export function Omnibar({ session }: { session: Account }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const marins = useMarins();
  const visites = useVisites();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string, params?: Record<string, string>) => {
    setOpen(false);
    navigate({ to, params } as never);
  };
  const byId = new Map(marins.map((m) => [m.id, m]));
  const mac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="search-trigger flex h-9 w-full max-w-md items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground transition-[max-width,border-color,color] duration-300 ease-out hover:max-w-lg hover:border-gold hover:text-foreground focus-visible:max-w-lg"
        aria-label="Recherche globale"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-left">
          <span className="hidden sm:inline">NIP, nom, livret, certificat, navire…</span>
          <span className="sm:hidden">Rechercher</span>
        </span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline">
          {mac ? "⌘" : "Ctrl"} K
        </kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] translate-y-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogTitle className="sr-only">Recherche globale</DialogTitle>
          <DialogDescription className="sr-only">
            Tapez un NIP, un numéro de livret, un nom ou un numéro de certificat.
          </DialogDescription>
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2">
            <CommandInput placeholder="NIP, nom, n° de livret, de certificat ou navire…" />
            <CommandList className="max-h-[60vh]">
              <CommandEmpty>Aucun résultat.</CommandEmpty>
              <CommandGroup heading="Gens de mer">
                {marins.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={`${m.nom} ${m.prenom} ${m.nip} ${m.livret} ${m.profession} ${m.entreprise} marin-${m.id}`}
                    onSelect={() => go("/espace/marins/$id", { id: String(m.id) })}
                  >
                    <MarinPhoto m={m} className="size-8 shrink-0 rounded-full text-[10px]" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{fullName(m)}</div>
                      <div className="truncate font-mono text-[11px] text-muted-foreground">
                        {m.nip}
                        {m.livret && ` · ${m.livret}`} · {m.profession}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {can(session.role, "visites") && (
                <CommandGroup heading="Certificats & visites">
                  {visites.map((v) => (
                    <CommandItem
                      key={v.id}
                      value={`${v.numero} ${fullName(byId.get(v.marinId))} visite-${v.id}`}
                      onSelect={() => go("/espace/visites/$id", { id: String(v.id) })}
                    >
                      <FileText className="text-muted-foreground" />
                      <span className="font-mono text-xs">{v.numero}</span>
                      <span className="truncate text-muted-foreground">
                        {fullName(byId.get(v.marinId))}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup heading="Navires">
                {TOUS_NAVIRES.map((n) => (
                  <CommandItem
                    key={n.imo}
                    value={`${n.nom} imo ${n.imo} ${n.armateur} ${n.type} navire`}
                    onSelect={() => {
                      setOpen(false);
                      navigate({ to: "/espace/marins", search: { armateur: n.armateur } });
                    }}
                  >
                    <Ship className="text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{n.nom}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        IMO {n.imo} · {n.type} · {n.armateur}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Accès rapide">
                <CommandItem value="tableau de bord accueil" onSelect={() => go("/espace")}>
                  <LayoutDashboard className="text-muted-foreground" /> Tableau de bord
                </CommandItem>
                <CommandItem
                  value="gens de mer répertoire liste"
                  onSelect={() => go("/espace/marins")}
                >
                  <Users className="text-muted-foreground" /> Répertoire des gens de mer
                </CommandItem>
                {can(session.role, "marins.enroler") && (
                  <CommandItem
                    value="enrôler nouveau marin"
                    onSelect={() => go("/espace/marins/nouveau")}
                  >
                    <UserPlus className="text-muted-foreground" /> Enrôler un marin
                  </CommandItem>
                )}
                {can(session.role, "visites.saisir") && (
                  <CommandItem
                    value="nouvelle visite médicale"
                    onSelect={() => go("/espace/visites/nouvelle")}
                  >
                    <Stethoscope className="text-muted-foreground" /> Nouvelle visite médicale
                  </CommandItem>
                )}
                {can(session.role, "livrets.delivrer") && (
                  <CommandItem value="livrets maritimes" onSelect={() => go("/espace/livrets")}>
                    <BookOpenCheck className="text-muted-foreground" /> Livrets maritimes
                  </CommandItem>
                )}
                {can(session.role, "audit") && (
                  <CommandItem
                    value="journal d'audit sécurité"
                    onSelect={() => go("/espace/audit")}
                  >
                    <ShieldCheck className="text-muted-foreground" /> Journal d'audit
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
            <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground">
              <span>↑↓ pour naviguer · Entrée pour ouvrir</span>
              <CommandShortcut>Échap pour fermer</CommandShortcut>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
