import { signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '@/src/firebase';
import { handleFirestoreError, OperationType } from '@/src/services/firestoreErrors';
import {
  ChalkboardConfig,
  DeskGraffitiNote,
  GradeId,
  SchoolGroupDoc,
  StudentProfile,
  TeacherAppreciationNote,
  TeacherProfile,
} from '@/src/types/classroom';
import {
  generateRandomFiveDigitCode,
  hashSeatPin,
  moveSeatPinHash,
  removeSeatPinHash,
  saveSeatPinHash,
} from '@/src/utils/pinCrypto';

export function makeSeatDocId(grade: GradeId, seatNumber: number): string {
  return `${grade}_${seatNumber}`;
}

function makeCleanId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

function clampString(value: string | undefined, maxLen: number): string {
  return (value ?? '').trim().slice(0, maxLen);
}

function timestampMillis(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  return 0;
}

// ============================================================================
// Admin Google Authentication
// ============================================================================
export async function signInAdminWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutAdmin(): Promise<void> {
  await signOut(auth);
}

// ============================================================================
// Group Creation, Invite Code Lookup & Admin Group Listing
// ============================================================================
async function reserveUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const candidate = generateRandomFiveDigitCode();
    const ref = doc(db, 'inviteCodes', candidate);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return candidate;
    }
  }
  throw new Error('Could not generate a unique 5-digit invite code. Please try again.');
}

export async function createSchoolGroup(params: {
  schoolName: string;
  batchYear: string;
  adminUser: User;
}): Promise<SchoolGroupDoc> {
  const schoolName = clampString(params.schoolName, 100);
  const batchYear = clampString(params.batchYear, 40);
  const adminName = clampString(
    params.adminUser.displayName || params.adminUser.email || 'Group Admin',
    80
  );
  const groupId = makeCleanId('grp');

  try {
    const inviteCode = await reserveUniqueInviteCode();
    const grade10Chalkboard: ChalkboardConfig = {
      title: `${schoolName} — Grade 10`,
      year: `${batchYear} • Grade 10 Classroom`,
      announcement: `Welcome back! Share invite code ${inviteCode} with classmates so everyone can claim their desk.`,
    };
    const grade12Chalkboard: ChalkboardConfig = {
      title: `${schoolName} — Grade 12`,
      year: `${batchYear} • Grade 12 Classroom`,
      announcement: `Welcome back! Claim your Grade 12 seat and drop your updated city, profession, and contact links.`,
    };

    const batch = writeBatch(db);
    const groupRef = doc(db, 'groups', groupId);
    const codeRef = doc(db, 'inviteCodes', inviteCode);

    batch.set(groupRef, {
      schoolName,
      batchYear,
      inviteCode,
      adminUid: params.adminUser.uid,
      adminName,
      isLocked: false,
      grade10SeatCount: 20,
      grade12SeatCount: 20,
      grade10Chalkboard,
      grade12Chalkboard,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(codeRef, {
      code: inviteCode,
      groupId,
      schoolName,
      batchYear,
      adminUid: params.adminUser.uid,
      createdAt: serverTimestamp(),
    });

    await batch.commit();

    return {
      id: groupId,
      schoolName,
      batchYear,
      inviteCode,
      adminUid: params.adminUser.uid,
      adminName,
      isLocked: false,
      grade10SeatCount: 20,
      grade12SeatCount: 20,
      grade10Chalkboard,
      grade12Chalkboard,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `groups/${groupId}`);
  }
}

export async function lookupGroupByInviteCode(code: string): Promise<{
  groupId: string;
  schoolName: string;
  batchYear: string;
  code: string;
} | null> {
  const cleanCode = code.trim();
  if (!/^\d{5}$/.test(cleanCode)) return null;
  const path = `inviteCodes/${cleanCode}`;
  try {
    const snap = await getDoc(doc(db, 'inviteCodes', cleanCode));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      code: String(data.code ?? cleanCode),
      groupId: String(data.groupId ?? ''),
      schoolName: String(data.schoolName ?? 'BatchVerse School'),
      batchYear: String(data.batchYear ?? ''),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeAdminGroups(
  adminUid: string,
  onData: (groups: SchoolGroupDoc[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'groups';
  const q = query(collection(db, 'groups'), where('adminUid', '==', adminUid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: SchoolGroupDoc[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          schoolName: String(data.schoolName ?? ''),
          batchYear: String(data.batchYear ?? ''),
          inviteCode: String(data.inviteCode ?? ''),
          adminUid: String(data.adminUid ?? ''),
          adminName: String(data.adminName ?? ''),
          isLocked: Boolean(data.isLocked),
          grade10SeatCount: Number(data.grade10SeatCount ?? 20),
          grade12SeatCount: Number(data.grade12SeatCount ?? 20),
          grade10Chalkboard: data.grade10Chalkboard as ChalkboardConfig,
          grade12Chalkboard: data.grade12Chalkboard as ChalkboardConfig,
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

// ============================================================================
// Live Classroom Subscriptions
// ============================================================================
export function subscribeToGroup(
  groupId: string,
  onData: (group: SchoolGroupDoc | null) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `groups/${groupId}`;
  return onSnapshot(
    doc(db, 'groups', groupId),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const data = snap.data();
      onData({
        id: snap.id,
        schoolName: String(data.schoolName ?? ''),
        batchYear: String(data.batchYear ?? ''),
        inviteCode: String(data.inviteCode ?? ''),
        adminUid: String(data.adminUid ?? ''),
        adminName: String(data.adminName ?? ''),
        isLocked: Boolean(data.isLocked),
        grade10SeatCount: Number(data.grade10SeatCount ?? 20),
        grade12SeatCount: Number(data.grade12SeatCount ?? 20),
        grade10Chalkboard: data.grade10Chalkboard as ChalkboardConfig,
        grade12Chalkboard: data.grade12Chalkboard as ChalkboardConfig,
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export interface CloudSeatRecord {
  id: string;
  grade: GradeId;
  seatNumber: number;
  profile: StudentProfile;
}

export function subscribeToGroupSeats(
  groupId: string,
  onData: (seats: CloudSeatRecord[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `groups/${groupId}/seats`;
  const q = query(collection(db, 'groups', groupId, 'seats'), where('groupId', '==', groupId));
  return onSnapshot(
    q,
    (snapshot) => {
      const records: CloudSeatRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        const grade: GradeId = data.grade === 'grade12' ? 'grade12' : 'grade10';
        return {
          id: d.id,
          grade,
          seatNumber: Number(data.seatNumber ?? 1),
          profile: {
            fullName: String(data.fullName ?? ''),
            nickname: data.nickname ? String(data.nickname) : undefined,
            photoUrl: data.photoUrl ? String(data.photoUrl) : undefined,
            city: String(data.city ?? ''),
            country: String(data.country ?? ''),
            countryFlag: data.countryFlag ? String(data.countryFlag) : undefined,
            profession: String(data.profession ?? ''),
            phone: data.phone ? String(data.phone) : undefined,
            email: data.email ? String(data.email) : undefined,
            facebookUrl: data.facebookUrl ? String(data.facebookUrl) : undefined,
            linkedinUrl: data.linkedinUrl ? String(data.linkedinUrl) : undefined,
            instagramUrl: data.instagramUrl ? String(data.instagramUrl) : undefined,
            memoryQuote: data.memoryQuote ? String(data.memoryQuote) : undefined,
            graffiti: [],
            claimedAt: String(data.claimedAt ?? ''),
          },
        };
      });
      onData(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export function subscribeToGroupTeachers(
  groupId: string,
  onData: (teachers: TeacherProfile[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `groups/${groupId}/teachers`;
  const q = query(collection(db, 'groups', groupId, 'teachers'), where('groupId', '==', groupId));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => {
          const data = d.data();
          const grade: GradeId = data.grade === 'grade12' ? 'grade12' : 'grade10';
          return {
            sortKey: timestampMillis(data.createdAt),
            teacher: {
              id: d.id,
              grade,
              name: String(data.name ?? ''),
              subject: String(data.subject ?? ''),
              yearsTaught: String(data.yearsTaught ?? ''),
              photoUrl: data.photoUrl ? String(data.photoUrl) : undefined,
              tributeNote: String(data.tributeNote ?? ''),
              appreciationNotes: [],
            } as TeacherProfile,
          };
        })
        .sort((a, b) => a.sortKey - b.sortKey)
        .map((entry) => entry.teacher);
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export function subscribeToSeatGraffiti(
  groupId: string,
  seatId: string,
  onData: (notes: DeskGraffitiNote[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `groups/${groupId}/seats/${seatId}/graffiti`;
  const q = query(
    collection(db, 'groups', groupId, 'seats', seatId, 'graffiti'),
    where('groupId', '==', groupId),
    where('seatId', '==', seatId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const notes = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            sortKey: timestampMillis(data.createdAt),
            note: {
              id: d.id,
              author: String(data.author ?? ''),
              message: String(data.message ?? ''),
              createdAt: String(data.createdDate ?? ''),
            } as DeskGraffitiNote,
          };
        })
        .sort((a, b) => a.sortKey - b.sortKey)
        .map((item) => item.note);
      onData(notes);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export function subscribeToTeacherNotes(
  groupId: string,
  teacherId: string,
  onData: (notes: TeacherAppreciationNote[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `groups/${groupId}/teachers/${teacherId}/notes`;
  const q = query(
    collection(db, 'groups', groupId, 'teachers', teacherId, 'notes'),
    where('groupId', '==', groupId),
    where('teacherId', '==', teacherId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const notes = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            sortKey: timestampMillis(data.createdAt),
            note: {
              id: d.id,
              author: String(data.author ?? ''),
              note: String(data.note ?? ''),
              createdAt: String(data.createdDate ?? ''),
            } as TeacherAppreciationNote,
          };
        })
        .sort((a, b) => a.sortKey - b.sortKey)
        .map((item) => item.note);
      onData(notes);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

// ============================================================================
// Seat Mutations (Zero-Login Claim + 4-Digit Personal Edit PIN Proof)
// ============================================================================
function buildSanitizedSeatFields(profile: StudentProfile) {
  return {
    fullName: clampString(profile.fullName, 80),
    nickname: clampString(profile.nickname, 40),
    photoUrl: clampString(profile.photoUrl, 118000),
    city: clampString(profile.city, 60),
    country: clampString(profile.country, 60),
    countryFlag: clampString(profile.countryFlag, 16),
    profession: clampString(profile.profession, 80),
    phone: clampString(profile.phone, 32),
    email: clampString(profile.email, 100),
    facebookUrl: clampString(profile.facebookUrl, 200),
    linkedinUrl: clampString(profile.linkedinUrl, 200),
    instagramUrl: clampString(profile.instagramUrl, 200),
    memoryQuote: clampString(profile.memoryQuote, 100),
  };
}

export async function claimCloudSeat(params: {
  groupId: string;
  grade: GradeId;
  seatNumber: number;
  profile: StudentProfile;
  pin4Digits: string;
}): Promise<{ seatId: string; pinHash: string }> {
  const { groupId, grade, seatNumber, profile, pin4Digits } = params;
  const seatId = makeSeatDocId(grade, seatNumber);
  const path = `groups/${groupId}/seats/${seatId}`;

  try {
    const pinHash = await hashSeatPin(groupId, pin4Digits);
    const batch = writeBatch(db);
    const seatRef = doc(db, 'groups', groupId, 'seats', seatId);
    const secretRef = doc(db, 'groups', groupId, 'seatSecrets', seatId);

    batch.set(seatRef, {
      groupId,
      grade,
      seatNumber,
      ...buildSanitizedSeatFields(profile),
      claimedAt: profile.claimedAt || new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(secretRef, {
      groupId,
      seatId,
      pinHash,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    saveSeatPinHash(groupId, seatId, pinHash);
    return { seatId, pinHash };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Verifies a 4-digit Edit PIN directly against the write-only seatSecrets doc.
 * Returns { valid: true, pinHash } if Firestore rules accept proofPinHash == existing.pinHash,
 * or { valid: false } if rejected with permission-denied.
 */
export async function verifySeatPin(
  groupId: string,
  seatId: string,
  pin4Digits: string
): Promise<{ valid: boolean; pinHash?: string }> {
  const pinHash = await hashSeatPin(groupId, pin4Digits);
  const secretRef = doc(db, 'groups', groupId, 'seatSecrets', seatId);
  try {
    await updateDoc(secretRef, {
      proofPinHash: pinHash,
      updatedAt: serverTimestamp(),
    });
    saveSeatPinHash(groupId, seatId, pinHash);
    return { valid: true, pinHash };
  } catch (error) {
    const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (msg.includes('permission') || msg.includes('insufficient')) {
      return { valid: false };
    }
    handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}/seatSecrets/${seatId}`);
  }
}

export async function updateCloudSeat(params: {
  groupId: string;
  seatId: string;
  profile: StudentProfile;
  pinHash?: string | null;
  isAdmin: boolean;
}): Promise<void> {
  const { groupId, seatId, profile, pinHash, isAdmin } = params;
  const path = `groups/${groupId}/seats/${seatId}`;

  try {
    const batch = writeBatch(db);
    const seatRef = doc(db, 'groups', groupId, 'seats', seatId);

    if (!isAdmin) {
      if (!pinHash) throw new Error('4-digit Edit PIN required to update this seat.');
      const secretRef = doc(db, 'groups', groupId, 'seatSecrets', seatId);
      batch.update(secretRef, {
        proofPinHash: pinHash,
        updatedAt: serverTimestamp(),
      });
    }

    batch.update(seatRef, {
      ...buildSanitizedSeatFields(profile),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function vacateCloudSeat(params: {
  groupId: string;
  seatId: string;
  pinHash?: string | null;
  isAdmin: boolean;
}): Promise<void> {
  const { groupId, seatId, pinHash, isAdmin } = params;
  const path = `groups/${groupId}/seats/${seatId}`;

  try {
    const batch = writeBatch(db);
    const seatRef = doc(db, 'groups', groupId, 'seats', seatId);
    const secretRef = doc(db, 'groups', groupId, 'seatSecrets', seatId);

    if (isAdmin) {
      batch.delete(seatRef);
      batch.delete(secretRef);
    } else {
      if (!pinHash) throw new Error('4-digit Edit PIN required to vacate this seat.');
      batch.update(secretRef, {
        proofPinHash: pinHash,
        updatedAt: serverTimestamp(),
      });
      batch.delete(seatRef);
    }

    await batch.commit();
    removeSeatPinHash(groupId, seatId);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function moveCloudSeat(params: {
  groupId: string;
  grade: GradeId;
  fromSeatId: string;
  toSeatNumber: number;
  profile: StudentProfile;
  pinHash?: string | null;
  isAdmin: boolean;
}): Promise<{ toSeatId: string; generatedAdminPin?: string }> {
  const { groupId, grade, fromSeatId, toSeatNumber, profile, pinHash, isAdmin } = params;
  const toSeatId = makeSeatDocId(grade, toSeatNumber);
  const path = `groups/${groupId}/seats/${toSeatId}`;

  try {
    let targetPinHash = pinHash ?? null;
    let generatedAdminPin: string | undefined;

    if (!targetPinHash) {
      if (!isAdmin) {
        throw new Error('4-digit Edit PIN required to move this seat.');
      }
      generatedAdminPin = String(Math.floor(1000 + Math.random() * 9000));
      targetPinHash = await hashSeatPin(groupId, generatedAdminPin);
    }

    const batch = writeBatch(db);
    const fromSeatRef = doc(db, 'groups', groupId, 'seats', fromSeatId);
    const fromSecretRef = doc(db, 'groups', groupId, 'seatSecrets', fromSeatId);
    const toSeatRef = doc(db, 'groups', groupId, 'seats', toSeatId);
    const toSecretRef = doc(db, 'groups', groupId, 'seatSecrets', toSeatId);

    if (!isAdmin) {
      batch.update(fromSecretRef, {
        proofPinHash: targetPinHash,
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.delete(fromSecretRef);
    }

    batch.delete(fromSeatRef);

    batch.set(toSeatRef, {
      groupId,
      grade,
      seatNumber: toSeatNumber,
      ...buildSanitizedSeatFields(profile),
      claimedAt: profile.claimedAt || new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(toSecretRef, {
      groupId,
      seatId: toSeatId,
      pinHash: targetPinHash,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    if (pinHash) {
      moveSeatPinHash(groupId, fromSeatId, toSeatId, pinHash);
    }
    return { toSeatId, generatedAdminPin };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminResetSeatPin(
  groupId: string,
  seatId: string,
  newPin4Digits: string
): Promise<void> {
  const path = `groups/${groupId}/seatSecrets/${seatId}`;
  try {
    const newHash = await hashSeatPin(groupId, newPin4Digits);
    await updateDoc(doc(db, 'groups', groupId, 'seatSecrets', seatId), {
      pinHash: newHash,
      proofPinHash: newHash,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ============================================================================
// Desk Graffiti & Teacher Notes
// ============================================================================
export async function addCloudGraffiti(
  groupId: string,
  seatId: string,
  author: string,
  message: string
): Promise<void> {
  const noteId = makeCleanId('grf');
  const path = `groups/${groupId}/seats/${seatId}/graffiti/${noteId}`;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'groups', groupId, 'seats', seatId, 'graffiti', noteId), {
      groupId,
      seatId,
      author: clampString(author, 50),
      message: clampString(message, 140),
      createdDate: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function addCloudTeacherNote(
  groupId: string,
  teacherId: string,
  author: string,
  note: string
): Promise<void> {
  const noteId = makeCleanId('tn');
  const path = `groups/${groupId}/teachers/${teacherId}/notes/${noteId}`;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'groups', groupId, 'teachers', teacherId, 'notes', noteId), {
      groupId,
      teacherId,
      author: clampString(author, 50),
      note: clampString(note, 160),
      createdDate: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ============================================================================
// Admin Classroom Controls
// ============================================================================
export async function updateCloudChalkboard(
  groupId: string,
  grade: GradeId,
  chalkboard: ChalkboardConfig
): Promise<void> {
  const path = `groups/${groupId}`;
  const field = grade === 'grade10' ? 'grade10Chalkboard' : 'grade12Chalkboard';
  try {
    await updateDoc(doc(db, 'groups', groupId), {
      [field]: {
        title: clampString(chalkboard.title, 120),
        year: clampString(chalkboard.year, 80),
        announcement: clampString(chalkboard.announcement, 300),
      },
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateCloudSeatCount(
  groupId: string,
  grade: GradeId,
  newSeatCount: number
): Promise<void> {
  const clamped = Math.max(8, Math.min(80, newSeatCount));
  const path = `groups/${groupId}`;
  const field = grade === 'grade10' ? 'grade10SeatCount' : 'grade12SeatCount';
  try {
    await updateDoc(doc(db, 'groups', groupId), {
      [field]: clamped,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleGroupLock(groupId: string, isLocked: boolean): Promise<void> {
  const path = `groups/${groupId}`;
  try {
    await updateDoc(doc(db, 'groups', groupId), {
      isLocked,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function regenerateInviteCode(params: {
  groupId: string;
  oldCode: string;
  schoolName: string;
  batchYear: string;
  adminUid: string;
}): Promise<string> {
  const { groupId, oldCode, schoolName, batchYear, adminUid } = params;
  const path = `groups/${groupId}`;
  try {
    const newCode = await reserveUniqueInviteCode();
    const batch = writeBatch(db);
    if (/^\d{5}$/.test(oldCode)) {
      batch.delete(doc(db, 'inviteCodes', oldCode));
    }
    batch.set(doc(db, 'inviteCodes', newCode), {
      code: newCode,
      groupId,
      schoolName: clampString(schoolName, 100),
      batchYear: clampString(batchYear, 40),
      adminUid,
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'groups', groupId), {
      inviteCode: newCode,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    return newCode;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveCloudTeacher(params: {
  groupId: string;
  grade: GradeId;
  teacherInput: Omit<TeacherProfile, 'id' | 'appreciationNotes'>;
  existingId?: string;
}): Promise<void> {
  const { groupId, grade, teacherInput, existingId } = params;
  const teacherId = existingId || makeCleanId('tch');
  const path = `groups/${groupId}/teachers/${teacherId}`;

  try {
    if (existingId) {
      await updateDoc(doc(db, 'groups', groupId, 'teachers', teacherId), {
        name: clampString(teacherInput.name, 80),
        subject: clampString(teacherInput.subject, 80),
        yearsTaught: clampString(teacherInput.yearsTaught, 40),
        photoUrl: clampString(teacherInput.photoUrl, 118000),
        tributeNote: clampString(teacherInput.tributeNote, 400),
        updatedAt: serverTimestamp(),
      });
    } else {
      const batch = writeBatch(db);
      batch.set(doc(db, 'groups', groupId, 'teachers', teacherId), {
        groupId,
        grade,
        name: clampString(teacherInput.name, 80),
        subject: clampString(teacherInput.subject, 80),
        yearsTaught: clampString(teacherInput.yearsTaught, 40),
        photoUrl: clampString(teacherInput.photoUrl, 118000),
        tributeNote: clampString(teacherInput.tributeNote, 400),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(
      error,
      existingId ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function deleteCloudTeacher(groupId: string, teacherId: string): Promise<void> {
  const path = `groups/${groupId}/teachers/${teacherId}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'groups', groupId, 'teachers', teacherId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
