import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertCircle, CheckCircle2, Clock3, MapPin, Search } from "lucide-react";
import { VerifyShell, validateLang, type Lang } from "@/components/dgmm/VerifyShell";
import { Button } from "@/components/ui/button";
import { STATIONS } from "@/lib/dgmm/maritime";
import { useInscriptions } from "@/lib/dgmm/inscriptions";
import { useMarins } from "@/lib/dgmm/store";
import { decoderJeton, lienRecepisse, lireCodeScanne } from "@/lib/dgmm/jetonQr";

export const Route = createFileRoute("/suivi-demande")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    ...validateLang(s),
    numero: typeof s["numero"] === "string" ? s["numero"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Suivre ma demande — DGMM" }] }),
  component: SuiviDemande,
});

/** Numéro du récépissé, que l'on colle le numéro, l'ancien code ou le lien complet du QR. */
function normaliserNumero(value: string) {
  return lireCodeScanne(value).id;
}

function SuiviDemande() {
  const { lang = "fr", numero, d } = Route.useSearch();
  const navigate = useNavigate();
  const [saisie, setSaisie] = useState(numero ?? "");
  const [recherche, setRecherche] = useState(numero ?? "");
  const { pre } = useInscriptions();
  const marins = useMarins();
  const demande = pre.find((p) => p.numero === normaliserNumero(recherche));
  const marin = demande?.marinId ? marins.find((m) => m.id === demande.marinId) : undefined;
  // Récépissé scanné sur un autre appareil : la demande n'y est pas, on lit les données scellées du QR.
  const lu = !demande ? decoderJeton(d) : null;
  const recu = lu && lu.jeton.t === "p" && lu.intact && lu.jeton.num === normaliserNumero(recherche) ? lu.jeton : null;
  const station = demande ? STATIONS.find((s) => s.code === demande.station) : recu ? STATIONS.find((s) => s.code === recu.st) : undefined;
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

        {recherche && !demande && !recu && d && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/8 p-4 text-sm text-destructive">
            <AlertCircle className="mr-2 inline size-4" />
            {lang === "fr" ? "QR code modifié : les données de ce récépissé ne correspondent pas à leur sceau. Document suspect." : "Altered QR code: this receipt's data does not match its seal. Suspicious document."}
          </p>
        )}
        {recherche && !demande && !recu && !d && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/8 p-4 text-sm text-destructive">
            <AlertCircle className="mr-2 inline size-4" />{t.notFound}
          </p>
        )}

        {recu && (
          <section className="rounded-xl border bg-card p-5 shadow-card">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="size-6 shrink-0 text-success" />
              <div>
                <div className="font-display text-lg font-bold text-primary">
                  {lang === "fr" ? "Récépissé de pré-inscription authentique" : "Authentic pre-registration receipt"}
                </div>
                <div className="font-mono text-sm font-semibold">{recu.num}</div>
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">{lang === "fr" ? "Demandeur" : "Applicant"}</dt><dd className="font-semibold">{recu.nom}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{lang === "fr" ? "Fonction visée" : "Intended capacity"}</dt><dd>{recu.fct ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{lang === "fr" ? "Déposée le" : "Submitted on"}</dt><dd>{date(recu.le)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{lang === "fr" ? "Station maritime" : "Maritime station"}</dt><dd>{station?.nom ?? recu.st}{station?.contact ? ` · ${station.contact}` : ""}</dd></div>
              {recu.rdv && <div><dt className="text-xs text-muted-foreground">{lang === "fr" ? "Rendez-vous souhaité" : "Requested appointment"}</dt><dd>{date(recu.rdv)}</dd></div>}
            </dl>
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-primary-soft p-3 text-sm text-primary">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              {lang === "fr"
                ? "Présentez ce récépissé à la station avec les originaux de vos pièces (pièce d'identité, acte de naissance, casier judiciaire, diplômes). L'agent scanne ce code et crée votre dossier officiel."
                : "Bring this receipt to the station with your original documents. The officer scans this code and opens your official file."}
            </p>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {lang === "fr" ? "Données lues dans le QR code : sceau d'intégrité intact." : "Data read from the QR code: integrity seal intact."}
            </p>
          </section>
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
                  <QRCodeSVG value={lienRecepisse({ t: "p", num: demande.numero, nom: `${demande.nom} ${demande.prenom}`, fct: demande.profession, nee: demande.dateNaissance, st: demande.station, le: demande.creeLe.slice(0, 10), rdv: demande.rdv || undefined })} size={140} level="L" marginSize={2} />
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
