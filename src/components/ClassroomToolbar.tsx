import {
  Download,
  Edit3,
  KeyRound,
  Lock,
  Minus,
  Plus,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import { ClassroomData, SchoolGroupDoc } from '@/src/types/classroom';

export type SeatFilter = 'all' | 'claimed' | 'open';

interface ClassroomToolbarProps {
  classroom: ClassroomData;
  activeGroup: SchoolGroupDoc | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  matchCount: number;
  seatFilter: SeatFilter;
  onSeatFilterChange: (filter: SeatFilter) => void;
  isAdminMode: boolean;
  onEditChalkboard: () => void;
  onAddTeacher: () => void;
  onAddDeskRow: () => void;
  onRemoveDeskRow: () => void;
  onExportJson: () => void;
  onOpenInviteModal: () => void;
}

export function ClassroomToolbar({
  classroom,
  activeGroup,
  searchQuery,
  onSearchChange,
  matchCount,
  seatFilter,
  onSeatFilterChange,
  isAdminMode,
  onEditChalkboard,
  onAddTeacher,
  onAddDeskRow,
  onRemoveDeskRow,
  onExportJson,
  onOpenInviteModal,
}: ClassroomToolbarProps) {
  const claimedCount = classroom.seats.filter((s) => s.occupant !== null).length;
  const totalCount = classroom.seats.length;
  const uniqueCountries = new Set(
    classroom.seats
      .filter((s) => s.occupant !== null)
      .map((s) => s.occupant!.country.trim().toLowerCase())
      .filter(Boolean)
  ).size;

  return (
    <section
      aria-label="Classroom Controls"
      className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-3"
    >
      {/* Mobile / Tablet Occupancy Summary */}
      <div className="flex xl:hidden items-center justify-between text-xs text-stone-600 font-mono tabular-nums mb-3">
        <span>
          <strong className="text-stone-900">{claimedCount}</strong> / {totalCount} Seats Claimed
        </span>
        <span>
          {uniqueCountries} {uniqueCountries === 1 ? 'Country' : 'Countries'}
        </span>
      </div>

      {/* Locked Classroom Notice */}
      {activeGroup?.isLocked && (
        <div className="mb-3 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-amber-800 shrink-0" />
          <span>Classroom is locked by the admin. New seat claims are paused.</span>
        </div>
      )}

      {/* Main Search + Filter Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name, city, or profession..."
            aria-label="Search classmates"
            className="w-full pl-10 pr-24 py-2.5 text-sm bg-white border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F] transition-shadow"
          />
          {searchQuery.trim() && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-xs font-mono tabular-nums text-stone-500">
                {matchCount} {matchCount === 1 ? 'match' : 'matches'}
              </span>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Interactive Seat Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-stone-200/70 rounded-lg self-start md:self-auto">
          <button
            type="button"
            onClick={() => onSeatFilterChange('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              seatFilter === 'all'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All Desks ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => onSeatFilterChange('claimed')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              seatFilter === 'claimed'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Claimed ({claimedCount})
          </button>
          <button
            type="button"
            onClick={() => onSeatFilterChange('open')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              seatFilter === 'open'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Open ({totalCount - claimedCount})
          </button>
        </div>
      </div>

      {/* Admin Toolbar */}
      {isAdminMode && (
        <div className="mt-3 p-3 bg-white border border-stone-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-[#1E3A2F]">Admin Controls</span>

          <div className="flex flex-wrap items-center gap-2">
            {activeGroup && (
              <button
                type="button"
                onClick={onOpenInviteModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-100 hover:bg-amber-200/80 text-amber-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Invite Code ({activeGroup.inviteCode})
              </button>
            )}
            <button
              type="button"
              onClick={onEditChalkboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Chalkboard
            </button>
            <button
              type="button"
              onClick={onAddTeacher}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1E3A2F] hover:bg-[#162C23] text-amber-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Teacher
            </button>
            <button
              type="button"
              onClick={onAddDeskRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Row (+4)
            </button>
            {classroom.seats.length > 8 && (
              <button
                type="button"
                onClick={onRemoveDeskRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
                Remove Row
              </button>
            )}
            <button
              type="button"
              onClick={onExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
