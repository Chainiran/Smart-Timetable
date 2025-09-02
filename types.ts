export interface Teacher {
  id: string;
  prefix: string;
  name: string;
  subjectGroup: string;
  isAdmin: boolean;
}

export interface ClassGroup {
  id:string;
  name: string;
  gradeLevel: string;
  parentId?: string;
}

export interface Subject {
  code: string;
  name: string;
  subjectGroup: string;
  color: string;
  semester: number;
  gradeLevel: string;
  credits: number;
  periodsPerWeek: number;
}

export interface Location {
  id: string;
  name: string;
  responsibleTeacherId?: string;
}

export interface TimeSlot {
  id: string;
  period: number;
  startTime: string;
  endTime: string;
}

export interface ScheduleEntry {
  id: string;
  classGroupId?: string;
  day: string;
  timeSlotId: string;
  subjectCode?: string;
  customActivity?: string;
  teacherIds: string[];
  locationId?: string;
}

export interface SchoolInfo {
  name: string;
  address: string;
  phone: string;
  logoUrl: string;
  academicYear: string;
  currentSemester: number;
}

export type ConflictInfo = { type: 'teacher' | 'location', conflictingEntry: ScheduleEntry, message: string };

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    conflict?: ConflictInfo;
    item?: T;
    items?: T[];
}

export interface TimetableContextType {
    teachers: Teacher[];
    classGroups: ClassGroup[];
    subjects: Subject[];
    locations: Location[];
    timeSlots: TimeSlot[];
    schedule: ScheduleEntry[];
    schoolInfo: SchoolInfo | null;
    loading: boolean;
    error: string | null;
    updateSchoolInfo: (info: Partial<SchoolInfo>) => Promise<ApiResponse<SchoolInfo>>;
    addOrUpdateTeacher: (teacher: Omit<Teacher, 'id'> & { id?: string }) => Promise<ApiResponse<Teacher>>;
    deleteTeacher: (id: string) => Promise<ApiResponse>;
    addOrUpdateSubject: (subject: Subject) => Promise<ApiResponse<Subject>>;
    deleteSubject: (code: string) => Promise<ApiResponse>;
    addOrUpdateClassGroup: (classGroup: Omit<ClassGroup, 'id'> & { id?: string }) => Promise<ApiResponse<ClassGroup>>;
    deleteClassGroup: (id: string) => Promise<ApiResponse>;
    addOrUpdateLocation: (location: Omit<Location, 'id'> & { id?: string }) => Promise<ApiResponse<Location>>;
    deleteLocation: (id: string) => Promise<ApiResponse>;
    addOrUpdateTimeSlot: (timeSlot: TimeSlot) => Promise<ApiResponse<TimeSlot>>;
    deleteTimeSlot: (id: string) => Promise<ApiResponse>;
    addScheduleEntry: (entry: Omit<ScheduleEntry, 'id'>) => Promise<ApiResponse<ScheduleEntry>>;
    updateScheduleEntry: (entry: ScheduleEntry) => Promise<ApiResponse<ScheduleEntry>>;
    deleteScheduleEntry: (id: string) => Promise<ApiResponse>;
    deleteConflictingEntryAndSave: (entryData: Omit<ScheduleEntry, 'id'> | ScheduleEntry, conflictingEntryId: string) => Promise<ApiResponse>;
    addTeachersInBulk: (newTeachers: Omit<Teacher, 'id'>[]) => Promise<ApiResponse>;
    addClassGroupsInBulk: (newClassGroups: (Omit<ClassGroup, 'id' | 'parentId'> & { parentName?: string })[]) => Promise<ApiResponse>;
    addSubjectsInBulk: (newSubjects: Subject[]) => Promise<ApiResponse>;
    addLocationsInBulk: (newLocations: (Omit<Location, 'id' | 'responsibleTeacherId'> & { responsibleTeacherName?: string})[]) => Promise<ApiResponse>;
}
