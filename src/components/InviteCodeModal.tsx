import { Copy, Link2, Lock, MessageCircle, RefreshCw, Unlock, X } from 'lucide-react';
import { useState } from 'react';
import { SchoolGroupDoc } from '@/src/types/classroom';

interface InviteCodeModalProps {
  group: SchoolGroupDoc;
  isAdmin: boolean;
  onClose: () => void;
  onCopyText: (text: string, label: string) => void;
  onRegenerateCode: () => Promise<void>;
  onToggleLock: () => Promise<void>;
}

export function InviteCodeModal({
  group,
  isAdmin,
  onClose,
  onCopyText,
  onRegenerateCode,
  onToggleLock,
}: InviteCodeModalProps) {
  const [busy, setBusy] = useState(false);

  const shareUrl = `${window.location.origin}${window.location.pathname}?code=${group.inviteCode}`;
  const whatsappText = `Join our ${group.schoolName} (${group.batchYear}) Virtual Classroom on BatchVerse! Claim your old bench seat using 5-digit invite code ${group.inviteCode}: ${shareUrl}`;

  const handleRegenerate = async () => {
    setBusy(true);
    try {
      await onRegenerateCode();
    } finally {
      setBusy(false);
    }
  };

  const handleToggleLock = async () => {
    setBusy(true);
    try {
      await onToggleLock();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-code-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-stone-950/65"
      onClick={onClose}
    >
      <div
        className="@container bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl max-h-[94%] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-1 @md:grid-cols-12">
          {/* Left: Emerald Code Showcase */}
          <div className="@md:col-span-5 bg-[#1E3A2F] p-5 text-amber-50 flex flex-col justify-between gap-4 relative">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close invite code modal"
              className="@md:hidden absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-amber-50 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <p className="text-[11px] font-mono text-emerald-200/85 pr-8 @md:pr-0">
                {group.schoolName} · {group.batchYear}
              </p>
              <h2
                id="invite-code-modal-title"
                className="text-lg @md:text-xl font-semibold text-white mt-0.5"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Classroom Invite Code
              </h2>
            </div>

            <div className="bg-black/25 border border-white/15 rounded-xl p-4 text-center">
              <p className="text-[11px] font-medium text-emerald-200/90 mb-1.5">
                5-Digit Numeric Code
              </p>
              <p className="text-3xl @md:text-4xl font-mono font-bold tracking-[0.3em] text-amber-200 pl-2">
                {group.inviteCode}
              </p>
              {group.isLocked && (
                <p className="text-[11px] font-medium text-amber-300 mt-2">
                  Classroom is currently locked.
                </p>
              )}
            </div>
          </div>

          {/* Right: Share Actions & Admin Controls */}
          <div className="@md:col-span-7 p-5 space-y-4 relative">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close invite code modal"
              className="hidden @md:flex absolute top-3.5 right-3.5 w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2.5 pr-8 @md:pr-8">
              <p className="text-xs font-semibold text-stone-700">Share with Classmates</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onCopyText(group.inviteCode, '5-digit invite code')}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-lg cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Code
                </button>
                <button
                  type="button"
                  onClick={() => onCopyText(shareUrl, 'Direct invite link')}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#1E3A2F] hover:bg-[#162C23] text-amber-50 rounded-lg cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={() => onCopyText(whatsappText, 'WhatsApp invite message')}
                  className="col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-[#1E3A2F] border border-emerald-700/20 rounded-lg cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Copy WhatsApp Invite Message
                </button>
              </div>
            </div>

            {isAdmin && (
              <div className="pt-3 border-t border-stone-200 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  Group Admin Controls
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleRegenerate}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-stone-100 hover:bg-stone-200 disabled:opacity-55 text-stone-800 rounded-lg cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    New Code
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleToggleLock}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer disabled:opacity-55 ${
                      group.isLocked
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-950'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                    }`}
                  >
                    {group.isLocked ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        Unlock Room
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        Lock Room
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
