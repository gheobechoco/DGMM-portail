import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportDgmmError } from "../lib/dgmm-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { AmbianceSaison } from "@/components/dgmm/Ambiance";
import { useHabillage } from "@/lib/dgmm/saisons";
import { appliquerPrefs, estSombre, usePrefs } from "@/lib/dgmm/prefs";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">Cette page n'existe pas ou a été déplacée.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportDgmmError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Cette page n'a pas pu se charger</h1>
        <p className="mt-2 text-sm text-muted-foreground">Une erreur est survenue. Réessayez ou revenez à l'accueil.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Réessayer
          </button>
          <a href="/" className="rounded-md border px-4 py-2 text-sm font-medium">Accueil</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GDM — Direction Générale de la Marine Marchande" },
      { name: "description", content: "Portail officiel de gestion des gens de mer de la Direction Générale de la Marine Marchande, République Gabonaise." },
      { name: "author", content: "Direction Générale de la Marine Marchande" },
      { name: "theme-color", content: "#0a192f" },
      { property: "og:site_name", content: "DGMM — République Gabonaise" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&family=Open+Sans:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const THEME_INIT = `try{var p=JSON.parse(localStorage.getItem("dgmm-prefs")||"{}");var d=p.theme==="sombre"||(p.theme!=="clair"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}}catch(e){}`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Applique le thème avant le premier affichage (évite le flash blanc en mode nuit). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const prefs = usePrefs();
  const habillage = useHabillage();
  useEffect(() => appliquerPrefs(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <AmbianceSaison habillage={habillage} />
      <Toaster richColors position="top-right" theme={estSombre(prefs) ? "dark" : "light"} />
    </QueryClientProvider>
  );
}
