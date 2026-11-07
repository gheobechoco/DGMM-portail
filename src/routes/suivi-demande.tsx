import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertCircle, CheckCircle2, Clock3, MapPin, Search } from "lucide-react";
import { VerifyShell, validateLang, type Lang } from "@/components/dgmm/VerifyShell";
import { Button } from "@/components/ui/button";
import { STATIONS } from "@/lib/dgmm/maritime";
import { useInscriptions } from "@/lib/dgmm/inscriptions";
import { useMarins } from "@/lib/dgmm/store";

export const Route = createFileRoute("/suivi-demande")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    ...validateLang(s),
    numero: typeof s["numero"] === "string" ? s["numero"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Suivre ma demande — DGMM" }] }),
  component: SuiviDemande,
});

function normaliserNumero(value: string) {
  return value.trim().toUpperCase().replace(/^DGMM-PRE:/, "");
}

function SuiviDemande() {
  const { lang = "fr", numero } = Route.useSearch();
  const navigate = useNavigate();
  const [saisie, setSaisie] = useState(numero ?? "");
  const [recherche, setRecherche] = useState(numero ?? "");
  const { pre } = useInscriptions();
  const marins = useMarins();
  const demande = pre.find((p) => p.numero === normaliserNumero(recherche));
  const marin = demande?.marinId ? marins.find((m) => m.id === demande.marinId) : undefined;
  const station = demande ? STATIONS.find((s) => s.code === demande.station) : undefined;
  const loc = lang === "fr" ? "fr-FR" : "en-GB";
  const date = (value: string) =>
    value ? new Date(value).toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric" }) : "";
  const t = {
    title: lang === "fr" ? "Suivre ma demande" : "Track my application",
    label: lang === "fr" ? "Numéro du récépissé" : "Receipt number",
    placeholder: lang === "fr" ? "PRE-2026-0004 ou DGMM-PRE:PRE-2026-0004" : "PRE-2026-0004 or DGMM-PRE:PRE-2026-0004",
    submit: lang === "fr" ? "Rechercher" : "Search",
    registered: lang === "fr" ? "Demande enregistrée en ligne" : "Application registered online",
    appointment: lang === "fr" ? "Rendez-vous en station" : "Station appointment",
    validated: lang === "fr" ? "Dossier validé & NIP attribué" : "File validated & NIP assigned",
    notFound: lang === "fr" ? "Aucune demande trouvée pour ce récépissé." : "No application found for this receipt.",
    classified: lang === "fr" ? "Demande classée" : "Application closed",
    meet: lang === "fr" ? "Votre station vous accueillera à l'adresse indiquée sur le récépissé." : "Your station will receive you at the address shown on your receipt.",
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setRecherche(normaliserNumero(saisie));
  };
  return (
    <VerifyShell
      lang={lang}
      onLang={(l: Lang) => {
        navigate({
          to: "/suivi-demande",
          search: {
            numero: recherche || undefined,
            lang: l === "en" ? "en" : undefined,
          },
          replace: true,
        });
      }}
      sousTitre={t.title}
    >
      <div className="w-full max-w-2xl space-y-5">
        <section className="overflow-hidden rounded-xl border bg-card shadow-card">
          <div className="bg-primary-soft px-5 py-4">
            <h1 className="font-display text-xl font-bold text-primary">{t.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {lang === "fr" ? "Saisissez le numéro imprimé sur votre récépissé ou scannez son QR code." : "Enter the number printed on your receipt or scan its QR code."}
            </p>
          </div>
          <form onSubmit={submit} className="flex gap-2 p-5">
            <label className="field-dgmm flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md bg-card px-3">
              <Search className="size-4 text-muted-foreground" />
              <span className="sr-only">{t.label}</span>
              <input
                autoComplete="off"
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                placeholder={t.placeholder}
                className="h-full min-w-0 flex-1 bg-transparent font-mono text-sm uppercase outline-none"
              />
            </label>
            <Button type="submit" className="h-11"><Search /> {t.submit}</Button>
          </form>
        </section>

        {recherche && !demande && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/8 p-4 text-sm text-destructive">
            <AlertCircle className="mr-2 inline size-4" />{t.notFound}
          </p>
        )}

        {demande && (
          <>
            <section className="rounded-xl border bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">{t.label}</div>
                  <div className="font-mono text-lg font-bold text-primary">{demande.numero}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{demande.nom} {demande.prenom}</div>
                </div>
                <div className="rounded-lg bg-white p-2">
                  <QRCodeSVG value={`DGMM-PRE:${demande.numero}`} size={104} />
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Jalon actif label={t.registered} detail={date(demande.creeLe)} />
                <Jalon
                  actif
                  label={t.appointment}
                  detail={`${station?.ville ?? demande.station}${demande.rdv ? ` · ${date(demande.rdv)}` : ""}${station?.contact ? ` · ${station.contact}` : ""}`}
                />
                <Jalon
                  actif={demande.statut === "convertie"}
                  label={t.validated}
                  detail={demande.statut === "convertie" ? marin?.nip ?? "NIP attribué" : ""}
                />
              </div>
              {demande.statut === "classee" && (
                <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                  <AlertCircle className="mr-2 inline size-4" />
                  {t.classified}{demande.motif ? ` : ${demande.motif}` : "."}
                </p>
              )}
              {demande.statut === "en_attente" && (
                <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4 text-secondary" />{t.meet}
                </p>
              )}
              {demande.statut === "convertie" && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-success/8 p-3">
                  <p className="text-sm font-semibold text-success">
                    {lang === "fr" ? `Votre NIP officiel : ${marin?.nip ?? "attribué"}` : `Your official seafarer ID: ${marin?.nip ?? "assigned"}`}
                  </p>
                  <Button asChild variant="gold">
                    <Link to="/mon-espace">{lang === "fr" ? "Connexion Espace Marin" : "Seafarer login"}</Link>
                  </Button>
                </div>
              )}
              <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => window.print()}>
                {lang === "fr" ? "Imprimer le récépissé" : "Print receipt"}
              </Button>
            </section>
          </>
        )}
      </div>
    </VerifyShell>
  );
}

function Jalon({ actif, label, detail }: { actif: boolean; label: string; detail: string }) {
  return (
    <div className={`rounded-lg border p-3 ${actif ? "border-success/30 bg-success/8" : "bg-muted/40"}`}>
      {actif ? <CheckCircle2 className="size-5 text-success" /> : <Clock3 className="size-5 text-muted-foreground" />}
      <div className={`mt-2 text-sm font-semibold ${actif ? "text-success" : "text-muted-foreground"}`}>{label}</div>
      {detail && <div className="mt-1 text-xs text-muted-foreground">{detail}</div>}
    </div>
  );
}
