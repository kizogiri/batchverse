import { ArrowRightLeft, GripVertical, Lock, MapPin, Plus, X } from 'lucide-react';
import { DragEvent, TouchEvent, useEffect, useRef, useState } from 'react';
import { Avatar } from '@/src/components/Avatar';
import { SeatFilter } from '@/src/components/ClassroomToolbar';
import { StudentSeat } from '@/src/types/classroom';
import { resolveCountryFlag } from '@/src/utils/locationTime';
import { formatNickname } from '@/src/utils/nickname';

interface ClassroomSeatingGridProps {
  seats: StudentSeat[];
  searchQuery: string;
  seatFilter: SeatFilter;
  movingSeatId: string | null;
  isLocked: boolean;
  isAdmin: boolean;
  canModifySeat: (seatId: string) => boolean;
  onCancelMoveMode: () => void;
  onSelectOccupiedSeat: (seat: StudentSeat, zoneLabel: string) => void;
  onClaimEmptySeat: (seat: StudentSeat) => void;
  onMoveSeat: (fromSeatId: string, toSeatId: string) => void;
}

const SEATS_PER_BENCH = 4;

function doesSeatMatchSearch(seat: StudentSeat, query: string): boolean {
  if (!query.trim()) return true;
  if (!seat.occupant) return false;
  const q = query.trim().toLowerCase();
  const { fullName, nickname, city, country, profession } = seat.occupant;
  return (
    fullName.toLowerCase().includes(q) ||
    (nickname?.toLowerCase().includes(q) ?? false) ||
    city.toLowerCase().includes(q) ||
    country.toLowerCase().includes(q) ||
    profession.toLowerCase().includes(q)
  );
}

function getRowHeading(rowIndex: number, totalRows: number): string {
  if (rowIndex === 0) return 'Front Bench (Row 1)';
  if (rowIndex === totalRows - 1) return `Backbenchers (Row ${rowIndex + 1})`;
  return `Middle Bench (Row ${rowIndex + 1})`;
}

function getZoneLabelForRow(rowIndex: number, totalRows: number): string {
  if (rowIndex === 0) return 'Front Bench';
  if (rowIndex === totalRows - 1) return 'Backbencher';
  return `Bench Row ${rowIndex + 1}`;
}

export function ClassroomSeatingGrid({
  seats,
  searchQuery,
  seatFilter,
  movingSeatId,
  isLocked,
  isAdmin,
  canModifySeat,
  onCancelMoveMode,
  onSelectOccupiedSeat,
  onClaimEmptySeat,
  onMoveSeat,
}: ClassroomSeatingGridProps) {
  const hasSearch = searchQuery.trim().length > 0;
  const [draggingSeatId, setDraggingSeatId] = useState<string | null>(null);
  const [dragOverSeatId, setDragOverSeatId] = useState<string | null>(null);
  const [touchGhost, setTouchGhost] = useState<{
    name: string;
    x: number;
    y: number;
  } | null>(null);

  const touchDragSourceRef = useRef<string | null>(null);
  const suppressClickRef = useRef(false);

  const activeSourceId = draggingSeatId ?? movingSeatId;
  const activeSourceSeat = activeSourceId
    ? seats.find((s) => s.id === activeSourceId) ?? null
    : null;

  useEffect(() => {
    if (draggingSeatId && !seats.some((s) => s.id === draggingSeatId && s.occupant)) {
      setDraggingSeatId(null);
      setDragOverSeatId(null);
      setTouchGhost(null);
    }
  }, [seats, draggingSeatId]);

  // Group seats into benches of 4 seats per row (5 rows = 20 seats by default)
  const rows: StudentSeat[][] = [];
  for (let i = 0; i < seats.length; i += SEATS_PER_BENCH) {
    rows.push(seats.slice(i, i + SEATS_PER_BENCH));
  }

  const handleDragStart = (e: DragEvent<HTMLElement>, seat: StudentSeat) => {
    if (!seat.occupant || !canModifySeat(seat.id)) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', seat.id);
    setDraggingSeatId(seat.id);
    if (movingSeatId) {
      onCancelMoveMode();
    }
  };

  const handleDragEnd = () => {
    setDraggingSeatId(null);
    setDragOverSeatId(null);
  };

  const handleDragOverVacant = (e: DragEvent<HTMLElement>, seat: StudentSeat) => {
    if (seat.occupant !== null) return;
    if (isLocked && !isAdmin) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSeatId !== seat.id) {
      setDragOverSeatId(seat.id);
    }
  };

  const handleDragLeaveVacant = (seat: StudentSeat) => {
    if (dragOverSeatId === seat.id) {
      setDragOverSeatId(null);
    }
  };

  const handleDropOnSeat = (e: DragEvent<HTMLElement>, targetSeat: StudentSeat) => {
    e.preventDefault();
    const fromSeatId = draggingSeatId || e.dataTransfer.getData('text/plain');
    setDraggingSeatId(null);
    setDragOverSeatId(null);
    if (!fromSeatId || fromSeatId === targetSeat.id) return;
    onMoveSeat(fromSeatId, targetSeat.id);
  };

  const handleTouchStartGrip = (e: TouchEvent<HTMLSpanElement>, seat: StudentSeat) => {
    if (!seat.occupant || !canModifySeat(seat.id)) return;
    e.stopPropagation();
    const touch = e.touches[0];
    if (!touch) return;
    touchDragSourceRef.current = seat.id;
    suppressClickRef.current = true;
    setDraggingSeatId(seat.id);
    setTouchGhost({
      name: seat.occupant.fullName.split(' ')[0],
      x: touch.clientX,
      y: touch.clientY,
    });
  };

  const handleTouchMoveGrip = (e: TouchEvent<HTMLSpanElement>) => {
    if (!touchDragSourceRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    e.preventDefault();
    setTouchGhost((prev) => (prev ? { ...prev, x: touch.clientX, y: touch.clientY } : null));

    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const seatEl = el?.closest('[data-seat-id]') as HTMLElement | null;
    const targetId = seatEl?.dataset.seatId ?? null;
    const isVacant = seatEl?.dataset.seatVacant === 'true';

    if (targetId && isVacant) {
      setDragOverSeatId(targetId);
    } else {
      setDragOverSeatId(null);
    }
  };

  const handleTouchEndGrip = (e: TouchEvent<HTMLSpanElement>) => {
    const sourceId = touchDragSourceRef.current;
    if (!sourceId) return;
    e.stopPropagation();

    const touch = e.changedTouches[0];
    let targetId: string | null = dragOverSeatId;
    if (!targetId && touch) {
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const seatEl = el?.closest('[data-seat-id]') as HTMLElement | null;
      if (seatEl?.dataset.seatId) {
        targetId = seatEl.dataset.seatId;
      }
    }

    touchDragSourceRef.current = null;
    setDraggingSeatId(null);
    setDragOverSeatId(null);
    setTouchGhost(null);

    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 120);

    if (targetId && targetId !== sourceId) {
      onMoveSeat(sourceId, targetId);
    }
  };

  const renderSeatSlot = (seat: StudentSeat, zoneLabel: string) => {
    const isOccupied = seat.occupant !== null;
    const isMatch = doesSeatMatchSearch(seat, searchQuery);
    const isOwnedOrEditable = isOccupied && canModifySeat(seat.id);
    const isDraggingThis = activeSourceId === seat.id;
    const isDropTargetActive = !isOccupied && dragOverSeatId === seat.id;
    const isVacantAvailableForMove =
      !isOccupied && activeSourceId !== null && (!isLocked || isAdmin);

    const hiddenByFilter =
      (seatFilter === 'claimed' && !isOccupied && !activeSourceId) ||
      (seatFilter === 'open' && isOccupied);

    if (hiddenByFilter) {
      return (
        <div
          key={seat.id}
          aria-hidden="true"
          className="min-h-[108px] sm:min-h-[144px] rounded-lg sm:rounded-xl border border-dashed border-amber-950/20 bg-amber-950/5 flex items-center justify-center text-[10px] sm:text-xs font-mono text-amber-950/40"
        >
          #{String(seat.seatNumber).padStart(2, '0')}
        </div>
      );
    }

    const searchClasses = hasSearch
      ? isMatch
        ? 'ring-2 sm:ring-3 ring-amber-400 shadow-lg scale-[1.02] z-10'
        : 'opacity-30 saturate-50'
      : '';

    if (isOccupied && seat.occupant) {
      const student = seat.occupant;
      const flag = resolveCountryFlag(student.country, student.countryFlag);
      const firstName = student.fullName.split(' ')[0];

      return (
        <div
          key={seat.id}
          role="button"
          tabIndex={0}
          draggable={isOwnedOrEditable && (!isLocked || isAdmin)}
          data-seat-id={seat.id}
          data-seat-vacant="false"
          onDragStart={(e) => handleDragStart(e, seat)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => {
            if (draggingSeatId && draggingSeatId !== seat.id) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'none';
            }
          }}
          onDrop={(e) => handleDropOnSeat(e, seat)}
          onClick={() => {
            if (suppressClickRef.current) return;
            if (movingSeatId) {
              if (movingSeatId === seat.id) {
                onCancelMoveMode();
              } else {
                onMoveSeat(movingSeatId, seat.id);
              }
              return;
            }
            onSelectOccupiedSeat(seat, zoneLabel);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (movingSeatId) {
                if (movingSeatId === seat.id) onCancelMoveMode();
                else onMoveSeat(movingSeatId, seat.id);
              } else {
                onSelectOccupiedSeat(seat, zoneLabel);
              }
            }
          }}
          title={
            isOwnedOrEditable
              ? 'Your seat — click to edit or drag to any vacant seat'
              : 'Click to inspect profile and leave Desk Graffiti'
          }
          className={`oak-desk-surface group relative rounded-lg sm:rounded-xl p-1.5 sm:p-3.5 text-center sm:text-left transition-all duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2F] select-none flex flex-col justify-between min-h-[108px] sm:min-h-[144px] min-w-0 ${
            isOwnedOrEditable && (!isLocked || isAdmin)
              ? 'cursor-grab active:cursor-grabbing ring-1 ring-[#1E3A2F]/35'
              : 'cursor-pointer'
          } ${searchClasses} ${
            isDraggingThis
              ? 'opacity-55 scale-[0.97] ring-2 ring-[#1E3A2F] ring-offset-1'
              : ''
          }`}
        >
          {/* Top Row: Seat Number, Drag Handle (only for your own seat or Admin) & Flag */}
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2 w-full">
            <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-mono tabular-nums font-medium text-amber-950/65">
              {isOwnedOrEditable && (!isLocked || isAdmin) && (
                <span
                  role="presentation"
                  aria-label={`Drag ${student.fullName} to another vacant seat`}
                  onTouchStart={(e) => handleTouchStartGrip(e, seat)}
                  onTouchMove={handleTouchMoveGrip}
                  onTouchEnd={handleTouchEndGrip}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center justify-center -ml-0.5 p-0.5 rounded text-[#1E3A2F]/75 hover:text-[#1E3A2F] touch-none cursor-grab active:cursor-grabbing"
                  title="Drag to move to a vacant seat"
                >
                  <GripVertical className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </span>
              )}
              <span className="hidden sm:inline">Seat </span>#
              {String(seat.seatNumber).padStart(2, '0')}
            </span>
            <span className="text-xs sm:text-sm leading-none shrink-0" title={student.country}>
              {flag}
            </span>
          </div>

          {/* Avatar & Student Name */}
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 min-w-0 w-full pointer-events-none">
            <Avatar
              name={student.fullName}
              photoUrl={student.photoUrl}
              sizeClass="w-9 h-9 sm:w-12 sm:h-12"
              textClass="text-xs sm:text-sm"
              ringClass="ring-2 ring-white/90"
            />
            <div className="min-w-0 w-full sm:flex-1">
              <p className="text-[11px] sm:text-sm font-semibold text-stone-900 truncate group-hover:text-[#1E3A2F] transition-colors">
                <span className="sm:hidden">{firstName}</span>
                <span className="hidden sm:inline">{student.fullName}</span>
              </p>
              {formatNickname(student.nickname) ? (
                <p className="text-[10px] sm:text-xs italic text-amber-950/80 truncate">
                  {formatNickname(student.nickname)}
                </p>
              ) : (
                <p className="text-[10px] sm:text-xs text-stone-700 truncate">
                  {student.city}
                </p>
              )}
            </div>
          </div>

          {/* Bottom Location & Profession Footer (Desktop / Tablet) */}
          <div className="hidden sm:flex mt-2.5 pt-2 border-t border-amber-900/15 items-center justify-between gap-2 text-[11px] text-amber-950/80 w-full pointer-events-none">
            <span className="inline-flex items-center gap-1 truncate font-medium">
              <MapPin className="w-3 h-3 shrink-0 text-amber-900/70" />
              <span className="truncate">{student.city}</span>
            </span>
            <span className="hidden md:inline truncate text-amber-950/65 max-w-[48%]">
              {student.profession}
            </span>
          </div>
        </div>
      );
    }

    // Empty / Vacant Seat Slot
    const seatClaimDisabled = isLocked && !isAdmin;

    return (
      <button
        key={seat.id}
        type="button"
        disabled={seatClaimDisabled}
        data-seat-id={seat.id}
        data-seat-vacant={seatClaimDisabled ? 'false' : 'true'}
        onDragOver={(e) => handleDragOverVacant(e, seat)}
        onDragEnter={(e) => handleDragOverVacant(e, seat)}
        onDragLeave={() => handleDragLeaveVacant(seat)}
        onDrop={(e) => handleDropOnSeat(e, seat)}
        onClick={() => {
          if (seatClaimDisabled) return;
          if (movingSeatId) {
            onMoveSeat(movingSeatId, seat.id);
          } else {
            onClaimEmptySeat(seat);
          }
        }}
        className={`oak-desk-surface-empty group relative rounded-lg sm:rounded-xl p-1.5 sm:p-3.5 text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2F] flex flex-col items-center justify-center gap-1.5 sm:gap-2 min-h-[108px] sm:min-h-[144px] min-w-0 ${
          seatClaimDisabled
            ? 'opacity-65 cursor-not-allowed'
            : 'hover:-translate-y-1 cursor-pointer'
        } ${hasSearch && !isVacantAvailableForMove ? 'opacity-35' : ''} ${
          isDropTargetActive
            ? 'ring-2 sm:ring-3 ring-[#1E3A2F] bg-emerald-50! scale-[1.03] z-10'
            : isVacantAvailableForMove
              ? 'ring-2 ring-dashed ring-[#1E3A2F]/55 hover:ring-[#1E3A2F]'
              : ''
        }`}
      >
        <span className="text-[10px] sm:text-xs font-mono tabular-nums font-medium text-stone-500">
          <span className="hidden sm:inline">Seat </span>#
          {String(seat.seatNumber).padStart(2, '0')}
        </span>

        {seatClaimDisabled ? (
          <span className="inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] sm:text-xs font-medium text-stone-500 bg-stone-100 rounded-md whitespace-nowrap">
            <Lock className="w-3 h-3 shrink-0" />
            Locked
          </span>
        ) : isVacantAvailableForMove ? (
          <span
            className={`inline-flex items-center justify-center gap-1 px-1.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded-md sm:rounded-lg transition-colors whitespace-nowrap max-w-full ${
              isDropTargetActive
                ? 'bg-[#1E3A2F] text-amber-50 shadow-sm'
                : 'bg-emerald-50 text-[#1E3A2F] border border-emerald-700/30 group-hover:bg-[#1E3A2F] group-hover:text-amber-50'
            }`}
          >
            <ArrowRightLeft className="w-3 h-3 shrink-0" />
            <span className="sm:hidden">{movingSeatId ? 'Move' : 'Drop'}</span>
            <span className="hidden sm:inline">
              {movingSeatId ? 'Move Here' : 'Drop Here'}
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center justify-center gap-0.5 sm:gap-1.5 px-1.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-[#1E3A2F] bg-white/95 group-hover:bg-[#1E3A2F] group-hover:text-amber-50 rounded-md sm:rounded-lg border border-stone-300/80 group-hover:border-[#1E3A2F] transition-colors shadow-xs whitespace-nowrap max-w-full">
            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="sm:hidden">Claim</span>
            <span className="hidden sm:inline">Claim Seat</span>
          </span>
        )}

        {seatClaimDisabled && (
          <span className="hidden sm:inline text-[11px] text-stone-500">Claims paused</span>
        )}
      </button>
    );
  };

  return (
    <div className="stage-perspective pb-12 max-w-6xl mx-auto">
      {movingSeatId && activeSourceSeat?.occupant && (
        <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-[#1E3A2F] text-amber-50 flex items-center justify-between gap-3 shadow-sm">
          <p className="text-xs sm:text-sm font-medium">
            Select a vacant seat for <strong>{activeSourceSeat.occupant.fullName}</strong> (Seat #
            {String(activeSourceSeat.seatNumber).padStart(2, '0')}).
          </p>
          <button
            type="button"
            onClick={onCancelMoveMode}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white/15 hover:bg-white/25 rounded-lg shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
        </div>
      )}

      <div className="space-y-5 sm:space-y-7">
        {rows.map((rowSeats, rowIndex) => {
          const rowHeading = getRowHeading(rowIndex, rows.length);
          const zoneLabel = getZoneLabelForRow(rowIndex, rows.length);
          const firstSeatNum = rowIndex * SEATS_PER_BENCH + 1;
          const lastSeatNum = rowIndex * SEATS_PER_BENCH + rowSeats.length;

          return (
            <div key={`bench-row-${rowIndex}`} className="relative">
              {/* Bench Row Header */}
              <div className="flex items-center justify-between mb-2 sm:mb-2.5 px-1">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-stone-600">
                  {rowHeading}
                </span>
                <span className="text-[11px] sm:text-xs font-mono tabular-nums text-stone-400">
                  #{String(firstSeatNum).padStart(2, '0')}–#{String(lastSeatNum).padStart(2, '0')}
                </span>
              </div>

              {/* Single Wooden Bench Container — Always 4 Seats in 1 Horizontal Row */}
              <div className="oak-bench-frame rounded-xl sm:rounded-2xl p-1.5 sm:p-3 border border-amber-900/20">
                <div className="grid grid-cols-4 gap-1.5 sm:gap-3.5">
                  {rowSeats.map((seat) => renderSeatSlot(seat, zoneLabel))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Touch Drag Ghost for Mobile */}
      {touchGhost && (
        <div
          aria-hidden="true"
          style={{
            transform: `translate3d(${touchGhost.x - 44}px, ${touchGhost.y - 36}px, 0)`,
          }}
          className="fixed top-0 left-0 z-[70] pointer-events-none px-3 py-1.5 rounded-lg bg-[#1E3A2F] text-amber-50 text-xs font-semibold shadow-xl border border-amber-200/40"
        >
          Moving {touchGhost.name}
        </div>
      )}
    </div>
  );
}
