import { useMemo, useSyncExternalStore } from "react";
import { useInscriptions } from "@/lib/dgmm/inscriptions";
import {
  lastCertificate,
  type AuditEntry,
  type Embarquement,
  type Marin,
  type RoleEquipage,
  type Visite,
  useAudit,
  useMarins,
  useRoles,
  useVisites,
} from "@/lib/dgmm/store";

export interface VerificationPublique {
  date: string;
  canal: "nip" | "certificat" | "qr";
  resultat: "conforme" | "anomalie";
}

const VERIFICATIONS_KEY = "dgmm-psc-verifications-v1";
const VERIFICATIONS_VIDES: VerificationPublique[] = [];
const verificationListeners = new Set<() => void>();
let verificationCache: VerificationPublique[] | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === VERIFICATIONS_KEY) {
      verificationCache = null;
      verificationListeners.forEach((listener) => listener());
    }
  });
}

function lireVerifications(): VerificationPublique[] {
  if (typeof window === "undefined") return [];
  if (!verificationCache) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(VERIFICATIONS_KEY) ?? "[]") as unknown;
      verificationCache = Array.isArray(parsed)
        ? parsed.filter(
            (item): item is VerificationPublique =>
              !!item &&
              typeof item === "object" &&
              typeof (item as VerificationPublique).date === "string" &&
              ["nip", "certificat", "qr"].includes((item as VerificationPublique).canal) &&
              ["conforme", "anomalie"].includes((item as VerificationPublique).resultat),
          )
        : [];
    } catch {
      verificationCache = [];
    }
  }
  return verificationCache;
}

export function enregistrerVerificationPublique(
  canal: VerificationPublique["canal"],
  resultat: VerificationPublique["resultat"],
) {
  const verifications = [
    ...lireVerifications(),
    { date: new Date().toISOString(), canal, resultat },
  ];
  try {
    window.localStorage.setItem(VERIFICATIONS_KEY, JSON.stringify(verifications.slice(-5000)));
  } catch (error) {
    throw new Error("Impossible d'enregistrer la statistique de contrôle PSC.", { cause: error });
  }
  verificationCache = verifications.slice(-5000);
  verificationListeners.forEach((listener) => listener());
}

export function useVerificationsPubliques() {
  return useSyncExternalStore(
    (listener) => {
      verificationListeners.add(listener);
      return () => verificationListeners.delete(listener);
    },
    lireVerifications,
    () => VERIFICATIONS_VIDES,
  );
}

export interface StatistiquesDgmm {
  naviresActifs: number;
  marinsActifsEnMer: number;
  marinsGabonaisActifs: number;
  tauxGabonisation: number;
  ages: { nom: string; nombre: number }[];
  metiers: { nom: string; nombre: number }[];
  flotte: { nom: string; membres: number; gabonais: number; tauxGabonisation: number }[];
  attenteVisa: {
    nombre: number;
    joursMoyens: number;
    plusAncienJours: number;
    depasses14Jours: number;
  };
  certificats: { dans30Jours: number; dans60Jours: number; dans90Jours: number };
  clinique: {
    totalSignes: number;
    verdicts: { nom: string; nombre: number }[];
    deficiencesIshihara: number;
    restrictionsMachine: number;
    delaiSignatureMoyenJours: number;
    causes: { nom: string; nombre: number }[];
  };
  preInscription: {
    enAttente: number;
    converties: number;
    rejetees: number;
    delaiMoyenJours: number | null;
    rejets: { nom: string; nombre: number }[];
  };
  mouvements: {
    embarquements: number;
    debarquements: number;
    stations: { nom: string; nombre: number }[];
    mensuels: { nom: string; embarquements: number; debarquements: number }[];
  };
  livretsParStation: { nom: string; nombre: number }[];
  conformiteMlc: { depasse11Mois: number };
  activitePortuaire: { enAttenteVisa: number; sousQuota: string[] };
  verificationPublique: { total: number; anomalies: number; conformes: number };
  flotteArmateur: {
    marinsEligiblesTurnover: number;
    turnover180Jours: number;
    rolesEnAttenteVisa: number;
  };
  serviceMer: { joursValides3Ans: number; joursTerre3Ans: number };
  audit: AuditEntry[];
}

const DAY = 86_400_000;

function currentEmbarkements(marins: Marin[], now: Date): { marin: Marin; emb: Embarquement }[] {
  return marins
    .flatMap((marin) =>
      (marin.embarquements ?? [])
        .filter(
          (emb) =>
            !emb.debarquement || emb.statut === "en_attente_validation" || emb.statut === "rejete",
        )
        .map((emb) => ({ marin, emb })),
    )
    .filter(({ emb }) => new Date(emb.embarquement).getTime() <= now.getTime());
}

export function calculerIndicateursPublics(marins: Marin[], now = new Date()) {
  const enMer = currentEmbarkements(marins, now);
  const marinsActifs = [...new Map(enMer.map(({ marin }) => [marin.id, marin])).values()];
  return {
    naviresActifs: new Set(enMer.map(({ emb }) => emb.navire)).size,
    marinsGabonaisActifs: marinsActifs.filter((marin) => /gabon/i.test(marin.nationalite)).length,
  };
}

function ageRange(personne: Marin, now: Date) {
  const naissance = new Date(personne.dateNaissance);
  if (!Number.isFinite(naissance.getTime())) return "Autres âges";
  let annees = now.getFullYear() - naissance.getFullYear();
  const anniversaire =
    now.getMonth() > naissance.getMonth() ||
    (now.getMonth() === naissance.getMonth() && now.getDate() >= naissance.getDate());
  if (!anniversaire) annees -= 1;
  if (annees >= 18 && annees <= 25) return "18–25 ans";
  if (annees >= 26 && annees <= 45) return "26–45 ans";
  if (annees >= 46 && annees <= 60) return "46–60 ans";
  return "Autres âges";
}

function joursDepuis(date: string | undefined, now: Date): number | null {
  if (!date) return null;
  const timestamp = new Date(date).getTime();
  return Number.isFinite(timestamp)
    ? Math.max(0, Math.floor((now.getTime() - timestamp) / DAY))
    : null;
}

function ageVisa(marin: Marin, now: Date): number | null {
  const transmission = [...(marin.historique ?? [])]
    .reverse()
    .find((event) => /transmis.*direction/i.test(event.action));
  return joursDepuis(transmission?.date, now);
}

function comptePar<T>(items: T[], key: (item: T) => string) {
  const compte = new Map<string, number>();
  for (const item of items) {
    const nom = key(item) || "Non renseigné";
    compte.set(nom, (compte.get(nom) ?? 0) + 1);
  }
  return [...compte.entries()]
    .map(([nom, nombre]) => ({ nom, nombre }))
    .sort((a, b) => b.nombre - a.nombre || a.nom.localeCompare(b.nom));
}

function borne3Ans(emb: Embarquement, now: Date): number {
  if (emb.statut !== "valide_dgmm" || !emb.embarquement) return 0;
  const start = new Date(emb.embarquement).getTime();
  const end = emb.debarquement ? new Date(emb.debarquement).getTime() : now.getTime();
  const cutoff = now.getTime() - 3 * 365 * DAY;
  if (![start, end].every(Number.isFinite) || end < cutoff || start > now.getTime()) return 0;
  return Math.max(0, Math.floor((Math.min(end, now.getTime()) - Math.max(start, cutoff)) / DAY));
}

function classerRejet(action: string) {
  const texte = action.toLowerCase();
  if (/identit|cni|passeport|illisible/.test(texte)) return "Pièce d'identité illisible";
  if (/stcw|brevet|certificat|authentifi/.test(texte)) return "Certificat STCW à vérifier";
  if (/état civil|etat civil|naissance|identité/.test(texte)) return "Incohérence d'état civil";
  return "Autre motif / non précisé";
}

export function calculerStatistiquesDgmm({
  marins,
  visites,
  roles,
  audit,
  preInscription,
  verifications,
  now = new Date(),
}: {
  marins: Marin[];
  visites: Visite[];
  roles: RoleEquipage[];
  audit: AuditEntry[];
  preInscription: ReturnType<typeof useInscriptions>;
  verifications: VerificationPublique[];
  now?: Date;
}): StatistiquesDgmm {
  const enMer = currentEmbarkements(marins, now);
  const marinsActifs = [...new Map(enMer.map(({ marin }) => [marin.id, marin])).values()];
  const gabonais = marinsActifs.filter((marin) => /gabon/i.test(marin.nationalite));
  const navires = new Map<string, { membres: Set<number>; gabonais: Set<number> }>();
  for (const { marin, emb } of enMer) {
    const navire = navires.get(emb.navire) ?? {
      membres: new Set<number>(),
      gabonais: new Set<number>(),
    };
    navire.membres.add(marin.id);
    if (/gabon/i.test(marin.nationalite)) navire.gabonais.add(marin.id);
    navires.set(emb.navire, navire);
  }

  const enAttenteVisa = marins.filter((marin) => marin.validationAdmin === "transmis_direction");
  const delaisVisa = enAttenteVisa
    .map((marin) => ageVisa(marin, now))
    .filter((jour): jour is number => jour !== null);
  const certificats = marins
    .map((marin) => lastCertificate(visites, marin.id))
    .filter((visite): visite is Visite => !!visite?.signee && !visite.revoquee);
  const restant = certificats.map((visite) =>
    Math.ceil((new Date(`${visite.stcw.validJusquau}T23:59:59`).getTime() - now.getTime()) / DAY),
  );
  const visitesSignees = visites.filter((visite) => visite.signee && !visite.revoquee);
  const dernieresVisites = marins
    .map((marin) => lastCertificate(visites, marin.id))
    .filter((visite): visite is Visite => !!visite?.signee && !visite.revoquee);
  const causeCounts = new Map<string, number>();
  for (const visite of dernieresVisites) {
    const detail = `${visite.stcw.details} ${visite.recommandations}`.toLowerCase();
    const cause = /vision|acuit|ishihara|couleur/.test(detail)
      ? "Vision / perception des couleurs"
      : /audition|audit|bruit|oreille/.test(detail)
        ? "Audition / bruit"
        : /cardio|tension|hypertension|cœur|coeur/.test(detail)
          ? "Cardiologie / hypertension"
          : /psych|stress|anxi/.test(detail)
            ? "Aptitude psychologique"
            : "";
    if (cause) causeCounts.set(cause, (causeCounts.get(cause) ?? 0) + 1);
  }
  const latestMedical = comptePar(
    dernieresVisites.filter((visite) => visite.stcw.verdict).map((visite) => visite.stcw.verdict),
    (verdict) =>
      verdict === "apte"
        ? "Apte sans restriction"
        : verdict === "apte_restrictions"
          ? "Apte avec restriction"
          : verdict === "inapte_temporaire"
            ? "Inapte temporaire"
            : verdict === "inapte"
              ? "Inapte"
              : "Non renseigné",
  );
  const recentThreeYears = marins
    .flatMap((marin) => (marin.embarquements ?? []).map((emb) => ({ marin, emb })))
    .filter(({ emb }) => emb.statut === "valide_dgmm");
  const joursMer = recentThreeYears.reduce((sum, { emb }) => sum + borne3Ans(emb, now), 0);
  const joursTerre = Math.max(0, marins.length * 3 * 365 - joursMer);
  const waitingEmbarkements = enMer.filter(
    ({ emb }) => emb.statut === "en_attente_validation",
  ).length;
  const limiteMlc = new Date(now);
  limiteMlc.setUTCMonth(limiteMlc.getUTCMonth() - 11);
  const depasse11Mois = new Set(
    enMer
      .filter(({ emb }) => new Date(emb.embarquement).getTime() < limiteMlc.getTime())
      .map(({ marin }) => marin.id),
  ).size;
  const mouvements = marins.flatMap((marin) =>
    (marin.embarquements ?? [])
      .filter((emb) => emb.statut === "valide_dgmm")
      .map((emb) => ({ marin, emb })),
  );
  const mouvementsAnnee = mouvements.filter(
    ({ emb }) => new Date(emb.embarquement).getTime() <= now.getTime(),
  );
  const mensuels = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), index, 1);
    const nom = date.toLocaleDateString("fr-FR", { month: "short" });
    const debut = date.getTime();
    const fin = new Date(now.getFullYear(), index + 1, 1).getTime();
    return {
      nom,
      embarquements: mouvementsAnnee.filter(({ emb }) => {
        const timestamp = new Date(emb.embarquement).getTime();
        return timestamp >= debut && timestamp < fin;
      }).length,
      debarquements: mouvementsAnnee.filter(({ emb }) => {
        if (!emb.debarquement) return false;
        const timestamp = new Date(emb.debarquement).getTime();
        return timestamp >= debut && timestamp < fin;
      }).length,
    };
  });
  const turnoverEligible = marins.filter((marin) => {
    const embarquements = (marin.embarquements ?? [])
      .filter((emb) => emb.statut === "valide_dgmm" && emb.armateur === marin.entreprise)
      .sort((a, b) => b.embarquement.localeCompare(a.embarquement));
    const dernier = embarquements[0];
    if (!dernier?.debarquement) return false;
    const dernierRetour = embarquements.find((emb) => emb.embarquement > dernier.debarquement);
    return !dernierRetour && (joursDepuis(dernier.debarquement, now) ?? 0) >= 180;
  });
  const anonymes = verifications.reduce(
    (counts, verification) => {
      counts.total += 1;
      if (verification.resultat === "conforme") counts.conformes += 1;
      else counts.anomalies += 1;
      return counts;
    },
    { total: 0, anomalies: 0, conformes: 0 } as {
      total: number;
      anomalies: number;
      conformes: number;
    },
  );
  const datesConversion = preInscription.pre
    .filter((demande) => demande.statut === "convertie" && demande.marinId)
    .map((demande) => {
      const marin = marins.find((item) => item.id === demande.marinId);
      const jours = marin ? joursDepuis(demande.creeLe, new Date(marin.creeLe)) : null;
      return jours;
    })
    .filter((jour): jour is number => jour !== null);
  const motifsRejet = [
    ...audit
      .filter((event) => /rej(et|eu)/i.test(event.action))
      .map((event) => classerRejet(event.action)),
    ...preInscription.pre
      .filter((demande) => demande.statut === "classee" && !!demande.motif)
      .map((demande) => classerRejet(demande.motif ?? "")),
  ];

  return {
    naviresActifs: navires.size,
    marinsActifsEnMer: marinsActifs.length,
    marinsGabonaisActifs: gabonais.length,
    tauxGabonisation: marinsActifs.length
      ? Math.round((gabonais.length / marinsActifs.length) * 100)
      : 0,
    ages: comptePar(marinsActifs, (marin) => ageRange(marin, now)),
    metiers: comptePar(marins, (marin) => {
      const profession = marin.profession.toLowerCase();
      if (/capitaine|officier pont|matelot|pont/.test(profession)) return "Filière Pont";
      if (/mécan|mecan|machine|électron|electron/.test(profession)) return "Filière Machine";
      if (/cuisin|hôtesse|hotess|steward/.test(profession)) return "Filière Appui / Hôtellerie";
      return "Autres fonctions";
    }),
    flotte: [...navires.entries()].map(([nom, equipage]) => ({
      nom,
      membres: equipage.membres.size,
      gabonais: equipage.gabonais.size,
      tauxGabonisation: equipage.membres.size
        ? Math.round((equipage.gabonais.size / equipage.membres.size) * 100)
        : 0,
    })),
    attenteVisa: {
      nombre: enAttenteVisa.length,
      joursMoyens: delaisVisa.length
        ? Math.round(delaisVisa.reduce((sum, jour) => sum + jour, 0) / delaisVisa.length)
        : 0,
      plusAncienJours: Math.max(0, ...delaisVisa),
      depasses14Jours: delaisVisa.filter((jour) => jour > 14).length,
    },
    certificats: {
      dans30Jours: restant.filter((jours) => jours >= 0 && jours <= 30).length,
      dans60Jours: restant.filter((jours) => jours >= 0 && jours <= 60).length,
      dans90Jours: restant.filter((jours) => jours >= 0 && jours <= 90).length,
    },
    clinique: {
      totalSignes: visitesSignees.length,
      verdicts: latestMedical,
      deficiencesIshihara: dernieresVisites.filter((visite) => visite.stcw.couleurs === "non")
        .length,
      restrictionsMachine: dernieresVisites.filter(
        (visite) =>
          visite.stcw.couleurs === "non" &&
          /machine/i.test(`${visite.stcw.details} ${visite.recommandations}`),
      ).length,
      delaiSignatureMoyenJours: visitesSignees.length
        ? Number(
            (
              visitesSignees.reduce((sum, visite) => {
                const delay =
                  new Date(visite.traiteLe).getTime() - new Date(visite.creeLe).getTime();
                return sum + (Number.isFinite(delay) ? Math.max(0, delay) / DAY : 0);
              }, 0) / visitesSignees.length
            ).toFixed(1),
          )
        : 0,
      causes: [...causeCounts.entries()].map(([nom, nombre]) => ({ nom, nombre })),
    },
    preInscription: {
      enAttente: preInscription.pre.filter((demande) => demande.statut === "en_attente").length,
      converties: preInscription.pre.filter((demande) => demande.statut === "convertie").length,
      rejetees: preInscription.pre.filter((demande) => demande.statut === "classee").length,
      delaiMoyenJours: datesConversion.length
        ? Number(
            (datesConversion.reduce((sum, jour) => sum + jour, 0) / datesConversion.length).toFixed(
              1,
            ),
          )
        : null,
      rejets: comptePar(motifsRejet, (motif) => motif),
    },
    mouvements: {
      embarquements: mouvementsAnnee.filter(
        ({ emb }) => new Date(emb.embarquement).getFullYear() === now.getFullYear(),
      ).length,
      debarquements: mouvementsAnnee.filter(
        ({ emb }) =>
          !!emb.debarquement && new Date(emb.debarquement).getFullYear() === now.getFullYear(),
      ).length,
      stations: comptePar(
        mouvementsAnnee.filter(
          ({ emb }) => new Date(emb.embarquement).getFullYear() === now.getFullYear(),
        ),
        ({ marin }) => marin.station ?? "Non renseignée",
      ),
      mensuels,
    },
    livretsParStation: comptePar(
      marins.filter((marin) => !!marin.livret),
      (marin) => marin.station ?? "Non renseignée",
    ),
    conformiteMlc: { depasse11Mois },
    activitePortuaire: {
      enAttenteVisa: waitingEmbarkements,
      sousQuota: [...navires.entries()]
        .filter(
          ([, equipage]) =>
            equipage.membres.size > 0 && equipage.gabonais.size / equipage.membres.size < 0.62,
        )
        .map(([nom]) => nom),
    },
    verificationPublique: anonymes,
    flotteArmateur: {
      marinsEligiblesTurnover: marins.filter((marin) => !!marin.entreprise).length,
      turnover180Jours: marins.length
        ? Math.round((turnoverEligible.length / marins.length) * 100)
        : 0,
      rolesEnAttenteVisa: roles.filter((role) =>
        marins.some((marin) =>
          (marin.embarquements ?? []).some(
            (emb) => emb.roleId === role.id && emb.statut === "en_attente_validation",
          ),
        ),
      ).length,
    },
    serviceMer: { joursValides3Ans: joursMer, joursTerre3Ans: joursTerre },
    audit,
  };
}

export function useStatistiquesDgmm(now = new Date()) {
  const marins = useMarins();
  const visites = useVisites();
  const roles = useRoles();
  const audit = useAudit();
  const inscriptions = useInscriptions();
  const verifications = useVerificationsPubliques();
  return useMemo(
    () =>
      calculerStatistiquesDgmm({
        marins,
        visites,
        roles,
        audit,
        preInscription: inscriptions,
        verifications,
        now,
      }),
    [marins, visites, roles, audit, inscriptions, verifications, now],
  );
}
