import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { useSession, type Account } from "@/lib/dgmm/auth";
import { can, type Permission } from "@/lib/dgmm/rules";
import { EmptyState } from "@/components/dgmm/Page";

/** Affiche le contenu seulement si le rôle connecté possède la permission. */
export function RequirePerm({
  perm,
  children,
}: {
  perm: Permission;
  children: (session: Account) => ReactNode;
}) {
  const session = useSession();
  if (!session) return null;
  if (!can(session.role, perm)) {
    return (
      <div className="rounded-xl border bg-card shadow-card">
        <EmptyState icon={ShieldOff} title="Accès non autorisé">
          Votre profil ({session.roleLabel}) ne donne pas accès à ce module.{" "}
          <Link
            to="/espace"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Retour à l'accueil
          </Link>
        </EmptyState>
      </div>
    );
  }
  return <>{children(session)}</>;
}
