import { Camera, Trash2, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useState } from 'react';
import { Avatar } from '@/src/components/Avatar';
import { ChalkboardConfig, TeacherProfile } from '@/src/types/classroom';
import { readAndResizeImageFile } from '@/src/utils/imageHelpers';

interface EditChalkboardModalProps {
  gradeLabel: string;
  chalkboard: ChalkboardConfig;
  onClose: () => void;
  onSave: (config: ChalkboardConfig) => void;
}

export function EditChalkboardModal({
  gradeLabel,
  chalkboard,
  onClose,
  onSave,
}: EditChalkboardModalProps) {
  const [title, setTitle] = useState(chalkboard.title);
  const [year, setYear] = useState(chalkboard.year);
  const [announcement, setAnnouncement] = useState(chalkboard.announcement);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      year: year.trim(),
      announcement: announcement.trim(),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-chalkboard-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-stone-950/65"
      onClick={onClose}
    >
      <div
        className="@container bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl max-h-[94%] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 py-3 border-b border-stone-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-stone-500">{gradeLabel}</p>
            <h2
              id="edit-chalkboard-title"
              className="text-base @md:text-lg font-semibold text-stone-900"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Edit Classroom Chalkboard
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5">
          <div className="grid grid-cols-1 @sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Batch Subtitle / School Year
              </label>
              <input
                type="text"
                required
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 text-xs @md:text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Chalkboard Headline
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs @md:text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Class Announcement / Reunion Notice
            </label>
            <textarea
              rows={2}
              required
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              className="w-full px-3 py-2 text-xs @md:text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
            />
          </div>

          <div className="pt-1 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs @md:text-sm font-medium text-stone-700 hover:bg-stone-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs @md:text-sm font-semibold bg-[#1E3A2F] hover:bg-[#162C23] text-amber-50 rounded-lg cursor-pointer"
            >
              Update Chalkboard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TeacherFormModalProps {
  gradeLabel: string;
  teacher: TeacherProfile | null;
  onClose: () => void;
  onSave: (teacher: Omit<TeacherProfile, 'id' | 'appreciationNotes'>, existingId?: string) => void;
}

export function TeacherFormModal({
  gradeLabel,
  teacher,
  onClose,
  onSave,
}: TeacherFormModalProps) {
  const [name, setName] = useState(teacher?.name ?? '');
  const [subject, setSubject] = useState(teacher?.subject ?? '');
  const [yearsTaught, setYearsTaught] = useState(teacher?.yearsTaught ?? '2010 – Present');
  const [tributeNote, setTributeNote] = useState(teacher?.tributeNote ?? '');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(teacher?.photoUrl);
  const [uploadError, setUploadError] = useState('');

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    try {
      const dataUrl = await readAndResizeImageFile(file, 320);
      setPhotoUrl(dataUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to process image.');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !tributeNote.trim()) return;
    onSave(
      {
        name: name.trim(),
        subject: subject.trim(),
        yearsTaught: yearsTaught.trim() || 'Faculty',
        photoUrl,
        tributeNote: tributeNote.trim(),
      },
      teacher?.id
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="teacher-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-stone-950/65"
      onClick={onClose}
    >
      <div
        className="@container bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl max-h-[94%] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 py-3 border-b border-stone-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-stone-500">{gradeLabel} · Teachers’ Podium</p>
            <h2
              id="teacher-form-title"
              className="text-base @md:text-lg font-semibold text-stone-900"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {teacher ? 'Edit Subject Teacher' : 'Add Subject Teacher'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form id="teacher-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 @md:p-5 space-y-3.5">
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-stone-50 border border-stone-200/80">
            <Avatar
              name={name.trim() || 'Teacher'}
              photoUrl={photoUrl}
              sizeClass="w-14 h-14"
              textClass="text-base"
            />
            <div className="flex-1">
              <p className="text-xs font-semibold text-stone-800">Teacher Portrait</p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1E3A2F] hover:bg-[#162C23] text-amber-50 rounded-lg cursor-pointer">
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
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
              {uploadError && <p className="text-xs text-rose-600 mt-1">{uploadError}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 @sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Teacher Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Prof. Ramesh Sharma"
                className="w-full px-3 py-1.5 text-xs @md:text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Subject Taught <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Mathematics"
                className="w-full px-3 py-1.5 text-xs @md:text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Years Taught
              </label>
              <input
                type="text"
                value={yearsTaught}
                onChange={(e) => setYearsTaught(e.target.value)}
                placeholder="e.g., 2006 – 2020"
                className="w-full px-3 py-1.5 text-xs @md:text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
              Class Tribute Note <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={tributeNote}
              onChange={(e) => setTributeNote(e.target.value)}
              placeholder="Write a memorable note or favorite quote from class..."
              className="w-full px-3 py-1.5 text-xs @md:text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
            />
          </div>
        </form>

        <div className="shrink-0 px-5 py-2.5 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs @md:text-sm font-medium text-stone-700 hover:bg-stone-200/70 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="teacher-form"
            className="px-4 py-1.5 text-xs @md:text-sm font-semibold bg-[#1E3A2F] hover:bg-[#162C23] text-amber-50 rounded-lg cursor-pointer"
          >
            {teacher ? 'Save Teacher' : 'Add to Podium'}
          </button>
        </div>
      </div>
    </div>
  );
}
