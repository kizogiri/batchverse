import { BookOpen, Calendar, Edit3, Heart, Send, Trash2, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Avatar } from '@/src/components/Avatar';
import { TeacherProfile } from '@/src/types/classroom';

interface TeacherTributeModalProps {
  teacher: TeacherProfile;
  isAdminMode: boolean;
  onClose: () => void;
  onAddAppreciation: (teacherId: string, author: string, note: string) => void;
  onEditTeacher: (teacher: TeacherProfile) => void;
  onDeleteTeacher: (teacherId: string) => void;
}

export function TeacherTributeModal({
  teacher,
  isAdminMode,
  onClose,
  onAddAppreciation,
  onEditTeacher,
  onDeleteTeacher,
}: TeacherTributeModalProps) {
  const [author, setAuthor] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !note.trim()) return;
    onAddAppreciation(teacher.id, author.trim(), note.trim());
    setNote('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="teacher-tribute-name"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-stone-950/65"
      onClick={onClose}
    >
      <div
        className="@container bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-3xl max-h-[94%] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto grid grid-cols-1 @md:grid-cols-12">
          {/* Left Pane: Faculty Portrait & Tribute */}
          <div className="@md:col-span-5 bg-[#1E3A2F] p-4 @md:p-5 text-amber-50 flex flex-col justify-between gap-4 relative">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close teacher tribute"
              className="@md:hidden absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-amber-50 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-3.5">
              <p className="text-[11px] font-mono tracking-wide text-emerald-200/90 pr-8 @md:pr-0">
                Faculty Tribute · Teachers’ Podium
              </p>

              <div className="flex items-center gap-3.5">
                <Avatar
                  name={teacher.name}
                  photoUrl={teacher.photoUrl}
                  sizeClass="w-16 h-16 @md:w-20 @md:h-20"
                  textClass="text-xl @md:text-2xl"
                  ringClass="ring-3 ring-amber-200/75"
                />
                <div className="min-w-0 flex-1">
                  <h2
                    id="teacher-tribute-name"
                    className="text-lg @md:text-xl font-semibold text-white leading-tight"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {teacher.name}
                  </h2>
                  <p className="text-xs @md:text-sm text-amber-200 mt-1 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span>{teacher.subject}</span>
                  </p>
                  <p className="text-[11px] text-emerald-100/85 mt-1 flex items-center gap-1.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{teacher.yearsTaught}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 border border-white/15 rounded-xl p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/85 mb-1">
                Class Tribute Note
              </p>
              <p className="text-xs @md:text-sm text-amber-50 leading-relaxed">
                {teacher.tributeNote}
              </p>
            </div>
          </div>

          {/* Right Pane: Appreciation Notes & Admin Controls */}
          <div className="@md:col-span-7 p-4 @md:p-5 flex flex-col justify-between gap-4 relative">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close teacher tribute"
              className="hidden @md:flex absolute top-3.5 right-3.5 w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-3 pr-8 @md:pr-0">
              <div className="flex items-center justify-between @md:pr-10">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-600" />
                  Student Appreciation Notes
                </h3>
                <span className="text-xs font-mono tabular-nums text-stone-400">
                  {teacher.appreciationNotes.length}
                </span>
              </div>

              {teacher.appreciationNotes.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {teacher.appreciationNotes.map((item) => (
                    <div
                      key={item.id}
                      className="bg-stone-50 border border-stone-200/80 rounded-lg px-3 py-2 text-xs"
                    >
                      <p className="text-stone-800 leading-snug">“{item.note}”</p>
                      <p className="text-[11px] text-stone-500 mt-1 font-medium">
                        — {item.author} · <span className="font-mono">{item.createdAt}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-500 italic">
                  Be the first classmate to leave a thank-you note for {teacher.name}.
                </p>
              )}

              <form onSubmit={handleSubmit} className="pt-1">
                <div className="flex flex-wrap @sm:flex-nowrap gap-1.5">
                  <input
                    type="text"
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Your name"
                    className="w-28 px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30"
                  />
                  <input
                    type="text"
                    required
                    maxLength={140}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a short appreciation note..."
                    className="flex-1 min-w-[120px] px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#1E3A2F] hover:bg-[#162C23] text-amber-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    Send
                  </button>
                </div>
              </form>
            </div>

            {isAdminMode && (
              <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteTeacher(teacher.id);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditTeacher(teacher);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Teacher
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
