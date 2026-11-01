import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/dgmm/AppShell";
import { EspaceSkeleton } from "@/components/dgmm/Skeletons";
import { useSession } from "@/lib/dgmm/auth";

export const Route = createFileRoute("/espace")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Espace professionnel — GDM | DGMM" },
      {
        name: "description",
        content:
          "Espace professionnel sécurisé du portail GDM de la Direction Générale de la Marine Marchande.",
      },
      { property: "og:title", content: "Espace professionnel — GDM | DGMM" },
      { property: "og:description", content: "Espace professionnel sécurisé de la DGMM." },
    ],
  }),
  pendingComponent: EspaceSkeleton,
  component: Espace,
});

function Espace() {
  const session = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (!session) navigate({ to: "/" });
  }, [session, navigate]);
  if (!session) return <EspaceSkeleton />;
  return (
    <AppShell session={session}>
      <Outlet />
    </AppShell>
  );
}
