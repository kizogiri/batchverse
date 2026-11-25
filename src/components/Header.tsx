import { User } from 'firebase/auth';
import {
  ArrowLeft,
  Box,
  GraduationCap,
  KeyRound,
  LogIn,
  Maximize2,
  Minimize2,
  ShieldCheck,
} from 'lucide-react';
import { ClassroomData, GradeId, SchoolGroupDoc } from '@/src/types/classroom';

interface HeaderProps {
  activeGrade: GradeId;
  onSelectGrade: (grade: GradeId) => void;
  classroom: ClassroomData;
  activeGroup: SchoolGroupDoc | null;
  adminUser: User | null;
  isAdminMode: boolean;
  onAdminSignIn: () => void;
  onOpenInviteModal: () => void;
  onSwitchTo3D: () => void;
  onReturnToLobby: () => void;
  showFullscreenLandscapeButton?: boolean;
  isFullscreenLandscape?: boolean;
  onToggleFullscreenLandscape?: () => void;
}

export function Header({
  activeGrade,
  onSelectGrade,
  classroom,
  activeGroup,
  adminUser,
  isAdminMode,
  onAdminSignIn,
  onOpenInviteModal,
  onSwitchTo3D,
  onReturnToLobby,
  showFullscreenLandscapeButton = false,
  isFullscreenLandscape = false,
  onToggleFullscreenLandscape,
}: HeaderProps) {
  const claimedSeats = classroom.seats.filter((seat) => seat.occupant !== null);
  const totalSeats = classroom.seats.length;
  const uniqueCountries = new Set(
    claimedSeats
      .map((seat) => seat.occupant?.country.trim().toLowerCase())
      .filter((c): c is string => Boolean(c))
  ).size;

  return (
    <header className="@container shrink-0 sticky top-0 z-30 bg-[#FAF8F4]/95 backdrop-blur-md border-b border-stone-200/90">
      <div className="max-w-[1360px] mx-auto px-2.5 @md:px-4 @4xl:px-8 h-14 @2xl:h-16 flex items-center justify-between gap-2 @2xl:gap-4">
        {/* Zone 1: Back to Lobby + Brand */}
        <div className="flex items-center gap-1.5 @2xl:gap-2 shrink-0 min-w-0">
          <button
            type="button"
            onClick={onReturnToLobby}
            title="Switch school group or return to home"
            aria-label="Back to school lobby"
            className="w-8 h-8 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-600 hover:text-stone-900 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-[#1E3A2F] text-amber-50 hidden @2xl:flex items-center justify-center shadow-sm shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span
            className="text-sm @md:text-base @2xl:text-lg font-semibold tracking-tight text-stone-900 whitespace-nowrap shrink-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            BatchVerse
          </span>
        </div>

        {/* Zone 2: Classroom Switcher & Live Occupancy Readout */}
        <div className="flex items-center justify-center gap-4 @5xl:gap-6 min-w-0 shrink">
          <nav
            aria-label="Classroom Switcher"
            className="flex items-center p-0.5 @2xl:p-1 bg-stone-200/75 rounded-lg shrink-0"
          >
            <button
              type="button"
              onClick={() => onSelectGrade('grade10')}
              className={`px-2.5 @2xl:px-3.5 @4xl:px-4 py-1 @2xl:py-1.5 text-xs @2xl:text-sm font-medium rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeGrade === 'grade10'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span className="@4xl:hidden">Grade 10</span>
              <span className="hidden @4xl:inline">Grade 10 Classroom</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectGrade('grade12')}
              className={`px-2.5 @2xl:px-3.5 @4xl:px-4 py-1 @2xl:py-1.5 text-xs @2xl:text-sm font-medium rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeGrade === 'grade12'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span className="@4xl:hidden">Grade 12</span>
              <span className="hidden @4xl:inline">Grade 12 Classroom</span>
            </button>
          </nav>

          <div className="hidden @6xl:flex items-center gap-2 text-xs text-stone-600 font-mono tabular-nums whitespace-nowrap shrink-0">
            <span className="font-semibold text-stone-900">
              {claimedSeats.length} / {totalSeats} Seats Claimed
            </span>
            <span aria-hidden="true" className="text-stone-400">
              ·
            </span>
            <span>
              {uniqueCountries} {uniqueCountries === 1 ? 'Country' : 'Countries'}
            </span>
          </div>
        </div>

        {/* Zone 3: 3D Room Toggle, Invite Code / Admin Status */}
        <div className="flex items-center gap-1.5 @2xl:gap-2 shrink-0">
          {showFullscreenLandscapeButton && onToggleFullscreenLandscape && (
            <button
              type="button"
              onClick={onToggleFullscreenLandscape}
              title={
                isFullscreenLandscape
                  ? 'Exit Fullscreen (Show Address Bar)'
                  : 'Hide Address Bar (Fullscreen)'
              }
              aria-label={
                isFullscreenLandscape
                  ? 'Exit Fullscreen'
                  : 'Enter Fullscreen'
              }
              className="w-8 h-8 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              {isFullscreenLandscape ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onSwitchTo3D}
            title="Switch to interactive 3D virtual classroom"
            className="inline-flex items-center gap-1.5 px-2.5 @2xl:px-3 py-1.5 text-xs font-semibold bg-[#1E3A2F] hover:bg-[#162C23] text-amber-50 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Box className="w-3.5 h-3.5 text-amber-200 shrink-0" />
            <span>3D Room</span>
          </button>

          {activeGroup && (
            <>
              <button
                type="button"
                onClick={onOpenInviteModal}
                title="View or share 5-digit classroom invite code"
                className="inline-flex items-center gap-1 @2xl:gap-1.5 px-2 @2xl:px-3 py-1.5 text-xs font-mono font-semibold bg-amber-100/90 hover:bg-amber-200/80 text-amber-950 rounded-lg border border-amber-900/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                <span>{activeGroup.inviteCode}</span>
              </button>

              {isAdminMode ? (
                <button
                  type="button"
                  onClick={onOpenInviteModal}
                  className="inline-flex items-center gap-1 @4xl:gap-1.5 px-2 @4xl:px-3 py-1.5 text-xs font-semibold bg-[#1E3A2F] text-amber-50 hover:bg-[#162C23] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden @xl:inline">Admin</span>
                </button>
              ) : adminUser && adminUser.uid === activeGroup.adminUid ? (
                <button
                  type="button"
                  onClick={onAdminSignIn}
                  title="Switch to Admin Mode to edit any seat"
                  className="inline-flex items-center gap-1 @4xl:gap-1.5 px-2 @4xl:px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-[#1E3A2F] border border-emerald-700/30 hover:bg-emerald-100 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1E3A2F]" />
                  <span>Admin</span>
                </button>
              ) : !adminUser ? (
                <button
                  type="button"
                  onClick={onAdminSignIn}
                  title="Group creator admin login"
                  className="hidden @3xl:inline-flex items-center gap-1.5 px-2.5 @4xl:px-3 py-1.5 text-xs font-medium bg-white text-stone-700 border border-stone-300 hover:bg-stone-50 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-stone-500" />
                  Admin Login
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
