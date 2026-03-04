"use client";

type Verdict = "go" | "no_go" | "conditional";

const verdictConfig: Record<Verdict, { label: string; bg: string; icon: string; description: string }> = {
  go: {
    label: "GO",
    bg: "bg-green-500",
    icon: "✓",
    description: "This deal meets your investment criteria. Proceed to LOI.",
  },
  no_go: {
    label: "NO-GO",
    bg: "bg-red-500",
    icon: "✕",
    description: "This deal does not meet your investment criteria.",
  },
  conditional: {
    label: "CONDITIONAL",
    bg: "bg-amber-500",
    icon: "?",
    description: "This deal has potential but requires adjustments.",
  },
};

interface VerdictBannerProps {
  verdict: Verdict | string;
  reasoning?: string | null;
}

export function VerdictBanner({ verdict, reasoning }: VerdictBannerProps) {
  const config = verdictConfig[verdict as Verdict] || verdictConfig.no_go;

  return (
    <div className={`${config.bg} text-white rounded-xl p-6 shadow-lg`}>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
          {config.icon}
        </div>
        <div>
          <div className="text-3xl font-bold tracking-wide">{config.label}</div>
          <div className="text-sm opacity-90 mt-1">{config.description}</div>
        </div>
      </div>
      {reasoning && (
        <div className="mt-4 pt-4 border-t border-white/20 text-sm leading-relaxed opacity-90">
          {reasoning}
        </div>
      )}
    </div>
  );
}
