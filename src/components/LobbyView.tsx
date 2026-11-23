import { User } from 'firebase/auth';
import {
  ArrowRight,
  Copy,
  GraduationCap,
  KeyRound,
  LogIn,
  LogOut,
  Plus,
  School,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Footer } from '@/src/components/Footer';
import { RecentGroupEntry, SchoolGroupDoc } from '@/src/types/classroom';

interface LobbyViewProps {
  adminUser: User | null;
  authReady: boolean;
  adminGroups: SchoolGroupDoc[];
  recentGroups: RecentGroupEntry[];
  onJoinByCode: (code: string) => Promise<string | null>;
  onOpenGroup: (groupId: string, entryMode: 'student' | 'admin') => void;
  onAdminSignIn: () => Promise<void>;
  onAdminSignOut: () => Promise<void>;
  onCreateGroup: (schoolName: string, batchYear: string) => Promise<void>;
  onCopyText: (text: string, label: string) => void;
}

export function LobbyView({
  adminUser,
  authReady,
  adminGroups,
  recentGroups,
  onJoinByCode,
  onOpenGroup,
  onAdminSignIn,
  onAdminSignOut,
  onCreateGroup,
  onCopyText,
}: LobbyViewProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  const [schoolName, setSchoolName] = useState('');
  const [batchYear, setBatchYear] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const handleJoinSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const digits = inviteCode.replace(/\D/g, '');
    if (digits.length !== 5) {
      setJoinError('Please enter a 5-digit numeric invite code.');
      return;
    }
    setJoinError('');
    setJoining(true);
    try {
      const errorMsg = await onJoinByCode(digits);
      if (errorMsg) setJoinError(errorMsg);
    } finally {
      setJoining(false);
    }
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (schoolName.trim().length < 2 || batchYear.trim().length < 2) {
      setCreateError('Please enter both your School Name and Batch Year.');
      return;
    }
    setCreateError('');
    setCreating(true);
    try {
      await onCreateGroup(schoolName.trim(), batchYear.trim());
      setSchoolName('');
      setBatchYear('');
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Could not create school group. Please try again.'
      );
    } finally {
      setCreating(false);
    }
  };

  const handleSignInClick = async () => {
    setSigningIn(true);
    setCreateError('');
    try {
      await onAdminSignIn();
    } catch {
      setCreateError('Sign-in popup was closed or blocked. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  const buildShareLink = (code: string) =>
    `${window.location.origin}${window.location.pathname}?code=${code}`;

  return (
    <div className="min-h-screen flex flex-col classroom-floor">
      {/* Clean 3-Zone Header */}
      <header className="sticky top-0 z-30 bg-[#FAF8F4]/95 backdrop-blur-md border-b border-stone-200/90">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-[#1E3A2F] text-amber-50 flex items-center justify-center shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span
              className="text-lg sm:text-xl font-semibold tracking-tight text-stone-900 whitespace-nowrap"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              BatchVerse
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {adminUser ? (
              <div className="flex items-center gap-2.5">
                <span className="hidden sm:inline text-xs text-stone-600 truncate max-w-[180px]">
                  {adminUser.displayName || adminUser.email}
                </span>
                <button
                  type="button"
                  onClick={onAdminSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!authReady || signingIn}
                onClick={handleSignInClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-800 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                <LogIn className="w-3.5 h-3.5" />
                Admin Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Compact Chalkboard Welcome Banner */}
        <div className="oak-frame p-2.5 sm:p-3 rounded-2xl shadow-md mb-8">
          <div className="chalkboard-surface rounded-xl px-6 py-7 sm:px-10 sm:py-8 text-center border border-white/10">
            <p className="text-xs font-mono tracking-wider text-emerald-200/85 mb-2">
              Grade 10 &amp; Grade 12 Virtual Classrooms
            </p>
            <h1 className="chalk-text text-2xl sm:text-4xl font-semibold text-amber-50 text-balance max-w-2xl mx-auto">
              Find your old bench, share where life took you.
            </h1>
          </div>
        </div>

        {/* Two Equal-Height Cards: Join Classroom (Students) + Create/Manage Group (Admin) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: Student Zero-Login Join */}
          <section className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2
                    className="text-lg font-semibold text-stone-900"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Join Your Classroom
                  </h2>
                  <p className="text-xs text-stone-500">No login required</p>
                </div>
              </div>

              <form onSubmit={handleJoinSubmit} className="mt-5 space-y-3.5">
                <div>
                  <label
                    htmlFor="invite-code-input"
                    className="block text-xs font-semibold text-stone-700 mb-1.5"
                  >
                    5-Digit School Invite Code
                  </label>
                  <input
                    id="invite-code-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value.replace(/\D/g, '').slice(0, 5));
                      setJoinError('');
                    }}
                    placeholder="e.g., 48291"
                    className="w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.35em] font-semibold border border-stone-300 rounded-xl text-stone-900 placeholder:text-stone-300 placeholder:tracking-normal placeholder:text-base focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
                  />
                  {joinError && (
                    <p className="text-xs text-rose-600 font-medium mt-1.5">{joinError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={joining || inviteCode.length !== 5}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold bg-[#1E3A2F] hover:bg-[#162C23] disabled:opacity-55 text-amber-50 rounded-xl transition-colors cursor-pointer"
                >
                  {joining ? 'Finding Classroom...' : 'Enter Classroom'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Recently Visited Groups */}
              {recentGroups.length > 0 && (
                <div className="mt-6 pt-5 border-t border-stone-200">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2.5">
                    Recently Visited
                  </p>
                  <div className="space-y-2">
                    {recentGroups.map((item) => {
                      const ownsGroup = adminGroups.some((g) => g.id === item.groupId);
                      return (
                      <button
                        key={item.groupId}
                        type="button"
                        onClick={() => onOpenGroup(item.groupId, ownsGroup ? 'admin' : 'student')}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-stone-900 truncate">
                            {item.schoolName}
                          </p>
                          <p className="text-xs text-stone-500 truncate">
                            {item.batchYear} · Code{' '}
                            <span className="font-mono font-semibold text-stone-700">
                              {item.inviteCode}
                            </span>
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-stone-400 shrink-0" />
                      </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Card 2: Create a School Group (Admin Sign-In) */}
          <section className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-9 h-9 rounded-lg bg-[#1E3A2F] text-amber-50 flex items-center justify-center shrink-0">
                  <School className="w-4 h-4" />
                </div>
                <div>
                  <h2
                    className="text-lg font-semibold text-stone-900"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Create a School Group
                  </h2>
                  <p className="text-xs text-stone-500">For group admins</p>
                </div>
              </div>

              {!adminUser ? (
                <div className="mt-5 space-y-4">
                  <p className="text-sm text-stone-600 leading-relaxed">
                    Sign in with Google to set up a private classroom and generate a{' '}
                    <strong>5-digit invite code</strong> for your batch.
                  </p>

                  {createError && (
                    <p className="text-xs text-rose-600 font-medium">{createError}</p>
                  )}

                  <button
                    type="button"
                    disabled={!authReady || signingIn}
                    onClick={handleSignInClick}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white rounded-xl transition-colors cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    {signingIn ? 'Signing in...' : 'Sign in with Google'}
                  </button>
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  <form onSubmit={handleCreateSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        School Name <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={100}
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="e.g., Silver Oak High School"
                        className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Batch / Graduation Year <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={40}
                        value={batchYear}
                        onChange={(e) => setBatchYear(e.target.value)}
                        placeholder="e.g., Batch of 2016"
                        className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A2F]/30 focus:border-[#1E3A2F]"
                      />
                    </div>

                    {createError && (
                      <p className="text-xs text-rose-600 font-medium">{createError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={creating}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold bg-[#1E3A2F] hover:bg-[#162C23] disabled:opacity-60 text-amber-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      {creating ? 'Generating 5-Digit Code...' : 'Create Group & Generate Code'}
                    </button>
                  </form>

                  {/* Admin's Created School Groups */}
                  {adminGroups.length > 0 && (
                    <div className="pt-4 border-t border-stone-200">
                      <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2.5">
                        Your School Groups ({adminGroups.length})
                      </p>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {adminGroups.map((group) => (
                          <div
                            key={group.id}
                            className="p-3 rounded-xl bg-stone-50 border border-stone-200/90 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-stone-900 truncate">
                                {group.schoolName}
                              </p>
                              <p className="text-xs text-stone-500 truncate">
                                {group.batchYear} · Code{' '}
                                <span className="font-mono font-semibold text-[#1E3A2F]">
                                  {group.inviteCode}
                                </span>
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  onCopyText(
                                    buildShareLink(group.inviteCode),
                                    `Invite link (${group.inviteCode})`
                                  )
                                }
                                title="Copy invite link"
                                className="p-2 text-stone-600 hover:text-stone-900 bg-white border border-stone-200 hover:bg-stone-100 rounded-lg cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenGroup(group.id, 'admin')}
                                className="px-3 py-1.5 text-xs font-semibold bg-[#1E3A2F] hover:bg-[#162C23] text-amber-50 rounded-lg cursor-pointer"
                              >
                                Open
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
