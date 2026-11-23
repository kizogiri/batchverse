export type GradeId = 'grade10' | 'grade12';

export interface DeskGraffitiNote {
  id: string;
  author: string;
  message: string;
  createdAt: string;
}

export interface StudentProfile {
  fullName: string;
  nickname?: string;
  photoUrl?: string;
  city: string;
  country: string;
  countryFlag?: string;
  profession: string;
  phone?: string;
  email?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  memoryQuote?: string;
  graffiti: DeskGraffitiNote[];
  claimedAt: string;
}

export interface StudentSeat {
  id: string;
  seatNumber: number;
  occupant: StudentProfile | null;
}

export interface TeacherAppreciationNote {
  id: string;
  author: string;
  note: string;
  createdAt: string;
}

export interface TeacherProfile {
  id: string;
  grade?: GradeId;
  name: string;
  subject: string;
  yearsTaught: string;
  photoUrl?: string;
  tributeNote: string;
  appreciationNotes: TeacherAppreciationNote[];
}

export interface ChalkboardConfig {
  title: string;
  year: string;
  announcement: string;
}

export interface ClassroomData {
  id: GradeId;
  label: string;
  chalkboard: ChalkboardConfig;
  teachers: TeacherProfile[];
  seats: StudentSeat[];
}

export interface SchoolGroupDoc {
  id: string;
  schoolName: string;
  batchYear: string;
  inviteCode: string;
  adminUid: string;
  adminName: string;
  isLocked: boolean;
  grade10SeatCount: number;
  grade12SeatCount: number;
  grade10Chalkboard: ChalkboardConfig;
  grade12Chalkboard: ChalkboardConfig;
}

export interface RecentGroupEntry {
  groupId: string;
  inviteCode: string;
  schoolName: string;
  batchYear: string;
}

export interface ToastItem {
  id: string;
  message: string;
  tone?: 'success' | 'info' | 'warning';
}
