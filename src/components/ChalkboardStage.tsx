import { Edit3, MessageSquareHeart, Plus, Trash2 } from 'lucide-react';
import { Avatar } from '@/src/components/Avatar';
import { ChalkboardConfig, TeacherProfile } from '@/src/types/classroom';

interface ChalkboardStageProps {
  chalkboard: ChalkboardConfig;
  teachers: TeacherProfile[];
  isAdminMode: boolean;
  onEditChalkboard: () => void;
  onSelectTeacher: (teacher: TeacherProfile) => void;
  onAddTeacher: () => void;
  onEditTeacher: (teacher: TeacherProfile) => void;
  onDeleteTeacher: (teacherId: string) => void;
}

export function ChalkboardStage({
  chalkboard,
  teachers,
  isAdminMode,
  onEditChalkboard,
  onSelectTeacher,
  onAddTeacher,
  onEditTeacher,
  onDeleteTeacher,
}: ChalkboardStageProps) {
  return (
    <div className="mb-8">
      {/* Emerald Chalkboard with Oak Frame */}
      <div className="oak-frame p-2.5 sm:p-3.5 rounded-2xl shadow-lg max-w-5xl mx-auto">
        <div className="chalkboard-surface rounded-xl px-5 py-6 sm:px-10 sm:py-8 relative overflow-hidden border border-white/10">
          {isAdminMode && (
            <button
              type="button"
              onClick={onEditChalkboard}
              className="absolute top-3.5 right-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/15 hover:bg-white/25 text-amber-50 rounded-lg transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Chalkboard
            </button>
          )}

          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs sm:text-sm font-mono tracking-wider text-emerald-200/80 mb-1.5">
              {chalkboard.year}
            </p>
            <h1 className="chalk-text text-2xl sm:text-3xl lg:text-4xl font-semibold text-amber-50/95 tracking-tight text-balance">
              {chalkboard.title}
            </h1>
            <div className="w-24 h-px bg-amber-100/25 mx-auto my-3.5" />
            <p className="text-sm sm:text-base text-emerald-50/90 leading-relaxed max-w-2xl mx-auto">
              {chalkboard.announcement}
            </p>
          </div>
        </div>

        {/* Wooden Chalk Ledge with Chalk Sticks & Duster */}
        <div className="h-3 mt-1.5 bg-[#533318] rounded-b-lg flex items-center justify-between px-8 relative">
          <div className="flex items-center gap-2 -mt-2">
            <span className="w-7 h-1.5 bg-amber-50/90 rounded-sm shadow-xs" aria-hidden="true" />
            <span className="w-5 h-1.5 bg-amber-200/85 rounded-sm shadow-xs" aria-hidden="true" />
          </div>
          <div
            className="w-14 h-2.5 bg-stone-800 border-t-2 border-stone-400 rounded-xs -mt-2.5 shadow-sm"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Teachers' Podium Row */}
      <div className="mt-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-3.5">
          <div className="h-px flex-1 max-w-[120px] bg-stone-300" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
            Teachers’ Podium
          </h2>
          <div className="h-px flex-1 max-w-[120px] bg-stone-300" />
        </div>

        <div className="flex flex-wrap items-stretch justify-center gap-4">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="relative group">
              <button
                type="button"
                onClick={() => onSelectTeacher(teacher)}
                className="w-52 sm:w-56 bg-white hover:bg-[#FFFDF9] border border-stone-200/90 hover:border-amber-700/30 rounded-xl p-3.5 flex items-center gap-3.5 text-left shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
              >
                <Avatar
                  name={teacher.name}
                  photoUrl={teacher.photoUrl}
                  sizeClass="w-13 h-13"
                  textClass="text-sm"
                  ringClass="ring-2 ring-amber-800/20"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-900 truncate">
                    {teacher.name}
                  </p>
                  <p className="text-xs font-medium text-[#1E3A2F] truncate mt-0.5">
                    {teacher.subject}
                  </p>
                  <p className="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
                    <MessageSquareHeart className="w-3 h-3 text-amber-700/80 shrink-0" />
                    <span className="truncate">
                      {teacher.appreciationNotes.length > 0
                        ? `${teacher.appreciationNotes.length} ${
                            teacher.appreciationNotes.length === 1 ? 'tribute' : 'tributes'
                          }`
                        : 'Open tribute'}
                    </span>
                  </p>
                </div>
              </button>

              {isAdminMode && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTeacher(teacher);
                    }}
                    aria-label={`Edit ${teacher.name}`}
                    className="w-7 h-7 rounded-full bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 flex items-center justify-center shadow-sm cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTeacher(teacher.id);
                    }}
                    aria-label={`Remove ${teacher.name}`}
                    className="w-7 h-7 rounded-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center shadow-sm cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {teachers.length === 0 && !isAdminMode && (
            <p className="text-xs text-stone-400 italic py-2">No subject teachers listed yet.</p>
          )}

          {isAdminMode && (
            <button
              type="button"
              onClick={onAddTeacher}
              className="w-52 sm:w-56 border border-dashed border-stone-300 hover:border-[#1E3A2F] bg-stone-50/70 hover:bg-white rounded-xl p-3.5 flex items-center justify-center gap-2 text-xs font-semibold text-stone-700 hover:text-[#1E3A2F] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Subject Teacher
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
