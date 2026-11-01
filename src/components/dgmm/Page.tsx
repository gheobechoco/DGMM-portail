import type { ReactNode } from "react";
import { AlertCircle, Check, type LucideIcon } from "lucide-react";
import { Aide, type Terme } from "@/components/dgmm/Aide";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string;
  subtitle?: ReactNode | undefined;
  actions?: ReactNode | undefined;
  eyebrow?: ReactNode | undefined;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-2xl font-bold text-primary sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode | undefined;
  description?: ReactNode | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
  bodyClassName?: string | undefined;
}) {
  return (
    <section className={cn("rounded-xl border bg-card shadow-card", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-base font-semibold text-primary">{title}</h2>
            )}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

const TONES = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  danger: "bg-destructive/10 text-destructive",
  gold: "bg-gold/20 text-gold-foreground",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode | undefined;
  icon: LucideIcon;
  tone?: keyof typeof TONES | undefined;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-3xl font-bold tabular-nums text-primary">
            {value}
          </div>
        </div>
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", TONES[tone])}>
          <Icon className="size-5" />
        </span>
      </div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode | undefined;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </span>
      <div className="mt-3 font-display font-semibold text-primary">{title}</div>
      {children && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

/** Ligne « libellé : valeur » pour les fiches. */
export function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-foreground">{children || "—"}</dd>
    </div>
  );
}

export const selectClass = "field-dgmm h-10 w-full rounded-md bg-card px-3 text-sm";
export const inputClass =
  "field-dgmm h-10 w-full rounded-md bg-card px-3 text-sm placeholder:text-muted-foreground";
export const textareaClass =
  "field-dgmm min-h-20 w-full rounded-md bg-card px-3 py-2 text-sm placeholder:text-muted-foreground";

export function Field({
  label,
  htmlFor,
  required,
  error,
  children,
  className,
  hint,
  aide,
  valid,
}: {
  label: string;
  htmlFor?: string | undefined;
  required?: boolean | undefined;
  error?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
  hint?: string | undefined;
  /** Terme du glossaire réglementaire affiché dans une info-bulle « ? ». */
  aide?: Terme | undefined;
  /** Champ vérifié et conforme : affiche une coche verte. */
  valid?: boolean | undefined;
}) {
  return (
    <div
      className={cn("space-y-1.5", className)}
      data-state={error ? "invalid" : valid ? "valid" : undefined}
    >
      <div className="flex items-center gap-1">
        <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
        {aide && <Aide terme={aide} />}
        {valid && !error && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-success">
            <Check className="size-3.5" aria-hidden /> <span className="sr-only">Champ valide</span>
          </span>
        )}
      </div>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="flex items-start gap-1 text-xs text-destructive" aria-live="polite">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
