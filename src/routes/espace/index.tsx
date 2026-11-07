import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession } from "@/lib/dgmm/auth";
import { can, profil } from "@/lib/dgmm/rules";
import { MedicalDashboard, PilotageDashboard } from "@/components/dgmm/TableauxDeBord";

export const Route = createFileRoute("/espace/")({
  component: Accueil,
});

function Accueil() {
  const session = useSession();
  const navigate = useNavigate();
  const sansTableau = !!session && !can(session.role, "dashboard");
  useEffect(() => {
    // Sans tableau de bord : l'inspecteur sécurité arrive sur les navires, l'inspection du
    // travail et les délégués syndicaux sur les alertes.
    if (sansTableau) navigate({ to: session && can(session.role, "navires.inspection") ? "/espace/navires" : "/espace/alertes" });
  }, [sansTableau, navigate, session]);
  if (!session || sansTableau) return null;
  return profil(session.role) === "medical" ? (
    <MedicalDashboard session={session} />
  ) : (
    <PilotageDashboard session={session} />
  );
}

