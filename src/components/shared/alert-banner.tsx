"use client";

interface AlertBannerProps {
  type: "warning" | "error" | "info" | "success";
  title: string;
  messages: string[];
  onDismiss?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

const typeStyles = {
  warning: "bg-amber-50 border-amber-300 text-amber-800",
  error: "bg-red-50 border-red-300 text-red-800",
  info: "bg-blue-50 border-blue-300 text-blue-800",
  success: "bg-green-50 border-green-300 text-green-800",
};

const iconMap = {
  warning: "⚠",
  error: "✕",
  info: "ℹ",
  success: "✓",
};

export function AlertBanner({
  type,
  title,
  messages,
  onDismiss,
  actionLabel,
  onAction,
}: AlertBannerProps) {
  return (
    <div className={`rounded-lg border p-4 ${typeStyles[type]}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0 mt-0.5">{iconMap[type]}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{title}</h4>
          {messages.length > 0 && (
            <ul className="mt-2 space-y-1">
              {messages.map((msg, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-current flex-shrink-0" />
                  {msg}
                </li>
              ))}
            </ul>
          )}
          {(onAction || onDismiss) && (
            <div className="mt-3 flex gap-3">
              {onAction && (
                <button
                  onClick={onAction}
                  className="text-sm font-medium underline hover:no-underline"
                >
                  {actionLabel || "Proceed Anyway"}
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-sm opacity-75 hover:opacity-100"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
