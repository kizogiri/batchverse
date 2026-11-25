import {
  ArrowRightLeft,
  Briefcase,
  Copy,
  Edit3,
  ExternalLink,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  PenLine,
  Phone,
  Send,
  ShieldCheck,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Avatar } from '@/src/components/Avatar';
import { DeskGraffitiNote, StudentSeat } from '@/src/types/classroom';
import { formatWhatsAppUrl, normalizeExternalUrl } from '@/src/utils/imageHelpers';
import { getLocalTimeInfo, resolveCountryFlag } from '@/src/utils/locationTime';
import { formatNickname } from '@/src/utils/nickname';

interface StudentIdModalProps {
  seat: StudentSeat;
  graffitiNotes: DeskGraffitiNote[];
  gradeShortLabel: string;
  zoneLabel: string;
  canModifySeat: boolean;
  isAdmin: boolean;
  canEnableAdmin?: boolean;
  onEnableAdminMode?: () => void;
  onClose: () => void;
  onEditSeat: (seat: StudentSeat) => void;
  onStartMoveSeat: (seatId: string) => void;
  onVacateSeat: (seatId: string) => void;
  onRequestUnlockPin: (seat: StudentSeat) => void;
  onAdminResetPin: (seat: StudentSeat) => void;
  onAddGraffiti: (seatId: string, author: string, message: string) => Promise<void> | void;
  onCopySuccess: (label: string) => void;
}

export function StudentIdModal({
  seat,
  graffitiNotes,
  gradeShortLabel,
  zoneLabel,
  canModifySeat,
  isAdmin,
  canEnableAdmin = false,
  onEnableAdminMode,
  onClose,
  onEditSeat,
  onStartMoveSeat,
  onVacateSeat,
  onRequestUnlockPin,
  onAdminResetPin,
  onAddGraffiti,
  onCopySuccess,
}: StudentIdModalProps) {
  const student = seat.occupant;
  const [now, setNow] = useState(() => new Date());
  const [confirmVacate, setConfirmVacate] = useState(false);
  const [graffitiAuthor, setGraffitiAuthor] = useState('');
  const [graffitiMessage, setGraffitiMessage] = useState('');
  const [postingNote, setPostingNote] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!student) return null;

  const flag = resolveCountryFlag(student.country, student.countryFlag);
  const localTime = getLocalTimeInfo(student.city, student.country, now);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onCopySuccess(`${label} copied to clipboard`);
    } catch {
      onCopySuccess(`${label}: ${text}`);
    }
  };

  const handleGraffitiSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!graffitiAuthor.trim() || !graffitiMessage.trim()) return;
    setPostingNote(true);
    try {
      await onAddGraffiti(seat.id, graffitiAuthor.trim(), graffitiMessage.trim());
      setGraffitiMessage('');
    } finally {
      setPostingNote(false);
    }
  };

  const hasSocials = Boolean(
    student.facebookUrl || student.linkedinUrl || student.instagramUrl
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-id-name"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-stone-950/65"
      onClick={onClose}
    >
      <div
        className="@container bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-3xl max-h-[94%] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto grid grid-cols-1 @md:grid-cols-12">
          {/* Left Pane: Authentic Emerald Alumni ID Card Identity */}
          <div className="@md:col-span-5 bg-[#1E3A2F] p-4 @md:p-5 text-amber-50 flex flex-col justify-between gap-4 relative">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close alumni profile"
              className="@md:hidden absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-amber-50 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-3.5">
              <p className="text-[11px] font-mono tracking-wide text-emerald-200/90 pr-8 @md:pr-0">
                {gradeShortLabel} · {zoneLabel} · Seat #{String(seat.seatNumber).padStart(2, '0')}
              </p>

              <div className="flex items-center gap-3.5">
                <Avatar
                  name={student.fullName}
                  photoUrl={student.photoUrl}
                  sizeClass="w-16 h-16 @md:w-20 @md:h-20"
                  textClass="text-xl @md:text-2xl"
                  ringClass="ring-3 ring-amber-200/75"
                />
                <div className="min-w-0 flex-1">
                  <h2
                    id="student-id-name"
                    className="text-lg @md:text-xl font-semibold text-white leading-tight"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {student.fullName}
                  </h2>
                  {formatNickname(student.nickname) && (
                    <p className="text-xs @md:text-sm italic text-amber-200 mt-0.5">
                      {formatNickname(student.nickname)}
                    </p>
                  )}
                  <p className="text-xs text-emerald-100/90 mt-1 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{student.profession}</span>
                  </p>
                </div>
              </div>

              {/* Location & Live Local Time */}
              <div className="bg-black/20 border border-white/10 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="font-medium text-white truncate">
                    {flag} {student.city}, {student.country}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-emerald-100/90">
                  {localTime.isDaytime ? (
                    <Sun className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                  )}
                  <span className="font-mono tabular-nums font-semibold text-white">
                    {localTime.timeString}
                  </span>
                  <span className="text-[11px] text-emerald-200/80">
                    ({localTime.zoneLabel})
                  </span>
                </div>
              </div>
            </div>

            {/* Favorite School Memory Quote */}
            {student.memoryQuote && (
              <div className="bg-white/10 border border-white/15 rounded-xl p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/85 mb-1">
                  School Memory
                </p>
                <p
                  className="text-xs @md:text-sm italic text-amber-50 leading-snug"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  “{student.memoryQuote}”
                </p>
              </div>
            )}
          </div>

          {/* Right Pane: Direct Contact, Desk Graffiti & Seat Actions */}
          <div className="@md:col-span-7 p-4 @md:p-5 flex flex-col justify-between gap-4 relative">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close alumni profile"
              className="hidden @md:flex absolute top-3.5 right-3.5 w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-4">
              {/* One-Tap Contact & Social Buttons */}
              {(student.phone || student.email || hasSocials) && (
                <div className="space-y-2 pr-8">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                    Connect Directly
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {student.phone && (
                      <>
                        <a
                          href={formatWhatsAppUrl(student.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1E3A2F] hover:bg-[#162C23] text-amber-50 rounded-lg transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(student.phone!, 'Phone number')}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5 text-stone-600" />
                          <span className="font-mono">{student.phone}</span>
                          <Copy className="w-3 h-3 text-stone-500" />
                        </button>
                      </>
                    )}

                    {student.email && (
                      <>
                        <a
                          href={`mailto:${student.email}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-100 hover:bg-amber-200/80 text-amber-950 rounded-lg transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Email
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(student.email!, 'Email address')}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <span className="truncate max-w-[160px]">{student.email}</span>
                          <Copy className="w-3 h-3 text-stone-500" />
                        </button>
                      </>
                    )}
                  </div>

                  {hasSocials && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {student.linkedinUrl && (
                        <a
                          href={normalizeExternalUrl(student.linkedinUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-stone-200 hover:border-stone-400 text-stone-700 hover:text-stone-950 rounded-lg transition-colors"
                        >
                          LinkedIn
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {student.facebookUrl && (
                        <a
                          href={normalizeExternalUrl(student.facebookUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-stone-200 hover:border-stone-400 text-stone-700 hover:text-stone-950 rounded-lg transition-colors"
                        >
                          Facebook
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {student.instagramUrl && (
                        <a
                          href={normalizeExternalUrl(student.instagramUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-stone-200 hover:border-stone-400 text-stone-700 hover:text-stone-950 rounded-lg transition-colors"
                        >
                          Instagram
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Desk Graffiti / Memory Wall */}
              <div className="pt-3 border-t border-stone-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                    <PenLine className="w-3.5 h-3.5 text-amber-700" />
                    Desk Graffiti / Memory Wall
                  </h3>
                  <span className="text-xs font-mono tabular-nums text-stone-400">
                    {graffitiNotes.length} {graffitiNotes.length === 1 ? 'note' : 'notes'}
                  </span>
                </div>

                {graffitiNotes.length > 0 ? (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {graffitiNotes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-stone-50 border border-stone-200/75 rounded-lg px-3 py-2 text-xs"
                      >
                        <p className="text-stone-800 leading-snug">“{note.message}”</p>
                        <p className="text-[11px] text-stone-500 mt-0.5 font-medium">
                          — {note.author} · <span className="font-mono">{note.createdAt}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 italic">No desk notes yet.</p>
                )}

                <form onSubmit={handleGraffitiSubmit} className="flex flex-wrap @sm:flex-nowrap gap-1.5">
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={graffitiAuthor}
                    onChange={(e) => setGraffitiAuthor(e.target.value)}
                    placeholder="Your name"
                    className="w-28 px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30"
                  />
                  <input
                    type="text"
                    required
                    maxLength={140}
                    value={graffitiMessage}
                    onChange={(e) => setGraffitiMessage(e.target.value)}
                    placeholder="Write a 1-line desk memory..."
                    className="flex-1 min-w-[120px] px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30"
                  />
                  <button
                    type="submit"
                    disabled={postingNote}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    Post
                  </button>
                </form>
              </div>
            </div>

            {/* Ownership-Protected Seat Actions */}
            <div className="pt-3 border-t border-stone-200 space-y-2.5">
              {!canModifySeat && (
                <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-stone-600">
                    <Lock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                    Protected by {student.fullName.split(' ')[0]}&apos;s 4-digit PIN
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {canEnableAdmin && onEnableAdminMode && (
                      <button
                        type="button"
                        onClick={onEnableAdminMode}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-[#1E3A2F] border border-emerald-700/30 rounded-lg transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Switch to Admin
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRequestUnlockPin(seat)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1E3A2F] hover:bg-[#162C23] text-amber-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-200" />
                      Unlock with PIN
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                {canModifySeat && confirmVacate ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-rose-700 font-medium">Clear desk?</span>
                    <button
                      type="button"
                      onClick={() => onVacateSeat(seat.id)}
                      className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmVacate(false)}
                      className="px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={!canModifySeat}
                      aria-disabled={!canModifySeat}
                      title={
                        canModifySeat
                          ? 'Vacate this seat'
                          : 'Disabled — unlock with this student’s 4-digit PIN to vacate'
                      }
                      onClick={() => {
                        if (canModifySeat) setConfirmVacate(true);
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        canModifySeat
                          ? 'text-rose-700 hover:bg-rose-50 cursor-pointer'
                          : 'text-stone-400 bg-stone-100 border border-stone-200 cursor-not-allowed opacity-70'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Vacate
                    </button>
                    {canModifySeat && isAdmin && (
                      <button
                        type="button"
                        onClick={() => onAdminResetPin(seat)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Reset PIN
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canModifySeat}
                    aria-disabled={!canModifySeat}
                    title={
                      canModifySeat
                        ? 'Move to a vacant seat'
                        : 'Disabled — unlock with this student’s 4-digit PIN to move seat'
                    }
                    onClick={() => {
                      if (canModifySeat) onStartMoveSeat(seat.id);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      canModifySeat
                        ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 cursor-pointer'
                        : 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed opacity-70'
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Move Seat
                  </button>
                  <button
                    type="button"
                    disabled={!canModifySeat}
                    aria-disabled={!canModifySeat}
                    title={
                      canModifySeat
                        ? 'Edit seat details'
                        : 'Disabled — unlock with this student’s 4-digit PIN to edit'
                    }
                    onClick={() => {
                      if (canModifySeat) onEditSeat(seat);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      canModifySeat
                        ? 'bg-[#1E3A2F] hover:bg-[#162C23] text-amber-50 cursor-pointer'
                        : 'bg-stone-200 text-stone-400 cursor-not-allowed opacity-75'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Seat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
