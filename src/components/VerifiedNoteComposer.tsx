import { KeyRound, Lock, Send, ShieldCheck } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { ClaimedSeatOption, VerifiedAuthorIdentity } from '@/src/types/classroom';

interface VerifiedNoteComposerProps {
  verifiedAuthor: VerifiedAuthorIdentity | null;
  claimedSeatOptions: ClaimedSeatOption[];
  placeholder: string;
  buttonLabel: string;
  maxLength?: number;
  buttonVariant?: 'dark' | 'emerald';
  canEnableAdmin?: boolean;
  onEnableAdminMode?: () => void;
  onVerifySeat: (seatId: string, pin4Digits: string) => Promise<string | null>;
  onSubmitNote: (message: string) => Promise<void> | void;
}

export function VerifiedNoteComposer({
  verifiedAuthor,
  claimedSeatOptions,
  placeholder,
  buttonLabel,
  maxLength = 140,
  buttonVariant = 'dark',
  canEnableAdmin = false,
  onEnableAdminMode,
  onVerifySeat,
  onSubmitNote,
}: VerifiedNoteComposerProps) {
  const [message, setMessage] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [selectedSeatId, setSelectedSeatId] = useState<string>(
    claimedSeatOptions[0]?.seatId ?? ''
  );
  const [pinInput, setPinInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    if (claimedSeatOptions.length === 0) {
      setSelectedSeatId('');
      return;
    }
    const stillExists = claimedSeatOptions.some((opt) => opt.seatId === selectedSeatId);
    if (!stillExists) {
      setSelectedSeatId(claimedSeatOptions[0].seatId);
    }
  }, [claimedSeatOptions, selectedSeatId]);

  const handleVerifySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    if (!selectedSeatId) {
      setVerifyError('Select your seat first.');
      return;
    }
    const cleanPin = pinInput.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      setVerifyError('Enter your 4-digit Edit PIN.');
      return;
    }
    setVerifying(true);
    try {
      const err = await onVerifySeat(selectedSeatId, cleanPin);
      if (err) {
        setVerifyError(err);
      } else {
        setPinInput('');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleNoteSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || !verifiedAuthor) return;
    setPostError(null);
    setPosting(true);
    try {
      await onSubmitNote(trimmed);
      setMessage('');
    } catch (err) {
      setPostError(
        err instanceof Error && err.message
          ? err.message
          : 'Could not post note. Please verify your seat PIN and try again.'
      );
    } finally {
      setPosting(false);
    }
  };

  if (!verifiedAuthor) {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-2.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <p className="text-[11px] font-medium text-stone-700 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#1E3A2F] shrink-0" />
            <span>Verify your seat to post — your name is auto-filled to prevent impersonation.</span>
          </p>
          {canEnableAdmin && onEnableAdminMode && (
            <button
              type="button"
              onClick={onEnableAdminMode}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-[#1E3A2F] border border-emerald-700/25 rounded-md transition-colors cursor-pointer shrink-0"
            >
              <ShieldCheck className="w-3 h-3" />
              Post as Admin
            </button>
          )}
        </div>

        {claimedSeatOptions.length > 0 ? (
          <form onSubmit={handleVerifySubmit} className="flex flex-wrap @sm:flex-nowrap gap-1.5">
            <select
              aria-label="Select your claimed seat"
              value={selectedSeatId}
              onChange={(e) => {
                setSelectedSeatId(e.target.value);
                setVerifyError(null);
              }}
              className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30"
            >
              {claimedSeatOptions.map((opt) => (
                <option key={opt.seatId} value={opt.seatId}>
                  {opt.fullName} ({opt.seatLabel})
                </option>
              ))}
            </select>

            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              required
              autoComplete="off"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                setVerifyError(null);
              }}
              placeholder="4-digit PIN"
              aria-label="Your 4-digit Edit PIN"
              className="w-24 px-2.5 py-1.5 text-xs font-mono tracking-widest text-center bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30"
            />

            <button
              type="submit"
              disabled={verifying}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#1E3A2F] hover:bg-[#162C23] disabled:opacity-60 text-amber-50 rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              <KeyRound className="w-3 h-3 text-amber-200" />
              {verifying ? 'Checking...' : 'Verify'}
            </button>
          </form>
        ) : (
          <p className="text-[11px] text-stone-500">
            Claim a vacant desk first to post with your verified name.
          </p>
        )}

        {verifyError && (
          <p className="text-[11px] text-rose-700 font-medium" role="alert">
            {verifyError}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleNoteSubmit} className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 px-2.5 py-1 bg-emerald-50/80 border border-emerald-700/20 rounded-lg text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-[#1E3A2F] min-w-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span className="truncate">
            Posting as <strong className="font-semibold">{verifiedAuthor.displayName}</strong>
            {verifiedAuthor.seatLabel ? (
              <span className="text-emerald-800/75"> · {verifiedAuthor.seatLabel}</span>
            ) : verifiedAuthor.isAdmin ? (
              <span className="text-emerald-800/75"> · Admin</span>
            ) : null}
          </span>
        </span>
        <span className="text-[10px] font-mono uppercase tracking-wide text-emerald-800/75 shrink-0">
          Verified
        </span>
      </div>

      <div className="flex flex-wrap @sm:flex-nowrap gap-1.5">
        <input
          type="text"
          required
          maxLength={maxLength}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (postError) setPostError(null);
          }}
          placeholder={placeholder}
          className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30"
        />
        <button
          type="submit"
          disabled={posting}
          className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold disabled:opacity-60 rounded-lg transition-colors shrink-0 cursor-pointer ${
            buttonVariant === 'emerald'
              ? 'bg-[#1E3A2F] hover:bg-[#162C23] text-amber-50'
              : 'bg-stone-900 hover:bg-stone-800 text-white'
          }`}
        >
          <Send className="w-3 h-3" />
          {buttonLabel}
        </button>
      </div>

      {postError && (
        <p className="text-[11px] text-rose-700 font-medium" role="alert">
          {postError}
        </p>
      )}
    </form>
  );
}
