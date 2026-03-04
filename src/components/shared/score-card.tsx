"use client";

type Score = "PASS" | "DISCUSS" | "FAIL";

const scoreStyles: Record<Score, string> = {
  PASS: "bg-green-100 text-green-800 border-green-300",
  DISCUSS: "bg-amber-100 text-amber-800 border-amber-300",
  FAIL: "bg-red-100 text-red-800 border-red-300",
};

interface ScoreCardProps {
  label: string;
  score: Score;
  value: string;
  threshold: string;
  notes?: string;
}

export function ScoreCard({ label, score, value, threshold, notes }: ScoreCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${scoreStyles[score]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm">{label}</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/50">
          {score}
        </span>
      </div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-75">Threshold: {threshold}</div>
      {notes && <div className="text-xs mt-1 italic">{notes}</div>}
    </div>
  );
}
