"use client";

type Grade = "A" | "B" | "C" | "D" | "F";

const gradeStyles: Record<Grade, string> = {
  A: "bg-green-500 text-white",
  B: "bg-blue-500 text-white",
  C: "bg-amber-500 text-white",
  D: "bg-orange-500 text-white",
  F: "bg-red-500 text-white",
};

const gradeLabels: Record<Grade, string> = {
  A: "Excellent",
  B: "Good",
  C: "Fair",
  D: "Below Average",
  F: "Failing",
};

interface GradeIndicatorProps {
  grade: Grade | string | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function GradeIndicator({ grade, size = "md", showLabel = true }: GradeIndicatorProps) {
  const g = (grade as Grade) || "F";
  const style = gradeStyles[g] || gradeStyles.F;
  const label = gradeLabels[g] || "Unknown";

  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-12 h-12 text-xl",
    lg: "w-16 h-16 text-3xl",
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${style} ${sizeClasses[size]} rounded-full flex items-center justify-center font-bold shadow-sm`}
      >
        {g}
      </div>
      {showLabel && (
        <div>
          <div className="text-sm font-medium text-gray-700">Deal Grade</div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      )}
    </div>
  );
}
