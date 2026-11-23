import { KeyRound, ShieldAlert, X } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface SeatPinModalProps {
  mode: 'unlock' | 'admin-reset';
  studentName: string;
  seatNumber: number;
  onClose: () => void;
  onSubmitPin: (pin4Digits: string) => Promise<string | null>;
}

export function SeatPinModal({
  mode,
  studentName,
  seatNumber,
  onClose,
  onSubmitPin,
}: SeatPinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isReset = mode === 'admin-reset';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const digits = pin.replace(/\D/g, '');
    if (digits.length !== 4) {
      setError('Please enter a 4-digit numeric PIN.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const errorMsg = await onSubmitPin(digits);
      if (errorMsg) {
        setError(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="seat-pin-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-stone-950/65"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md max-h-[94%] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isReset ? 'bg-amber-100 text-amber-900' : 'bg-[#1E3A2F] text-amber-50'
              }`}
            >
              {isReset ? <ShieldAlert className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
            </div>
            <div>
              <h2 id="seat-pin-modal-title" className="text-base font-semibold text-stone-900">
                {isReset ? 'Reset Student Edit PIN' : 'Unlock Your Seat'}
              </h2>
              <p className="text-xs text-stone-500">
                {studentName} · Seat #{String(seatNumber).padStart(2, '0')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close PIN modal"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed mb-3.5">
          {isReset
            ? 'Assign a fresh 4-digit Edit PIN for this classmate so they can edit or move their seat again.'
            : 'Enter the 4-digit personal Edit PIN you set when claiming this desk. Once verified, this device can edit, move, or vacate your seat.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {isReset ? 'New 4-Digit Edit PIN' : 'Your 4-Digit Edit PIN'}
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoFocus
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                setError('');
              }}
              placeholder="••••"
              className="w-full px-4 py-2 text-center text-xl font-mono tracking-[0.45em] font-semibold border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
            />
            {error && <p className="text-xs text-rose-600 mt-1.5 font-medium">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || pin.length !== 4}
              className="px-4 py-2 text-xs font-semibold bg-[#1E3A2F] hover:bg-[#162C23] disabled:opacity-55 text-amber-50 rounded-lg cursor-pointer"
            >
              {submitting ? 'Verifying...' : isReset ? 'Save New PIN' : 'Unlock Seat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
