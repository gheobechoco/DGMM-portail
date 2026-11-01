import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Pavé de signature (souris, stylet ou doigt) : la signature du marin est numérisée
 * en image PNG et enregistrée avec son dossier.
 */
export function SignaturePad({
  value,
  onChange,
}: {
  value?: string | undefined;
  onChange: (dataUrl: string | undefined) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dessine = useRef(false);
  const [vide, setVide] = useState(!value);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#13294B";
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, c.offsetWidth, c.offsetHeight);
      img.src = value;
    }
    // Uniquement au montage : la valeur initiale est redessinée une fois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-lg border-2 border-dashed bg-white">
        <canvas
          ref={canvas}
          className="h-32 w-full touch-none cursor-crosshair"
          aria-label="Zone de signature : signez avec la souris, un stylet ou le doigt"
          onPointerDown={(e) => {
            dessine.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            const ctx = e.currentTarget.getContext("2d");
            const p = pos(e);
            ctx?.beginPath();
            ctx?.moveTo(p.x, p.y);
          }}
          onPointerMove={(e) => {
            if (!dessine.current) return;
            const ctx = e.currentTarget.getContext("2d");
            const p = pos(e);
            ctx?.lineTo(p.x, p.y);
            ctx?.stroke();
            setVide(false);
          }}
          onPointerUp={(e) => {
            if (!dessine.current) return;
            dessine.current = false;
            onChange(e.currentTarget.toDataURL("image/png"));
          }}
        />
        {vide && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <PenLine className="size-4" /> Signez ici
            </span>
          </span>
        )}
        <span
          className="pointer-events-none absolute bottom-6 left-6 right-6 border-b border-slate-300"
          aria-hidden
        />
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          const c = canvas.current;
          c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
          setVide(true);
          onChange(undefined);
        }}
      >
        <Eraser /> Effacer
      </Button>
    </div>
  );
}
