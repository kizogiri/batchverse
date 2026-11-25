import { Camera, KeyRound, Trash2, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useState } from 'react';
import { Avatar } from '@/src/components/Avatar';
import { StudentProfile, StudentSeat } from '@/src/types/classroom';
import { readAndResizeImageFile } from '@/src/utils/imageHelpers';
import { resolveCountryFlag } from '@/src/utils/locationTime';
import { cleanNickname, formatNickname } from '@/src/utils/nickname';

interface ClaimSeatModalProps {
  seat: StudentSeat;
  gradeLabel: string;
  zoneLabel: string;
  onClose: () => void;
  onSave: (seatId: string, profile: StudentProfile, pin4Digits?: string) => Promise<void> | void;
}

export function ClaimSeatModal({
  seat,
  gradeLabel,
  zoneLabel,
  onClose,
  onSave,
}: ClaimSeatModalProps) {
  const existing = seat.occupant;
  const isEditing = existing !== null;

  const [fullName, setFullName] = useState(existing?.fullName ?? '');
  const [nickname, setNickname] = useState(() => cleanNickname(existing?.nickname));
  const [city, setCity] = useState(existing?.city ?? '');
  const [country, setCountry] = useState(existing?.country ?? '');
  const [profession, setProfession] = useState(existing?.profession ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [facebookUrl, setFacebookUrl] = useState(existing?.facebookUrl ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(existing?.linkedinUrl ?? '');
  const [instagramUrl, setInstagramUrl] = useState(existing?.instagramUrl ?? '');
  const [memoryQuote, setMemoryQuote] = useState(existing?.memoryQuote ?? '');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(existing?.photoUrl);
  const [editPin, setEditPin] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    try {
      const dataUrl = await readAndResizeImageFile(file, 220);
      setPhotoUrl(dataUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to process image.');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !city.trim() || !country.trim() || !profession.trim()) {
      setFormError('Please fill in Full Name, City, Country, and Profession.');
      return;
    }

    const cleanPin = editPin.replace(/\D/g, '');
    if (!isEditing && cleanPin.length !== 4) {
      setFormError('Please choose a 4-digit numeric Edit PIN to protect your desk.');
      return;
    }

    setFormError('');

    const formattedNickname = formatNickname(nickname) || undefined;

    const profile: StudentProfile = {
      fullName: fullName.trim().slice(0, 80),
      nickname: formattedNickname?.slice(0, 40),
      photoUrl,
      city: city.trim().slice(0, 60),
      country: country.trim().slice(0, 60),
      countryFlag: resolveCountryFlag(country.trim()),
      profession: profession.trim().slice(0, 80),
      phone: phone.trim().slice(0, 32) || undefined,
      email: email.trim().slice(0, 100) || undefined,
      facebookUrl: facebookUrl.trim().slice(0, 200) || undefined,
      linkedinUrl: linkedinUrl.trim().slice(0, 200) || undefined,
      instagramUrl: instagramUrl.trim().slice(0, 200) || undefined,
      memoryQuote: memoryQuote.trim().slice(0, 100) || undefined,
      graffiti: existing?.graffiti ?? [],
      claimedAt: existing?.claimedAt ?? new Date().toISOString().split('T')[0],
    };

    setSaving(true);
    try {
      await onSave(seat.id, profile, !isEditing ? cleanPin : undefined);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save desk. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-seat-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-stone-950/65"
      onClick={onClose}
    >
      <div
        className="@container bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-3xl max-h-[94%] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Sticky Modal Header */}
        <div className="shrink-0 bg-[#1E3A2F] text-amber-50 px-4 @md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-mono text-emerald-200/90 truncate">
              {gradeLabel} · {zoneLabel} · Seat #{String(seat.seatNumber).padStart(2, '0')}
            </p>
            <h2
              id="claim-seat-title"
              className="text-base @md:text-lg font-semibold text-white leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {isEditing ? 'Edit Your Alumni Desk' : 'Claim This Classroom Desk'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 text-amber-50 shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Landscape Form Body */}
        <form id="claim-seat-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 @md:p-5 space-y-4">
          {/* Top Row: Photo Upload + 4-Digit Edit PIN Side-by-Side in Landscape */}
          <div className={`grid grid-cols-1 ${!isEditing ? '@md:grid-cols-12' : ''} gap-3`}>
            <div
              className={`${
                !isEditing ? '@md:col-span-7' : ''
              } flex items-center gap-3.5 p-3 rounded-xl bg-stone-50 border border-stone-200/80`}
            >
              <Avatar
                name={fullName.trim() || 'Alumni'}
                photoUrl={photoUrl}
                sizeClass="w-16 h-16"
                textClass="text-lg"
                ringClass="ring-2 ring-stone-300"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-stone-900">Desk Photo</p>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                  Optional · Initials show if skipped.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1E3A2F] hover:bg-[#162C23] text-amber-50 rounded-lg cursor-pointer transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                    {photoUrl ? 'Change' : 'Upload Photo'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="sr-only"
                    />
                  </label>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl(undefined)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
                {uploadError && <p className="text-[11px] text-rose-600 mt-1">{uploadError}</p>}
              </div>
            </div>

            {!isEditing && (
              <div className="@md:col-span-5 p-3 rounded-xl bg-[#FBF6ED] border border-amber-900/20 flex flex-col justify-between gap-2">
                <div className="flex items-start gap-2">
                  <KeyRound className="w-4 h-4 text-[#1E3A2F] mt-0.5 shrink-0" />
                  <div>
                    <label
                      htmlFor="personal-edit-pin"
                      className="block text-xs font-semibold text-stone-900"
                    >
                      4-Digit Edit PIN <span className="text-rose-600">*</span>
                    </label>
                    <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                      Required to edit or move your seat later.
                    </p>
                  </div>
                </div>
                <input
                  id="personal-edit-pin"
                  type="password"
                  inputMode="numeric"
                  required
                  maxLength={4}
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="e.g., 4829"
                  className="w-full px-3 py-1.5 text-center text-base font-mono tracking-[0.4em] font-semibold bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
                />
              </div>
            )}
          </div>

          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {formError}
            </div>
          )}

          {/* Basic Info: 2-Column Landscape Grid */}
          <div className="grid grid-cols-1 @sm:grid-cols-2 @md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Full Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={80}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Aarav Adhikari"
                className="w-full px-3 py-2 text-xs @md:text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Nickname <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                maxLength={36}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g., Ramu"
                className="w-full px-3 py-2 text-xs @md:text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Profession / Industry <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={80}
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="e.g., Software Architect"
                className="w-full px-3 py-2 text-xs @md:text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Current City <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., Irving, TX"
                className="w-full px-3 py-2 text-xs @md:text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Country <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g., USA, Nepal, UK"
                className="w-full px-3 py-2 text-xs @md:text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-stone-700">
                  Desk Quote <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <span className="text-[10px] font-mono tabular-nums text-stone-400">
                  {memoryQuote.length}/100
                </span>
              </div>
              <input
                type="text"
                maxLength={100}
                value={memoryQuote}
                onChange={(e) => setMemoryQuote(e.target.value)}
                placeholder="Favorite school memory..."
                className="w-full px-3 py-2 text-xs @md:text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
              />
            </div>
          </div>

          {/* Contact & Social Links */}
          <div className="pt-3 border-t border-stone-200">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-2">
              Contact &amp; Social Links <span className="font-normal normal-case">(optional)</span>
            </p>
            <div className="grid grid-cols-1 @sm:grid-cols-2 @md:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Phone / WhatsApp
                </label>
                <input
                  type="tel"
                  maxLength={32}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 469-555-0194"
                  className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  maxLength={100}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  LinkedIn URL
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Facebook URL
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
                />
              </div>
              <div className="@md:col-span-2">
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Instagram URL
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Sticky Bottom Action Bar */}
        <div className="shrink-0 px-4 @md:px-6 py-2.5 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs @md:text-sm font-medium text-stone-700 hover:bg-stone-200/70 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="claim-seat-form"
            disabled={saving}
            className="px-5 py-2 text-xs @md:text-sm font-semibold bg-[#1E3A2F] hover:bg-[#162C23] disabled:opacity-60 text-amber-50 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            {saving
              ? 'Saving...'
              : isEditing
                ? 'Save Changes'
                : `Claim Seat #${String(seat.seatNumber).padStart(2, '0')}`}
          </button>
        </div>
      </div>
    </div>
  );
}
