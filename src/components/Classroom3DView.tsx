import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  GraduationCap,
  KeyRound,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Sun,
  Sunset,
  UserPlus,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CameraPresetId,
  Classroom3DScene,
  HoverTargetInfo,
  LightingMoodId,
} from '@/src/three/Classroom3DScene';
import { ClassroomData, GradeId, SchoolGroupDoc } from '@/src/types/classroom';

interface Classroom3DViewProps {
  classroom: ClassroomData;
  activeGrade: GradeId;
  onSelectGrade: (grade: GradeId) => void;
  activeGroup: SchoolGroupDoc | null;
  isAdminMode: boolean;
  canEnableAdmin: boolean;
  onEnableAdminMode: () => void;
  isLocked: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  matchCount: number;
  movingSeatId: string | null;
  onCancelMoveMode: () => void;
  canModifySeat: (seatId: string) => boolean;
  onSelectOccupiedSeat: (seatId: string) => void;
  onClaimEmptySeat: (seatId: string) => void;
  onMoveSeat: (fromSeatId: string, toSeatId: string) => void;
  onSelectTeacher: (teacherId: string) => void;
  onEditChalkboard: () => void;
  onAddTeacher: () => void;
  onAddDeskRow: () => void;
  onOpenInviteModal: () => void;
  onSwitchTo2D: () => void;
  onReturnToLobby: () => void;
  isRotatedLandscape: boolean;
  isCompactLandscape: boolean;
  canLockLandscape: boolean;
  isFullscreenLandscape: boolean;
  onToggleFullscreenLandscape: () => void;
}

const CAMERA_BUTTONS: { id: CameraPresetId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'frontBench', label: 'Front Bench' },
  { id: 'backbenchers', label: 'Backbenchers' },
  { id: 'teacherView', label: "Teacher's POV" },
  { id: 'topDown', label: 'Top-Down' },
];

const MOOD_BUTTONS: { id: LightingMoodId; label: string; icon: typeof Sun }[] = [
  { id: 'morning', label: 'Morning', icon: Sun },
  { id: 'afternoon', label: 'Golden', icon: Sunset },
  { id: 'evening', label: 'Evening', icon: Moon },
];

export function Classroom3DView({
  classroom,
  activeGrade,
  onSelectGrade,
  activeGroup,
  isAdminMode,
  canEnableAdmin,
  onEnableAdminMode,
  isLocked,
  searchQuery,
  onSearchChange,
  matchCount,
  movingSeatId,
  onCancelMoveMode,
  canModifySeat,
  onSelectOccupiedSeat,
  onClaimEmptySeat,
  onMoveSeat,
  onSelectTeacher,
  onEditChalkboard,
  onAddTeacher,
  onAddDeskRow,
  onOpenInviteModal,
  onSwitchTo2D,
  onReturnToLobby,
  isRotatedLandscape,
  isCompactLandscape,
  canLockLandscape,
  isFullscreenLandscape,
  onToggleFullscreenLandscape,
}: Classroom3DViewProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<Classroom3DScene | null>(null);

  const [activeCamera, setActiveCamera] = useState<CameraPresetId>('overview');
  const [activeMood, setActiveMood] = useState<LightingMoodId>('morning');
  const [dockOpen, setDockOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hovered, setHovered] = useState<HoverTargetInfo>(null);

  // Keep latest callbacks in ref so Three.js instance never needs to be torn down on state updates
  const latestPropsRef = useRef({
    classroom,
    movingSeatId,
    isAdminMode,
    isLocked,
    onSelectOccupiedSeat,
    onClaimEmptySeat,
    onMoveSeat,
    onSelectTeacher,
    onEditChalkboard,
  });

  latestPropsRef.current = {
    classroom,
    movingSeatId,
    isAdminMode,
    isLocked,
    onSelectOccupiedSeat,
    onClaimEmptySeat,
    onMoveSeat,
    onSelectTeacher,
    onEditChalkboard,
  };

  // Mount Three.js scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const controller = new Classroom3DScene(
      container,
      {
        onSelectSeat: (seatId) => {
          const cur = latestPropsRef.current;
          const seat = cur.classroom.seats.find((s) => s.id === seatId);
          if (!seat) return;

          if (cur.movingSeatId) {
            if (!seat.occupant) {
              cur.onMoveSeat(cur.movingSeatId, seat.id);
            } else {
              cur.onSelectOccupiedSeat(seat.id);
            }
            return;
          }

          if (seat.occupant) {
            cur.onSelectOccupiedSeat(seat.id);
          } else if (!cur.isLocked || cur.isAdminMode) {
            cur.onClaimEmptySeat(seat.id);
          }
        },
        onSelectTeacher: (teacherId) => {
          latestPropsRef.current.onSelectTeacher(teacherId);
        },
        onClickChalkboard: () => {
          if (latestPropsRef.current.isAdminMode) {
            latestPropsRef.current.onEditChalkboard();
          }
        },
        onHoverChange: (info) => {
          setHovered(info);
        },
      },
      {
        classroom,
        searchQuery,
        movingSeatId,
        canModifySeat,
      },
      isRotatedLandscape
    );

    sceneRef.current = controller;

    return () => {
      controller.dispose();
      sceneRef.current = null;
    };
    // Intentionally mount WebGL renderer once; live data updates flow through syncClassroomData below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync rotated landscape flag reactively if user physically rotates their phone
  useEffect(() => {
    sceneRef.current?.setRotatedLandscape(isRotatedLandscape);
  }, [isRotatedLandscape]);

  // Push live classroom updates into Three.js scene without recreating WebGL context
  useEffect(() => {
    sceneRef.current?.syncClassroomData({
      classroom,
      searchQuery,
      movingSeatId,
      canModifySeat,
    });
  }, [classroom, searchQuery, movingSeatId, canModifySeat]);

  // Keyboard shortcut 'H' to toggle bottom control dock (when not typing in an input)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key.toLowerCase() === 'h') {
        setDockOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const claimedCount = useMemo(
    () => classroom.seats.filter((s) => s.occupant !== null).length,
    [classroom.seats]
  );

  const movingStudentName = useMemo(() => {
    if (!movingSeatId) return '';
    return classroom.seats.find((s) => s.id === movingSeatId)?.occupant?.fullName ?? 'Classmate';
  }, [movingSeatId, classroom.seats]);

  const handleCameraChange = (preset: CameraPresetId) => {
    setActiveCamera(preset);
    sceneRef.current?.setCameraPreset(preset);
  };

  const handleMoodChange = (mood: LightingMoodId) => {
    setActiveMood(mood);
    sceneRef.current?.setLightingMood(mood);
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden select-none bg-[#CFE2F3]">
      {/* Isolated Full-Bleed WebGL Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Top HUD Bar: Left School Card + Right Utility Actions in one flex row so they NEVER overlap */}
      <div
        className={`fixed inset-x-0 top-0 z-20 pointer-events-none flex items-start justify-between gap-2 ${
          isCompactLandscape ? 'px-2 pt-2' : 'px-3.5 pt-3.5'
        }`}
      >
        {/* Top-Left Minimal Floating Title & Occupancy Bar */}
        <div className="pointer-events-auto min-w-0 flex-1 max-w-fit flex items-center gap-1.5">
          <div
            className={`min-w-0 max-w-full flex items-center gap-1.5 rounded-xl border border-stone-900/12 shadow-sm ${
              isCompactLandscape ? 'px-2 py-1' : 'px-2.5 py-1.5 gap-2'
            }`}
            style={{ backgroundColor: 'rgba(250, 248, 244, 0.95)' }}
          >
            <button
              type="button"
              onClick={onReturnToLobby}
              title="Back to school lobby"
              aria-label="Back to school lobby"
              className={`${
                isCompactLandscape ? 'w-7 h-7' : 'w-8 h-8'
              } rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 flex items-center justify-center shrink-0 cursor-pointer transition-colors`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            {!isCompactLandscape && (
              <div className="w-7 h-7 rounded-lg bg-[#1E3A2F] text-amber-50 hidden sm:flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
            )}

            <div className="min-w-0 pr-1">
              <p
                className={`${
                  isCompactLandscape ? 'text-xs' : 'text-sm'
                } font-semibold text-stone-900 leading-tight truncate`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {activeGroup ? activeGroup.schoolName : 'BatchVerse'}
              </p>
              <p className="text-[10px] sm:text-[11px] font-mono text-stone-600 leading-tight tabular-nums truncate">
                {activeGrade === 'grade10' ? 'Grade 10' : 'Grade 12'} · {claimedCount}/
                {classroom.seats.length} Seated
              </p>
            </div>

            {/* Inline Search Trigger / Input */}
            <div className="border-l border-stone-200 pl-2 flex items-center shrink-0">
              {searchOpen || searchQuery ? (
                <div className="flex items-center gap-1 bg-white border border-stone-300 rounded-lg px-2 py-1">
                  <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Find classmate..."
                    autoFocus
                    className="w-24 sm:w-36 text-xs text-stone-900 bg-transparent focus:outline-none"
                  />
                  {searchQuery && (
                    <span className="text-[10px] font-mono font-semibold text-amber-800 px-1">
                      {matchCount}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onSearchChange('');
                      setSearchOpen(false);
                    }}
                    aria-label="Clear search"
                    className="text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  title="Search classmates by name, city, or profession"
                  aria-label="Search classmates"
                  className="w-8 h-8 rounded-lg hover:bg-stone-200/70 text-stone-700 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Top-Right Utility Actions (Invite Code, Admin Quick Actions, Fullscreen, Switch to 2D Grid) */}
        <div className="pointer-events-auto shrink-0 flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            {activeGroup && (
              <button
                type="button"
                onClick={onOpenInviteModal}
                title="View or share 5-digit classroom invite code"
                className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-mono font-semibold rounded-xl border border-amber-900/20 text-amber-950 shadow-sm cursor-pointer transition-colors whitespace-nowrap"
                style={{ backgroundColor: 'rgba(254, 243, 199, 0.96)' }}
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-800" />
                <span>{activeGroup.inviteCode}</span>
              </button>
            )}

            {canEnableAdmin && (
              <button
                type="button"
                onClick={onEnableAdminMode}
                title="Enable Admin Mode to edit any student seat"
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-xl border border-emerald-800/25 text-[#1E3A2F] shadow-sm cursor-pointer transition-colors whitespace-nowrap"
                style={{ backgroundColor: 'rgba(236, 253, 245, 0.96)' }}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#1E3A2F]" />
                <span>Admin</span>
              </button>
            )}

            {isAdminMode && (
              <div
                className="hidden lg:flex items-center gap-1 px-1.5 py-1 rounded-xl border border-stone-900/12 shadow-sm"
                style={{ backgroundColor: 'rgba(250, 248, 244, 0.95)' }}
              >
                <button
                  type="button"
                  onClick={onEditChalkboard}
                  title="Edit Chalkboard"
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-200/70 rounded-lg cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Board
                </button>
                <button
                  type="button"
                  onClick={onAddTeacher}
                  title="Add Subject Teacher"
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-200/70 rounded-lg cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Teacher
                </button>
                <button
                  type="button"
                  onClick={onAddDeskRow}
                  title="Add 1 bench row (4 seats)"
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-200/70 rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Row
                </button>
              </div>
            )}

            {canLockLandscape && (
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
                className="w-8 h-8 rounded-xl border border-stone-900/15 text-stone-700 hover:bg-stone-100 flex items-center justify-center shadow-sm cursor-pointer transition-colors shrink-0"
                style={{ backgroundColor: 'rgba(250, 248, 244, 0.95)' }}
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
              onClick={onSwitchTo2D}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#1E3A2F] hover:bg-[#162C23] text-amber-50 shadow-sm cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-200" />
              <span>2D Grid</span>
            </button>
          </div>

          {/* Mobile & Tablet Developer Credit (tucked cleanly under top-right controls) */}
          <div
            className={`${
              isCompactLandscape ? 'block' : 'lg:hidden'
            } pointer-events-none px-2 py-0.5 rounded-md text-[10px] text-stone-700 border border-stone-900/12 shadow-xs`}
            style={{ backgroundColor: 'rgba(250, 248, 244, 0.9)' }}
          >
            Developed by <span className="font-semibold text-[#1E3A2F]">dadagiri</span>
          </div>
        </div>
      </div>

      {/* Active Move-Seat Banner */}
      {movingSeatId && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-xl bg-[#1E3A2F] text-amber-50 border border-amber-300/30 shadow-md">
          <span className="text-xs sm:text-sm font-medium">
            Click any glowing vacant desk to move <strong>{movingStudentName}</strong>
          </span>
          <button
            type="button"
            onClick={onCancelMoveMode}
            className="px-2.5 py-1 text-xs font-semibold bg-white/15 hover:bg-white/25 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Hover Tooltip Readout (compact solid dark strip above dock) */}
      {hovered && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-20 pointer-events-none px-3.5 py-1.5 rounded-lg text-xs font-medium text-amber-50 shadow-md whitespace-nowrap"
          style={{
            bottom: dockOpen ? '84px' : '54px',
            backgroundColor: 'rgba(28, 25, 23, 0.92)',
          }}
        >
          {hovered.kind === 'seat' &&
            (hovered.seat.occupant ? (
              <span>
                Seat #{String(hovered.seat.seatNumber).padStart(2, '0')} ·{' '}
                <strong>{hovered.seat.occupant.fullName}</strong> ({hovered.seat.occupant.city}) —
                Click for Alumni ID
              </span>
            ) : (
              <span>
                Seat #{String(hovered.seat.seatNumber).padStart(2, '0')} ·{' '}
                {movingSeatId
                  ? 'Vacant — Click to move here'
                  : isLocked && !isAdminMode
                    ? 'Vacant (Classroom locked by admin)'
                    : 'Vacant — Click to claim desk'}
              </span>
            ))}
          {hovered.kind === 'teacher' && (
            <span>
              <strong>{hovered.teacher.name}</strong> ({hovered.teacher.subject}) — Click for
              Teacher Tribute
            </span>
          )}
          {hovered.kind === 'chalkboard' && (
            <span>
              {isAdminMode
                ? 'Classroom Chalkboard — Click to edit announcement'
                : classroom.chalkboard.title}
            </span>
          )}
        </div>
      )}

      {/* Collapsible Bottom Control Dock (compact <= 15% viewport, solid rgba, NO backdrop-filter) */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 z-20 flex flex-col items-center max-w-[calc(100%-16px)] ${
          isCompactLandscape ? 'bottom-2' : 'bottom-3.5'
        }`}
      >
        {!dockOpen ? (
          <button
            type="button"
            onClick={() => setDockOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-800 rounded-xl border border-stone-900/15 shadow-md cursor-pointer"
            style={{ backgroundColor: 'rgba(250, 248, 244, 0.95)' }}
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Show Controls</span>
            {!isCompactLandscape && (
              <span className="text-[10px] font-mono text-stone-500 ml-0.5">(H)</span>
            )}
          </button>
        ) : (
          <div
            className={`rounded-2xl border border-stone-900/15 shadow-lg flex items-center justify-center ${
              isCompactLandscape
                ? 'px-2 py-1 gap-1.5 overflow-x-auto max-w-full flex-nowrap'
                : 'px-2.5 py-2 gap-2 flex-wrap'
            }`}
            style={{ backgroundColor: 'rgba(250, 248, 244, 0.96)' }}
          >
            {/* Grade 10 / 12 Switch */}
            <div className="flex items-center p-0.5 bg-stone-200/80 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => onSelectGrade('grade10')}
                className={`${
                  isCompactLandscape ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
                } font-semibold rounded-md cursor-pointer transition-colors whitespace-nowrap ${
                  activeGrade === 'grade10'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                G10
              </button>
              <button
                type="button"
                onClick={() => onSelectGrade('grade12')}
                className={`${
                  isCompactLandscape ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
                } font-semibold rounded-md cursor-pointer transition-colors whitespace-nowrap ${
                  activeGrade === 'grade12'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                G12
              </button>
            </div>

            <div className="w-px h-4 bg-stone-300 shrink-0" />

            {/* Camera View Presets */}
            <div className="flex items-center gap-0.5 shrink-0">
              {!isCompactLandscape && (
                <Eye className="w-3.5 h-3.5 text-stone-500 mr-0.5 hidden sm:block" />
              )}
              {CAMERA_BUTTONS.map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => handleCameraChange(btn.id)}
                  className={`${
                    isCompactLandscape ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
                  } font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                    activeCamera === btn.id
                      ? 'bg-[#1E3A2F] text-amber-50'
                      : 'text-stone-700 hover:bg-stone-200/75'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-stone-300 shrink-0" />

            {/* Lighting Moods */}
            <div className="flex items-center gap-0.5 bg-stone-200/70 p-0.5 rounded-lg shrink-0">
              {MOOD_BUTTONS.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleMoodChange(m.id)}
                    title={`${m.label} classroom lighting`}
                    className={`inline-flex items-center gap-1 ${
                      isCompactLandscape ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs'
                    } font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap ${
                      activeMood === m.id
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {!isCompactLandscape && <span className="hidden lg:inline">{m.label}</span>}
                  </button>
                );
              })}
            </div>

            {/* Collapse Dock Button */}
            <button
              type="button"
              onClick={() => setDockOpen(false)}
              title="Hide controls (H)"
              aria-label="Hide controls"
              className="p-1 text-stone-500 hover:text-stone-900 hover:bg-stone-200/70 rounded-lg cursor-pointer shrink-0"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Developer Credit on Desktop 3D View */}
      {!isCompactLandscape && (
        <div
          className="hidden lg:block fixed bottom-3.5 right-3.5 z-10 pointer-events-none px-2.5 py-1 rounded-lg text-[11px] text-stone-700 border border-stone-900/10 shadow-xs"
          style={{ backgroundColor: 'rgba(250, 248, 244, 0.92)' }}
        >
          Developed by <span className="font-semibold text-[#1E3A2F]">dadagiri</span>
        </div>
      )}
    </div>
  );
}
