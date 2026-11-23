import { onAuthStateChanged, User } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EditChalkboardModal, TeacherFormModal } from '@/src/components/AdminModals';
import { ChalkboardStage } from '@/src/components/ChalkboardStage';
import { ClaimSeatModal } from '@/src/components/ClaimSeatModal';
import { Classroom3DView } from '@/src/components/Classroom3DView';
import { ClassroomSeatingGrid } from '@/src/components/ClassroomSeatingGrid';
import { ClassroomToolbar, SeatFilter } from '@/src/components/ClassroomToolbar';
import { Footer } from '@/src/components/Footer';
import { Header } from '@/src/components/Header';
import { InviteCodeModal } from '@/src/components/InviteCodeModal';
import { LobbyView } from '@/src/components/LobbyView';
import { SeatPinModal } from '@/src/components/SeatPinModal';
import { StudentIdModal } from '@/src/components/StudentIdModal';
import { TeacherTributeModal } from '@/src/components/TeacherTributeModal';
import { ToastStack } from '@/src/components/Toast';
import { auth } from '@/src/firebase';
import { useMobileLandscape } from '@/src/hooks/useMobileLandscape';
import {
  addCloudGraffiti,
  addCloudTeacherNote,
  adminResetSeatPin,
  claimCloudSeat,
  CloudSeatRecord,
  createSchoolGroup,
  deleteCloudTeacher,
  lookupGroupByInviteCode,
  makeSeatDocId,
  moveCloudSeat,
  regenerateInviteCode,
  saveCloudTeacher,
  signInAdminWithGoogle,
  signOutAdmin,
  subscribeAdminGroups,
  subscribeToGroup,
  subscribeToGroupSeats,
  subscribeToGroupTeachers,
  subscribeToSeatGraffiti,
  subscribeToTeacherNotes,
  toggleGroupLock,
  updateCloudChalkboard,
  updateCloudSeat,
  updateCloudSeatCount,
  vacateCloudSeat,
  verifySeatPin,
} from '@/src/services/classroomService';
import {
  ChalkboardConfig,
  ClassroomData,
  DeskGraffitiNote,
  GradeId,
  RecentGroupEntry,
  SchoolGroupDoc,
  StudentProfile,
  StudentSeat,
  TeacherAppreciationNote,
  TeacherProfile,
  ToastItem,
} from '@/src/types/classroom';
import { getSeatZoneLabel } from '@/src/utils/locationTime';
import {
  clearAllSessionSeatPins,
  getRecentGroups,
  getSavedGroupSeatPins,
  isValidFiveDigitCode,
  saveRecentGroup,
} from '@/src/utils/pinCrypto';

type ViewMode = 'lobby' | 'cloud';

export default function App() {
  const { isPortraitPhone, isCompactLandscape, viewportWidth, viewportHeight } =
    useMobileLandscape();

  // Navigation & Auth State
  const [viewMode, setViewMode] = useState<ViewMode>('lobby');
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [adminGroups, setAdminGroups] = useState<SchoolGroupDoc[]>([]);
  const [recentGroups, setRecentGroups] = useState<RecentGroupEntry[]>(() => getRecentGroups());

  // Live Cloud Group State
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<SchoolGroupDoc | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudSeats, setCloudSeats] = useState<CloudSeatRecord[]>([]);
  const [cloudTeachers, setCloudTeachers] = useState<TeacherProfile[]>([]);
  const [cloudSeatGraffiti, setCloudSeatGraffiti] = useState<DeskGraffitiNote[]>([]);
  const [cloudTeacherNotes, setCloudTeacherNotes] = useState<TeacherAppreciationNote[]>([]);
  const [savedPinMap, setSavedPinMap] = useState<Record<string, string>>({});
  const [cloudEntryMode, setCloudEntryMode] = useState<'student' | 'admin'>('student');

  // Shared Classroom UI State
  const [activeGrade, setActiveGrade] = useState<GradeId>('grade10');
  const [classroomLayout, setClassroomLayout] = useState<'3d' | '2d'>('3d');
  const [searchQuery, setSearchQuery] = useState('');
  const [seatFilter, setSeatFilter] = useState<SeatFilter>('all');

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showChalkboardModal, setShowChalkboardModal] = useState(false);
  const [claimingSeatId, setClaimingSeatId] = useState<string | null>(null);
  const [inspectingSeatId, setInspectingSeatId] = useState<string | null>(null);
  const [movingSeatId, setMovingSeatId] = useState<string | null>(null);
  const [inspectingTeacherId, setInspectingTeacherId] = useState<string | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<TeacherProfile | null | undefined>(
    undefined
  );
  const [pinPromptState, setPinPromptState] = useState<{
    mode: 'unlock' | 'admin-reset';
    seat: StudentSeat;
  } | null>(null);

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((message: string, tone: ToastItem['tone'] = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleCopyText = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        pushToast(`${label} copied to clipboard`);
      } catch {
        pushToast(`${label}: ${text}`, 'info');
      }
    },
    [pushToast]
  );

  // Listen to Firebase Auth state for Group Admins
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAdminUser(user);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Subscribe to Admin's created school groups when signed in
  useEffect(() => {
    if (!adminUser) {
      setAdminGroups([]);
      return;
    }
    const unsub = subscribeAdminGroups(
      adminUser.uid,
      (groups) => setAdminGroups(groups),
      () => {
        pushToast('Could not load your school groups.', 'warning');
      }
    );
    return () => unsub();
  }, [adminUser, pushToast]);

  // Auto-join if URL contains ?code=12345
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code')?.trim();
    if (!code || !isValidFiveDigitCode(code)) return;

    let cancelled = false;
    setCloudLoading(true);
    lookupGroupByInviteCode(code)
      .then((found) => {
        if (cancelled) return;
        if (found && found.groupId) {
          clearAllSessionSeatPins();
          setSavedPinMap({});
          setCloudEntryMode('student');
          saveRecentGroup({
            groupId: found.groupId,
            inviteCode: found.code,
            schoolName: found.schoolName,
            batchYear: found.batchYear,
          });
          setRecentGroups(getRecentGroups());
          setActiveGroupId(found.groupId);
          setViewMode('cloud');
        } else {
          pushToast(`Invite code ${code} was not found.`, 'warning');
        }
      })
      .catch(() => {
        if (!cancelled) pushToast('Could not look up that invite code.', 'warning');
      })
      .finally(() => {
        if (!cancelled) setCloudLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pushToast]);

  // Subscribe to active Cloud Group, Seats, and Teachers
  useEffect(() => {
    if (viewMode !== 'cloud' || !activeGroupId) {
      setActiveGroup(null);
      setCloudSeats([]);
      setCloudTeachers([]);
      setSavedPinMap({});
      return;
    }

    setCloudLoading(true);
    setSavedPinMap(getSavedGroupSeatPins(activeGroupId));

    const unsubGroup = subscribeToGroup(
      activeGroupId,
      (group) => {
        setActiveGroup(group);
        setCloudLoading(false);
        if (group) {
          saveRecentGroup({
            groupId: group.id,
            inviteCode: group.inviteCode,
            schoolName: group.schoolName,
            batchYear: group.batchYear,
          });
          setRecentGroups(getRecentGroups());
          const url = new URL(window.location.href);
          url.searchParams.set('code', group.inviteCode);
          window.history.replaceState({}, '', url.toString());
        } else {
          pushToast('This school classroom no longer exists.', 'warning');
          setViewMode('lobby');
          setActiveGroupId(null);
        }
      },
      () => {
        setCloudLoading(false);
        pushToast('Unable to connect to this classroom.', 'warning');
      }
    );

    const unsubSeats = subscribeToGroupSeats(
      activeGroupId,
      (records) => setCloudSeats(records),
      () => pushToast('Error loading classroom seats.', 'warning')
    );

    const unsubTeachers = subscribeToGroupTeachers(
      activeGroupId,
      (teachers) => setCloudTeachers(teachers),
      () => pushToast('Error loading subject teachers.', 'warning')
    );

    return () => {
      unsubGroup();
      unsubSeats();
      unsubTeachers();
    };
  }, [viewMode, activeGroupId, pushToast]);

  // Subscribe to Desk Graffiti for the currently inspected seat (Cloud Mode)
  useEffect(() => {
    if (viewMode !== 'cloud' || !activeGroupId || !inspectingSeatId) {
      setCloudSeatGraffiti([]);
      return;
    }
    const unsub = subscribeToSeatGraffiti(
      activeGroupId,
      inspectingSeatId,
      (notes) => setCloudSeatGraffiti(notes),
      () => setCloudSeatGraffiti([])
    );
    return () => unsub();
  }, [viewMode, activeGroupId, inspectingSeatId]);

  // Subscribe to Appreciation Notes for the currently inspected teacher (Cloud Mode)
  useEffect(() => {
    if (viewMode !== 'cloud' || !activeGroupId || !inspectingTeacherId) {
      setCloudTeacherNotes([]);
      return;
    }
    const unsub = subscribeToTeacherNotes(
      activeGroupId,
      inspectingTeacherId,
      (notes) => setCloudTeacherNotes(notes),
      () => setCloudTeacherNotes([])
    );
    return () => unsub();
  }, [viewMode, activeGroupId, inspectingTeacherId]);

  // Close active modal on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pinPromptState) setPinPromptState(null);
      else if (editingTeacher !== undefined) setEditingTeacher(undefined);
      else if (showInviteModal) setShowInviteModal(false);
      else if (showChalkboardModal) setShowChalkboardModal(false);
      else if (claimingSeatId) setClaimingSeatId(null);
      else if (inspectingSeatId) setInspectingSeatId(null);
      else if (inspectingTeacherId) setInspectingTeacherId(null);
      else if (movingSeatId) setMovingSeatId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    pinPromptState,
    editingTeacher,
    showInviteModal,
    showChalkboardModal,
    claimingSeatId,
    inspectingSeatId,
    inspectingTeacherId,
    movingSeatId,
  ]);

  // Build ClassroomData for current grade
  const currentClassroom: ClassroomData = useMemo(() => {
    const seatCount =
      activeGrade === 'grade10'
        ? activeGroup?.grade10SeatCount ?? 20
        : activeGroup?.grade12SeatCount ?? 20;

    const chalkboard: ChalkboardConfig =
      activeGrade === 'grade10'
        ? activeGroup?.grade10Chalkboard ?? {
            title: `${activeGroup?.schoolName ?? 'Loading Classroom...'} — Grade 10`,
            year: activeGroup?.batchYear ?? '',
            announcement: '',
          }
        : activeGroup?.grade12Chalkboard ?? {
            title: `${activeGroup?.schoolName ?? 'Loading Classroom...'} — Grade 12`,
            year: activeGroup?.batchYear ?? '',
            announcement: '',
          };

    const occupiedByNum = new Map<number, CloudSeatRecord>();
    for (const rec of cloudSeats) {
      if (rec.grade === activeGrade) {
        occupiedByNum.set(rec.seatNumber, rec);
      }
    }

    const seats: StudentSeat[] = Array.from({ length: seatCount }, (_, idx) => {
      const seatNumber = idx + 1;
      const docId = makeSeatDocId(activeGrade, seatNumber);
      const found = occupiedByNum.get(seatNumber);
      return {
        id: docId,
        seatNumber,
        occupant: found ? found.profile : null,
      };
    });

    const teachers = cloudTeachers.filter((t) => (t.grade ?? 'grade10') === activeGrade);

    return {
      id: activeGrade,
      label: activeGrade === 'grade10' ? 'Grade 10 Classroom' : 'Grade 12 Classroom',
      chalkboard,
      teachers,
      seats,
    };
  }, [activeGrade, activeGroup, cloudSeats, cloudTeachers]);

  const isAdminMode = Boolean(
    viewMode === 'cloud' &&
      cloudEntryMode === 'admin' &&
      adminUser &&
      activeGroup &&
      adminUser.uid === activeGroup.adminUid
  );
  const gradeShortLabel = activeGrade === 'grade10' ? 'Grade 10' : 'Grade 12';

  const canModifySeat = useCallback(
    (seatId: string) => {
      if (isAdminMode) return true;
      return Boolean(savedPinMap[seatId]);
    },
    [isAdminMode, savedPinMap]
  );

  const searchMatchCount = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return 0;
    return currentClassroom.seats.filter((seat) => {
      if (!seat.occupant) return false;
      const { fullName, nickname, city, country, profession } = seat.occupant;
      return (
        fullName.toLowerCase().includes(q) ||
        (nickname?.toLowerCase().includes(q) ?? false) ||
        city.toLowerCase().includes(q) ||
        country.toLowerCase().includes(q) ||
        profession.toLowerCase().includes(q)
      );
    }).length;
  }, [currentClassroom.seats, searchQuery]);

  const claimingSeat = useMemo(() => {
    if (!claimingSeatId) return null;
    const index = currentClassroom.seats.findIndex((s) => s.id === claimingSeatId);
    if (index === -1) return null;
    return {
      seat: currentClassroom.seats[index],
      zoneLabel: getSeatZoneLabel(index, currentClassroom.seats.length),
    };
  }, [claimingSeatId, currentClassroom.seats]);

  const inspectingSeat = useMemo(() => {
    if (!inspectingSeatId) return null;
    const index = currentClassroom.seats.findIndex((s) => s.id === inspectingSeatId);
    if (index === -1) return null;
    return {
      seat: currentClassroom.seats[index],
      zoneLabel: getSeatZoneLabel(index, currentClassroom.seats.length),
    };
  }, [inspectingSeatId, currentClassroom.seats]);

  const inspectingTeacher = useMemo(() => {
    if (!inspectingTeacherId) return null;
    const found = currentClassroom.teachers.find((t) => t.id === inspectingTeacherId);
    if (!found) return null;
    return { ...found, appreciationNotes: cloudTeacherNotes };
  }, [inspectingTeacherId, currentClassroom.teachers, cloudTeacherNotes]);

  // ============================================================================
  // Lobby & Navigation Handlers
  // ============================================================================
  const handleReturnToLobby = () => {
    clearAllSessionSeatPins();
    setSavedPinMap({});
    setCloudEntryMode('student');
    setViewMode('lobby');
    setActiveGroupId(null);
    setClaimingSeatId(null);
    setInspectingSeatId(null);
    setMovingSeatId(null);
    setInspectingTeacherId(null);
    setSearchQuery('');
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    window.history.replaceState({}, '', url.toString());
  };

  const handleJoinByCode = async (code: string): Promise<string | null> => {
    try {
      const found = await lookupGroupByInviteCode(code);
      if (!found || !found.groupId) {
        return `No school classroom found with invite code ${code}. Double-check the 5 digits.`;
      }
      // Joining via 5-digit invite code always starts in strict Student Mode with all seats locked
      clearAllSessionSeatPins();
      setSavedPinMap({});
      setCloudEntryMode('student');
      saveRecentGroup({
        groupId: found.groupId,
        inviteCode: found.code,
        schoolName: found.schoolName,
        batchYear: found.batchYear,
      });
      setRecentGroups(getRecentGroups());
      setActiveGroupId(found.groupId);
      setActiveGrade('grade10');
      setViewMode('cloud');
      pushToast(`Entered ${found.schoolName}`);
      return null;
    } catch {
      return 'Unable to reach the classroom server right now. Please try again.';
    }
  };

  const handleOpenGroup = (groupId: string, entryMode: 'student' | 'admin') => {
    if (entryMode === 'student') {
      clearAllSessionSeatPins();
      setSavedPinMap({});
    }
    setCloudEntryMode(entryMode);
    setActiveGroupId(groupId);
    setActiveGrade('grade10');
    setViewMode('cloud');
  };

  const handleAdminSignIn = async () => {
    const user = await signInAdminWithGoogle();
    setCloudEntryMode('admin');
    pushToast(`Signed in as ${user.displayName || user.email}`);
  };

  const handleAdminSignOut = async () => {
    await signOutAdmin();
    clearAllSessionSeatPins();
    setSavedPinMap({});
    setCloudEntryMode('student');
    pushToast('Signed out', 'info');
  };

  const handleCreateGroup = async (schoolName: string, batchYear: string) => {
    if (!adminUser) {
      throw new Error('Please sign in with Google first.');
    }
    const created = await createSchoolGroup({
      schoolName,
      batchYear,
      adminUser,
    });
    saveRecentGroup({
      groupId: created.id,
      inviteCode: created.inviteCode,
      schoolName: created.schoolName,
      batchYear: created.batchYear,
    });
    setRecentGroups(getRecentGroups());
    setCloudEntryMode('admin');
    setActiveGroupId(created.id);
    setActiveGrade('grade10');
    setViewMode('cloud');
    setShowInviteModal(true);
    pushToast(`Group created! 5-digit Invite Code: ${created.inviteCode}`);
  };

  // ============================================================================
  // Classroom Action Handlers
  // ============================================================================
  const handleSelectGrade = (grade: GradeId) => {
    setActiveGrade(grade);
    setClaimingSeatId(null);
    setInspectingSeatId(null);
    setMovingSeatId(null);
    setInspectingTeacherId(null);
  };

  const handleSaveSeat = async (
    seatId: string,
    profile: StudentProfile,
    pin4Digits?: string
  ) => {
    if (!activeGroupId) return;
    const seat = currentClassroom.seats.find((s) => s.id === seatId);
    if (!seat) return;

    if (seat.occupant === null) {
      if (!pin4Digits) {
        throw new Error('Please enter a 4-digit Edit PIN to claim this seat.');
      }
      const { pinHash } = await claimCloudSeat({
        groupId: activeGroupId,
        grade: activeGrade,
        seatNumber: seat.seatNumber,
        profile,
        pin4Digits,
      });
      setSavedPinMap((prev) => ({ ...prev, [seatId]: pinHash }));
      setClaimingSeatId(null);
      pushToast(
        `Seat #${String(seat.seatNumber).padStart(2, '0')} claimed & locked with your 4-digit PIN!`
      );
    } else {
      if (!canModifySeat(seatId)) {
        throw new Error('Only this student (with their 4-digit PIN) can edit this seat.');
      }
      await updateCloudSeat({
        groupId: activeGroupId,
        seatId,
        profile,
        pinHash: savedPinMap[seatId] ?? null,
        isAdmin: isAdminMode,
      });
      setClaimingSeatId(null);
      pushToast(`${profile.fullName}'s desk updated!`);
    }
  };

  const handleVacateSeat = async (seatId: string) => {
    if (!canModifySeat(seatId)) {
      pushToast('You can only vacate your own seat.', 'warning');
      return;
    }

    if (!activeGroupId) return;
    try {
      await vacateCloudSeat({
        groupId: activeGroupId,
        seatId,
        pinHash: savedPinMap[seatId] ?? null,
        isAdmin: isAdminMode,
      });
      setSavedPinMap((prev) => {
        const next = { ...prev };
        delete next[seatId];
        return next;
      });
      setInspectingSeatId(null);
      pushToast('Desk vacated and open for claiming', 'info');
    } catch {
      pushToast('Could not vacate seat. Please verify your 4-digit Edit PIN.', 'warning');
    }
  };

  const handleMoveSeat = async (fromSeatId: string, toSeatId: string) => {
    if (fromSeatId === toSeatId) {
      setMovingSeatId(null);
      return;
    }

    const sourceSeat = currentClassroom.seats.find((s) => s.id === fromSeatId);
    const targetSeat = currentClassroom.seats.find((s) => s.id === toSeatId);

    if (!sourceSeat || !sourceSeat.occupant || !targetSeat) {
      setMovingSeatId(null);
      return;
    }

    if (targetSeat.occupant !== null) {
      pushToast(
        `Seat #${String(targetSeat.seatNumber).padStart(2, '0')} is already occupied — choose a vacant seat`,
        'info'
      );
      return;
    }

    if (!activeGroupId) return;
    if (!canModifySeat(fromSeatId)) {
      pushToast('You can only move your own seat.', 'warning');
      setMovingSeatId(null);
      return;
    }

    try {
      const existingPinHash = savedPinMap[fromSeatId] ?? null;
      const { toSeatId: newId, generatedAdminPin } = await moveCloudSeat({
        groupId: activeGroupId,
        grade: activeGrade,
        fromSeatId,
        toSeatNumber: targetSeat.seatNumber,
        profile: sourceSeat.occupant,
        pinHash: existingPinHash,
        isAdmin: isAdminMode,
      });

      if (existingPinHash) {
        setSavedPinMap((prev) => {
          const next = { ...prev };
          delete next[fromSeatId];
          next[newId] = existingPinHash;
          return next;
        });
      }
      setMovingSeatId(null);
      if (generatedAdminPin) {
        pushToast(
          `Moved ${sourceSeat.occupant.fullName} to Seat #${String(
            targetSeat.seatNumber
          ).padStart(2, '0')} (New Edit PIN: ${generatedAdminPin})`
        );
      } else {
        pushToast(
          `Moved ${sourceSeat.occupant.fullName} to Seat #${String(
            targetSeat.seatNumber
          ).padStart(2, '0')}`
        );
      }
    } catch {
      setMovingSeatId(null);
      pushToast('Could not move seat. Check that the target seat is vacant.', 'warning');
    }
  };

  const handleSubmitSeatPin = async (pin4Digits: string): Promise<string | null> => {
    if (!pinPromptState || !activeGroupId) return null;
    const { mode, seat } = pinPromptState;

    if (mode === 'unlock') {
      try {
        const result = await verifySeatPin(activeGroupId, seat.id, pin4Digits);
        if (!result.valid || !result.pinHash) {
          return 'Incorrect 4-digit Edit PIN. Try again or ask your Group Admin to reset it.';
        }
        setSavedPinMap((prev) => ({ ...prev, [seat.id]: result.pinHash! }));
        setPinPromptState(null);
        pushToast(`Unlocked Seat #${String(seat.seatNumber).padStart(2, '0')} on this device!`);
        return null;
      } catch {
        return 'Could not verify PIN right now. Please try again.';
      }
    }

    // Admin PIN Reset
    try {
      await adminResetSeatPin(activeGroupId, seat.id, pin4Digits);
      setPinPromptState(null);
      pushToast(
        `Updated Edit PIN for Seat #${String(seat.seatNumber).padStart(2, '0')} to ${pin4Digits}`
      );
      return null;
    } catch {
      return 'Could not reset PIN. Make sure you are signed in as the Group Admin.';
    }
  };

  const handleAddGraffiti = async (seatId: string, author: string, message: string) => {
    if (!activeGroupId) return;
    await addCloudGraffiti(activeGroupId, seatId, author, message);
    pushToast('Memory note added to desk wall!');
  };

  const handleSaveChalkboard = async (config: ChalkboardConfig) => {
    if (!activeGroupId) return;
    await updateCloudChalkboard(activeGroupId, activeGrade, config);
    setShowChalkboardModal(false);
    pushToast('Chalkboard updated!');
  };

  const handleSaveTeacher = async (
    teacherInput: Omit<TeacherProfile, 'id' | 'appreciationNotes'>,
    existingId?: string
  ) => {
    if (!activeGroupId) return;
    await saveCloudTeacher({
      groupId: activeGroupId,
      grade: activeGrade,
      teacherInput,
      existingId,
    });
    setEditingTeacher(undefined);
    pushToast(existingId ? 'Teacher profile updated!' : 'Subject teacher added to podium!');
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    if (!activeGroupId) return;
    await deleteCloudTeacher(activeGroupId, teacherId);
    pushToast('Teacher removed from podium', 'info');
  };

  const handleAddTeacherAppreciation = async (
    teacherId: string,
    author: string,
    note: string
  ) => {
    if (!activeGroupId) return;
    await addCloudTeacherNote(activeGroupId, teacherId, author, note);
    pushToast('Appreciation note posted!');
  };

  const handleAddDeskRow = async () => {
    if (!activeGroupId || !activeGroup) return;
    const currentCount =
      activeGrade === 'grade10' ? activeGroup.grade10SeatCount : activeGroup.grade12SeatCount;
    if (currentCount >= 80) {
      pushToast('Maximum 80 seats (20 benches) reached for this classroom.', 'info');
      return;
    }
    await updateCloudSeatCount(activeGroupId, activeGrade, currentCount + 4);
    pushToast('Added 4 new seats (1 bench row)');
  };

  const handleRemoveDeskRow = async () => {
    if (!activeGroupId || !activeGroup) return;
    const currentCount =
      activeGrade === 'grade10' ? activeGroup.grade10SeatCount : activeGroup.grade12SeatCount;
    if (currentCount <= 8) return;
    await updateCloudSeatCount(activeGroupId, activeGrade, currentCount - 4);
    pushToast('Removed last bench row', 'info');
  };

  const handleRegenerateInviteCode = async () => {
    if (!activeGroup || !adminUser) return;
    const newCode = await regenerateInviteCode({
      groupId: activeGroup.id,
      oldCode: activeGroup.inviteCode,
      schoolName: activeGroup.schoolName,
      batchYear: activeGroup.batchYear,
      adminUid: adminUser.uid,
    });
    pushToast(`Generated new 5-digit Invite Code: ${newCode}`);
  };

  const handleToggleLock = async () => {
    if (!activeGroup) return;
    const nextLocked = !activeGroup.isLocked;
    await toggleGroupLock(activeGroup.id, nextLocked);
    pushToast(nextLocked ? 'Classroom locked' : 'Classroom unlocked', 'info');
  };

  const handleExportJson = () => {
    const payload = {
      group: activeGroup,
      seats: cloudSeats,
      teachers: cloudTeachers,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batchverse-directory-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    pushToast('Batch directory exported as JSON');
  };

  // ============================================================================
  // Render Lobby Gate
  // ============================================================================
  if (viewMode === 'lobby') {
    return (
      <>
        <LobbyView
          adminUser={adminUser}
          authReady={authReady}
          adminGroups={adminGroups}
          recentGroups={recentGroups}
          onJoinByCode={handleJoinByCode}
          onOpenGroup={handleOpenGroup}
          onAdminSignIn={handleAdminSignIn}
          onAdminSignOut={handleAdminSignOut}
          onCreateGroup={handleCreateGroup}
          onCopyText={handleCopyText}
        />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // ============================================================================
  // Render Active Cloud Classroom
  // ============================================================================
  const stageStyle = isPortraitPhone
    ? {
        width: `${viewportHeight}px`,
        height: `${viewportWidth}px`,
      }
    : undefined;

  return (
    <div
      style={stageStyle}
      className={
        isPortraitPhone
          ? `mobile-landscape-stage flex flex-col classroom-floor ${
              classroomLayout === '3d' ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'
            }`
          : 'min-h-screen flex flex-col classroom-floor'
      }
    >
      {classroomLayout === '3d' && !(cloudLoading && !activeGroup) ? (
        <Classroom3DView
          classroom={currentClassroom}
          activeGrade={activeGrade}
          onSelectGrade={handleSelectGrade}
          activeGroup={activeGroup}
          isAdminMode={isAdminMode}
          isLocked={Boolean(activeGroup?.isLocked)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          matchCount={searchMatchCount}
          movingSeatId={movingSeatId}
          onCancelMoveMode={() => setMovingSeatId(null)}
          canModifySeat={canModifySeat}
          onSelectOccupiedSeat={(seatId) => setInspectingSeatId(seatId)}
          onClaimEmptySeat={(seatId) => setClaimingSeatId(seatId)}
          onMoveSeat={handleMoveSeat}
          onSelectTeacher={(teacherId) => setInspectingTeacherId(teacherId)}
          onEditChalkboard={() => setShowChalkboardModal(true)}
          onAddTeacher={() => setEditingTeacher(null)}
          onAddDeskRow={handleAddDeskRow}
          onOpenInviteModal={() => setShowInviteModal(true)}
          onSwitchTo2D={() => setClassroomLayout('2d')}
          onReturnToLobby={handleReturnToLobby}
          isRotatedLandscape={isPortraitPhone}
          isCompactLandscape={isCompactLandscape}
        />
      ) : (
        <>
          <Header
            activeGrade={activeGrade}
            onSelectGrade={handleSelectGrade}
            classroom={currentClassroom}
            activeGroup={activeGroup}
            adminUser={adminUser}
            isAdminMode={isAdminMode}
            onAdminSignIn={() => {
              if (adminUser && activeGroup && adminUser.uid === activeGroup.adminUid) {
                setCloudEntryMode('admin');
                pushToast('Admin Mode enabled for your school group');
                return;
              }
              handleAdminSignIn().catch(() =>
                pushToast('Google Sign-In popup was cancelled.', 'info')
              );
            }}
            onOpenInviteModal={() => setShowInviteModal(true)}
            onSwitchTo3D={() => setClassroomLayout('3d')}
            onReturnToLobby={handleReturnToLobby}
          />

          <main className="flex-1">
            {cloudLoading && !activeGroup ? (
              <div className="max-w-3xl mx-auto px-6 py-20 text-center">
                <p className="text-sm font-medium text-stone-600">Loading classroom...</p>
              </div>
            ) : (
              <>
                <ClassroomToolbar
                  classroom={currentClassroom}
                  activeGroup={activeGroup}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  matchCount={searchMatchCount}
                  seatFilter={seatFilter}
                  onSeatFilterChange={setSeatFilter}
                  isAdminMode={isAdminMode}
                  onEditChalkboard={() => setShowChalkboardModal(true)}
                  onAddTeacher={() => setEditingTeacher(null)}
                  onAddDeskRow={handleAddDeskRow}
                  onRemoveDeskRow={handleRemoveDeskRow}
                  onExportJson={handleExportJson}
                  onOpenInviteModal={() => setShowInviteModal(true)}
                />

                <div className="max-w-[1360px] mx-auto px-2.5 sm:px-6 lg:px-8 pt-2">
                  <ChalkboardStage
                    chalkboard={currentClassroom.chalkboard}
                    teachers={currentClassroom.teachers}
                    isAdminMode={isAdminMode}
                    onEditChalkboard={() => setShowChalkboardModal(true)}
                    onSelectTeacher={(teacher) => setInspectingTeacherId(teacher.id)}
                    onAddTeacher={() => setEditingTeacher(null)}
                    onEditTeacher={(teacher) => setEditingTeacher(teacher)}
                    onDeleteTeacher={handleDeleteTeacher}
                  />

                  <ClassroomSeatingGrid
                    seats={currentClassroom.seats}
                    searchQuery={searchQuery}
                    seatFilter={seatFilter}
                    movingSeatId={movingSeatId}
                    isLocked={Boolean(activeGroup?.isLocked)}
                    isAdmin={isAdminMode}
                    canModifySeat={canModifySeat}
                    onCancelMoveMode={() => setMovingSeatId(null)}
                    onSelectOccupiedSeat={(seat) => setInspectingSeatId(seat.id)}
                    onClaimEmptySeat={(seat) => setClaimingSeatId(seat.id)}
                    onMoveSeat={handleMoveSeat}
                  />
                </div>
              </>
            )}
          </main>

          <Footer activeGroup={activeGroup} wide />
        </>
      )}

      {/* Modals */}
      {claimingSeat && (
        <ClaimSeatModal
          seat={claimingSeat.seat}
          gradeLabel={gradeShortLabel}
          zoneLabel={claimingSeat.zoneLabel}
          onClose={() => setClaimingSeatId(null)}
          onSave={handleSaveSeat}
        />
      )}

      {inspectingSeat && inspectingSeat.seat.occupant && (
        <StudentIdModal
          seat={inspectingSeat.seat}
          graffitiNotes={cloudSeatGraffiti}
          gradeShortLabel={gradeShortLabel}
          zoneLabel={inspectingSeat.zoneLabel}
          canModifySeat={canModifySeat(inspectingSeat.seat.id)}
          isAdmin={isAdminMode}
          onClose={() => setInspectingSeatId(null)}
          onEditSeat={(seat) => {
            if (!canModifySeat(seat.id)) return;
            setInspectingSeatId(null);
            setClaimingSeatId(seat.id);
          }}
          onStartMoveSeat={(seatId) => {
            if (!canModifySeat(seatId)) return;
            setInspectingSeatId(null);
            setMovingSeatId(seatId);
          }}
          onVacateSeat={handleVacateSeat}
          onRequestUnlockPin={(seat) => {
            setPinPromptState({ mode: 'unlock', seat });
          }}
          onAdminResetPin={(seat) => {
            setPinPromptState({ mode: 'admin-reset', seat });
          }}
          onAddGraffiti={handleAddGraffiti}
          onCopySuccess={(msg) => pushToast(msg)}
        />
      )}

      {pinPromptState && pinPromptState.seat.occupant && (
        <SeatPinModal
          mode={pinPromptState.mode}
          studentName={pinPromptState.seat.occupant.fullName}
          seatNumber={pinPromptState.seat.seatNumber}
          onClose={() => setPinPromptState(null)}
          onSubmitPin={handleSubmitSeatPin}
        />
      )}

      {showInviteModal && activeGroup && (
        <InviteCodeModal
          group={activeGroup}
          isAdmin={isAdminMode}
          onClose={() => setShowInviteModal(false)}
          onCopyText={handleCopyText}
          onRegenerateCode={handleRegenerateInviteCode}
          onToggleLock={handleToggleLock}
        />
      )}

      {inspectingTeacher && (
        <TeacherTributeModal
          teacher={inspectingTeacher}
          isAdminMode={isAdminMode}
          onClose={() => setInspectingTeacherId(null)}
          onAddAppreciation={handleAddTeacherAppreciation}
          onEditTeacher={(teacher) => setEditingTeacher(teacher)}
          onDeleteTeacher={handleDeleteTeacher}
        />
      )}

      {showChalkboardModal && (
        <EditChalkboardModal
          gradeLabel={currentClassroom.label}
          chalkboard={currentClassroom.chalkboard}
          onClose={() => setShowChalkboardModal(false)}
          onSave={handleSaveChalkboard}
        />
      )}

      {editingTeacher !== undefined && (
        <TeacherFormModal
          gradeLabel={currentClassroom.label}
          teacher={editingTeacher}
          onClose={() => setEditingTeacher(undefined)}
          onSave={handleSaveTeacher}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
