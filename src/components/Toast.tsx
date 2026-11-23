import { CheckCircle2, Info, X } from 'lucide-react';
import { ToastItem } from '@/src/types/classroom';

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-stone-900 text-amber-50 px-4 py-3 rounded-xl shadow-xl border border-stone-700 flex items-center justify-between gap-3 text-xs font-medium"
        >
          <div className="flex items-center gap-2 min-w-0">
            {toast.tone === 'info' ? (
              <Info className="w-4 h-4 text-amber-300 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="truncate">{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="text-stone-400 hover:text-white shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
