import { GraduationCap } from 'lucide-react';
import { SchoolGroupDoc } from '@/src/types/classroom';

interface FooterProps {
  activeGroup?: SchoolGroupDoc | null;
  wide?: boolean;
}

export function Footer({ activeGroup, wide = false }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-stone-200/90 bg-[#FAF8F4] text-stone-600">
      <div
        className={`${
          wide ? 'max-w-[1360px] px-4 sm:px-6 lg:px-8' : 'max-w-5xl px-4 sm:px-6'
        } mx-auto py-5 flex flex-col sm:flex-row items-center justify-between gap-3`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-[#1E3A2F] text-amber-50 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs min-w-0">
            <span
              className="font-semibold text-stone-900 tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              BatchVerse
            </span>
            <span aria-hidden="true" className="text-stone-300">
              ·
            </span>
            <span className="text-stone-500 truncate">
              {activeGroup
                ? `${activeGroup.schoolName} (${activeGroup.batchYear})`
                : 'Grade 10 & Grade 12 Virtual Classrooms'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-500 shrink-0">
          <span>© {year} BatchVerse</span>
          <span aria-hidden="true" className="text-stone-300">
            ·
          </span>
          <span>
            Developed by{' '}
            <span className="font-semibold text-[#1E3A2F] tracking-tight">dadagiri</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
