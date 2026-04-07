/**
 * Контейнер toast-уведомлений
 * Фиксируется в правом верхнем углу (на десктопе) / снизу (на мобиле)
 */

import { useToastStore, type Toast } from '@/store/useToastStore';

const ICONS: Record<Toast['type'], string> = {
  success: '✓',
  error: '✕',
  info: 'i',
};

const COLORS: Record<Toast['type'], string> = {
  success: 'bg-green-700 border-green-600',
  error: 'bg-red-700 border-red-600',
  info: 'bg-blue-700 border-blue-600',
};

const ICON_COLORS: Record<Toast['type'], string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

function ToastItem({ toast }: { toast: Toast }) {
  const remove = useToastStore((s) => s.remove);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl text-white text-sm min-w-[240px] max-w-[360px] animate-slide-in ${COLORS[toast.type]}`}
    >
      <span
        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${ICON_COLORS[toast.type]}`}
      >
        {ICONS[toast.type]}
      </span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => remove(toast.id)}
        className="flex-shrink-0 text-white/60 hover:text-white transition-colors text-xs"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
}
