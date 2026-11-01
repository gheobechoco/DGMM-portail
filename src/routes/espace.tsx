import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { DgmmLogo } from "@/components/dgmm/Logo";
import { RepubliqueBlock, Tricolor } from "@/components/dgmm/Brand";
import { Button } from "@/components/ui/button";
import { logout, useSession } from "@/lib/dgmm/auth";

export const Route = createFileRoute("/espace")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Espace professionnel — GDM | DGMM" },
      { name: "description", content: "Espace professionnel sécurisé du portail GDM de la Direction Générale de la Marine Marchande." },
      { property: "og:title", content: "Espace professionnel — GDM | DGMM" },
      { property: "og:description", content: "Espace professionnel sécurisé de la DGMM." },
    ],
  }),
  component: Espace,
});

function Espace() {
  const session = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (!session) navigate({ to: "/" });
  }, [session, navigate]);
  if (!session) return null;
  return (
    <div className="min-h-screen">
      <Tricolor />
      <header className="flex items-center justify-between bg-primary px-6 py-3 text-primary-foreground">
        <div className="flex items-center gap-3">
          <DgmmLogo className="size-10" />
          <span className="font-display font-semibold">DGMM · Système GDM</span>
        </div>
        <RepubliqueBlock light />
      </header>
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="font-display text-2xl font-bold text-primary">Bienvenue, {session.nom}</h1>
        <p className="mt-1 text-muted-foreground">{session.roleLabel}</p>
        <p className="mt-6 text-sm">Les modules (tableau de bord, marins, visites médicales) sont en cours de construction.</p>
        <Button variant="outline" className="mt-6" onClick={() => logout()}>Déconnexion</Button>
      </main>
    </div>
  );
}
