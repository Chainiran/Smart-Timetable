// FIX: Add a centralized 'ColorBy' type to be used across all components that need it.
// This resolves TypeScript errors caused by multiple, unrelated local definitions of the same type name.
export type ColorBy = 'subjectGroup' | 'teacher' | 'classGroup' | 'subject';

export interface School {
  id_school: string;
  name: string;
  logoUrl?: string;
}

export interface Teacher {
  id: string;
  id_school: string;
  prefix: string;
  name: string;
  subjectGroup: string;
  isActive: boolean;
  deletedAt?: string | null;
}

export interface ClassGroup {
  id:string;
  id_school: string;
  name: string;
  gradeLevel: string;
  parentId?: string;
  isActive: boolean;
  deletedAt?: string | null;
}

export interface Subject {
  code: string;
  id_school: string;
  name: string;
  subjectGroup: string;
  semester: number;
  gradeLevel: string;
  credits: number;
  periodsPerWeek: number;
  isActive: boolean;
  deletedAt?: string | null;
}

export interface Location {
  id: string;
  id_school: string;
  name: string;
  responsibleTeacherId?: string;
  isActive: boolean;
  deletedAt?: string | null;
}

export interface TimeSlot {
  id: string;
  id_school: string;
  period: number;
  startTime: string;
  endTime: string;
  deletedAt?: string | null;
}

export interface ScheduleEntry {
  id: string;
  id_school: string;
  classGroupId?: string;
  day: string;
  timeSlotId: string;
  subjectCode?: string;
  customActivity?: string;
  teacherIds: string[];
  locationId?: string;
  academicYear: string;
  semester: number;
}

export interface SchoolInfo {
  id_school: string;
  name: string;
  address: string;
  phone: string;
  logoUrl: string;
  academicYear: string;
  currentSemester: number;
  features: {
    [key: string]: boolean;
    AIChatbot: boolean;
    Substitutions: boolean;
    TeacherAttendance: boolean;
  };
}

export interface User {
  id: number;
  id_school: string | null;
  username: string;
  role: 'super' | 'admin';
}

export interface PublishingStatus {
    id: number;
    id_school: string;
    academicYear: string;
    semester: number;
    isPublished: boolean;
}

export interface Substitution {
    id: string;
    id_school: string;
    substitutionDate: string; // YYYY-MM-DD
    absentTeacherId: string;
    substituteTeacherId: string;
    originalScheduleEntryId: string;
    reason: string;
    notes?: string;
}

export interface DisplaySubstitution {
    id: string;
    originalScheduleEntryId: string;
    date: string; // Formatted date string
    absentTeacherName: string;
    reason: string;
    substituteTeacherId: string;
    substituteTeacherName: string;
    subjectCode: string;
    subjectName: string;
    classGroupName: string;
    locationName: string;
    timeSlotPeriod: number;
    startTime: string;
    endTime: string;
    notes?: string;
}

export interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (username: string, password: string, id_school: string) => Promise<{ success: boolean; message: string; }>;
    systemLogin: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
    logout: () => void;
    loading: boolean;
}


export type ConflictInfo = { type: 'teacher' | 'location', conflictingEntry: ScheduleEntry, message: string };

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    conflict?: ConflictInfo;
    item?: T;
    items?: T[];
}

export type MasterDataType = 'teachers' | 'classGroups' | 'subjects' | 'locations' | 'timeSlots';

export interface ClassGroupSubject {
    id: number;
    classGroupId: string;
    subjectCode: string;
}

export interface TeacherAttendance {
    id: string;
    originalScheduleEntryId: string;
    attendanceDate: string;
    isPresent: boolean;
    substituteTeacherId: string | null;
    notes: string | null;
    // --- Stamped Data ---
    day: string;
    timeSlotPeriod: number;
    startTime: string;
    endTime: string;
    subjectCode: string | null;
    subjectName: string | null;
    customActivity: string | null;
    originalTeacherIds: string[];
    originalTeacherNames: string[];
    classGroupId: string | null;
    classGroupName: string | null;
    locationId: string | null;
    locationName: string | null;
}

export interface AttendanceStat {
    teacherId: string;
    teacherName: string;
    subjectStats: {
        [subjectCodeOrActivity: string]: {
            subjectName: string;
            totalScheduled: number;
            taughtBySelf: number;
            taughtBySubstitute: number;
        }
    }
}

export interface SubstitutionStat {
    id: string;
    name: string;
    taughtAsSubstitute: number;
    wasSubstitutedFor: number;
}

export interface Announcement {
  id: string;
  id_school: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}


export interface TimetableContextType {
    schoolId: string; // Add schoolId to context
    teachers: Teacher[];
    classGroups: ClassGroup[];
    subjects: Subject[];
    locations: Location[];
    timeSlots: TimeSlot[];
    schedule: ScheduleEntry[];
    schoolInfo: SchoolInfo | null;
    publishingStatus: PublishingStatus[];
    substitutions: DisplaySubstitution[];
    announcements: Announcement[];
    loading: boolean;
    error: string | null;

    activeTeachers: Teacher[];
    activeClassGroups: ClassGroup[];
    activeSubjects: Subject[];
    activeLocations: Location[];

    archivedTeachers: Teacher[];
    archivedClassGroups: ClassGroup[];
    archivedSubjects: Subject[];
    archivedLocations: Location[];
    archivedTimeSlots: TimeSlot[];
    fetchArchivedData: (dataType: MasterDataType) => Promise<void>;

    fetchPublishingStatus: () => Promise<void>;
    updatePublishingStatus: (status: PublishingStatus) => Promise<ApiResponse<PublishingStatus>>;
    updateSchoolInfo: (info: Partial<SchoolInfo>) => Promise<ApiResponse<SchoolInfo>>;
    addOrUpdateTeacher: (teacher: Omit<Teacher, 'id' | 'id_school'>, originalId?: string) => Promise<ApiResponse<Teacher>>;
    deleteTeacher: (id: string) => Promise<ApiResponse<Teacher>>;
    restoreTeacher: (id: string) => Promise<ApiResponse<Teacher>>;
    addOrUpdateSubject: (subject: Omit<Subject, 'id_school'>, originalCode?: string) => Promise<ApiResponse<Subject>>;
    deleteSubject: (code: string) => Promise<ApiResponse<Subject>>;
    restoreSubject: (code: string) => Promise<ApiResponse<Subject>>;
    addOrUpdateClassGroup: (classGroup: Omit<ClassGroup, 'id' | 'id_school'>, originalId?: string) => Promise<ApiResponse<ClassGroup>>;
    deleteClassGroup: (id: string) => Promise<ApiResponse<ClassGroup>>;
    restoreClassGroup: (id: string) => Promise<ApiResponse<ClassGroup>>;
    addOrUpdateLocation: (location: Omit<Location, 'id' | 'id_school'>, originalId?: string) => Promise<ApiResponse<Location>>;
    deleteLocation: (id: string) => Promise<ApiResponse<Location>>;
    restoreLocation: (id: string) => Promise<ApiResponse<Location>>;
    addOrUpdateTimeSlot: (timeSlot: Omit<TimeSlot, 'id_school'>, originalId?: string) => Promise<ApiResponse<TimeSlot>>;
    deleteTimeSlot: (id: string) => Promise<ApiResponse<TimeSlot>>;
    restoreTimeSlot: (id: string) => Promise<ApiResponse<TimeSlot>>;
    addScheduleEntry: (entry: Omit<ScheduleEntry, 'id' | 'id_school' | 'academicYear' | 'semester'>) => Promise<ApiResponse<ScheduleEntry>>;
    updateScheduleEntry: (entry: Omit<ScheduleEntry, 'id_school' | 'academicYear' | 'semester'>) => Promise<ApiResponse<ScheduleEntry>>;
    deleteScheduleEntry: (id: string) => Promise<ApiResponse>;
    deleteConflictingEntryAndSave: (entryData: Omit<ScheduleEntry, 'id' | 'id_school' | 'academicYear' | 'semester'> | Omit<ScheduleEntry, 'id_school' | 'academicYear' | 'semester'>, conflictingEntryId: string) => Promise<ApiResponse<ScheduleEntry>>;
    addTeachersInBulk: (newTeachers: Omit<Teacher, 'id' | 'id_school'>[]) => Promise<ApiResponse>;
    addClassGroupsInBulk: (newClassGroups: (Omit<ClassGroup, 'id' | 'id_school' | 'parentId'> & { parentName?: string })[]) => Promise<ApiResponse>;
    addSubjectsInBulk: (newSubjects: Omit<Subject, 'id_school'>[]) => Promise<ApiResponse>;
    addLocationsInBulk: (newLocations: (Omit<Location, 'id' | 'id_school' | 'responsibleTeacherId'> & { responsibleTeacherName?: string})[]) => Promise<ApiResponse>;
    addTimeSlotsInBulk: (newTimeSlots: Omit<TimeSlot, 'id_school'>[]) => Promise<ApiResponse>;
    addBulkSpecialActivity: (activityData: {
        customActivity: string;
        days: string[];
        timeSlotIds: string[];
        classGroupIds: string[];
        teacherIds: string[];
        locationId: string;
    }) => Promise<ApiResponse>;
    // User Management
    users: User[];
    fetchUsers: () => Promise<void>;
    addOrUpdateUser: (user: Omit<User, 'id' | 'id_school'> & { password?: string }, originalId?: number) => Promise<ApiResponse<User>>;
    deleteUser: (id: number) => Promise<ApiResponse>;
    // Status Management
    updateItemStatus: (dataType: 'teachers' | 'classGroups' | 'subjects' | 'locations', id: string | number, isActive: boolean) => Promise<ApiResponse<any>>;
    // Substitution Management
    fetchSubstitutions: (date: string) => Promise<void>;
    addSubstitution: (sub: Omit<Substitution, 'id' | 'id_school'>, replaceId?: string) => Promise<ApiResponse<DisplaySubstitution>>;
    deleteSubstitution: (id: string) => Promise<ApiResponse>;
    // Class Group Subjects Management
    classGroupSubjects: Subject[];
    fetchClassGroupSubjects: (classGroupId: string) => Promise<void>;
    updateClassGroupSubjects: (classGroupId: string, subjectCodes: string[]) => Promise<ApiResponse<any>>;
    // Attendance Checking
    attendanceLogs: TeacherAttendance[];
    fetchAttendanceLogs: (date: string) => Promise<void>;
    saveAttendanceLogs: (records: Omit<TeacherAttendance, 'id_school'>[]) => Promise<ApiResponse>;
    resetAttendanceLogs: (date: string, classGroupIds: string[]) => Promise<ApiResponse>;
    // Statistics
    attendanceStats: AttendanceStat[];
    substitutionStats: SubstitutionStat[];
    fetchAttendanceStats: (startDate: string, endDate: string) => Promise<void>;
    fetchSubstitutionStats: (startDate: string, endDate: string) => Promise<void>;
    // Announcements
    fetchAllAnnouncements: () => Promise<void>;
    addOrUpdateAnnouncement: (announcement: Omit<Announcement, 'id' | 'id_school' | 'createdAt' | 'updatedAt'>, id?: string) => Promise<ApiResponse<Announcement>>;
    deleteAnnouncement: (id: string) => Promise<ApiResponse>;
    updateAnnouncementStatus: (id: string, isActive: boolean) => Promise<ApiResponse<Announcement>>;
}