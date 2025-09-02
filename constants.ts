import { Teacher, ClassGroup, Subject, Location, TimeSlot, ScheduleEntry, SchoolInfo } from './types';

export const DAYS_OF_WEEK = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

export const SUBJECT_COLORS = [
    'bg-red-200', 'bg-blue-200', 'bg-green-200', 'bg-yellow-200', 'bg-purple-200',
    'bg-pink-200', 'bg-indigo-200', 'bg-teal-200', 'bg-orange-200', 'bg-lime-200'
];

export const SUBJECT_GROUP_OPTIONS = [
    'ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์และเทคโนโลยี', 'สังคมศึกษา ศาสนาและวัฒนธรรม', 
    'สุขศึกษาและพลศึกษา', 'ศิลปะ', 'การงานอาชีพและเทคโนโลยี', 'ภาษาต่างประเทศ', 
    'กิจกรรม', 'กิจกรรมนอกหลักสูตร'
];

export const SEMESTER_OPTIONS = [
    { value: 0, label: 'ทุกภาคเรียน' },
    { value: 1, label: 'ภาคเรียนที่ 1' },
    { value: 2, label: 'ภาคเรียนที่ 2' },
    { value: 3, label: 'ภาคฤดูร้อน' },
];

export const INITIAL_SCHOOL_INFO: SchoolInfo = {
  name: 'โรงเรียนอัจฉริยะ',
  address: '123 ถนนวิทยพัฒนา แขวงปัญญา เขตความรู้ กรุงเทพฯ 10900',
  phone: '02-123-4567',
  logoUrl: '',
  academicYear: '2567',
  currentSemester: 1,
};


export const INITIAL_TEACHERS: Teacher[] = [
    { id: 'T001', prefix: 'อ.', name: 'สมชาย เก่งมาก', subjectGroup: 'วิทยาศาสตร์และเทคโนโลยี', isAdmin: true },
    { id: 'T002', prefix: 'อ.', name: 'สมหญิง จริงใจ', subjectGroup: 'คณิตศาสตร์', isAdmin: false },
    { id: 'T003', prefix: 'ครู', name: 'มานี มีดี', subjectGroup: 'ภาษาไทย', isAdmin: false },
    { id: 'T004', prefix: 'ครู', name: 'เจษฎาพร พรประเสริฐ', subjectGroup: 'ภาษาต่างประเทศ', isAdmin: false },
];

export const INITIAL_CLASS_GROUPS: ClassGroup[] = [
    { id: 'C001', name: 'ม.1/1', gradeLevel: 'ม.1' },
    { id: 'C002', name: 'ม.1/2', gradeLevel: 'ม.1' },
    { id: 'C003', name: 'ม.4/1', gradeLevel: 'ม.4' },
    { id: 'C004', name: 'ม.1/1ก', gradeLevel: 'ม.1', parentId: 'C001' },
    { id: 'C005', name: 'ม.1/1ข', gradeLevel: 'ม.1', parentId: 'C001' },
];

export const INITIAL_SUBJECTS: Subject[] = [
    { code: 'ว21101', name: 'วิทยาศาสตร์พื้นฐาน', subjectGroup: 'วิทยาศาสตร์และเทคโนโลยี', color: SUBJECT_COLORS[0], semester: 1, gradeLevel: 'ม.1', credits: 1.5, periodsPerWeek: 3 },
    { code: 'ค21101', name: 'คณิตศาสตร์พื้นฐาน', subjectGroup: 'คณิตศาสตร์', color: SUBJECT_COLORS[1], semester: 1, gradeLevel: 'ม.1', credits: 1.5, periodsPerWeek: 3 },
    { code: 'ท21101', name: 'ภาษาไทย', subjectGroup: 'ภาษาไทย', color: SUBJECT_COLORS[2], semester: 0, gradeLevel: 'ม.ต้น(ม.1-3)', credits: 1.0, periodsPerWeek: 2 },
    { code: 'อ21101', name: 'ภาษาอังกฤษ', subjectGroup: 'ภาษาต่างประเทศ', color: SUBJECT_COLORS[3], semester: 1, gradeLevel: 'ม.1', credits: 1.0, periodsPerWeek: 2 },
];

export const INITIAL_LOCATIONS: Location[] = [
    { id: 'L001', name: 'ห้อง 421', responsibleTeacherId: 'T001' },
    { id: 'L002', name: 'ห้องปฏิบัติการคอมพิวเตอร์ 1' },
    { id: 'L003', name: 'สนามฟุตบอล' },
    { id: 'L004', name: 'ห้องสมุด', responsibleTeacherId: 'T003' },
];

export const INITIAL_TIME_SLOTS: TimeSlot[] = [
    { id: 'TS01', period: 1, startTime: '08:30', endTime: '09:20' },
    { id: 'TS02', period: 2, startTime: '09:20', endTime: '10:10' },
    { id: 'TS03', period: 3, startTime: '10:20', endTime: '11:10' },
    { id: 'TS04', period: 4, startTime: '11:10', endTime: '12:00' },
    { id: 'TS05', period: 5, startTime: '13:00', endTime: '13:50' },
    { id: 'TS06', period: 6, startTime: '13:50', endTime: '14:40' },
];

export const INITIAL_SCHEDULE: ScheduleEntry[] = [
    { id: 'SE001', classGroupId: 'C001', day: 'จันทร์', timeSlotId: 'TS01', subjectCode: 'ว21101', teacherIds: ['T001'], locationId: 'L001' },
    { id: 'SE002', classGroupId: 'C001', day: 'จันทร์', timeSlotId: 'TS02', subjectCode: 'ค21101', teacherIds: ['T002'], locationId: 'L001' },
    { id: 'SE003', classGroupId: 'C001', day: 'อังคาร', timeSlotId: 'TS03', subjectCode: 'ท21101', teacherIds: ['T003'], locationId: 'L004' },
    { id: 'SE004', classGroupId: 'C002', day: 'จันทร์', timeSlotId: 'TS01', subjectCode: 'ค21101', teacherIds: ['T002'], locationId: 'L002' },
    { id: 'SE005', classGroupId: 'C004', day: 'พุธ', timeSlotId: 'TS01', subjectCode: 'อ21101', teacherIds: ['T004'], locationId: 'L002' },
    { id: 'SE006', classGroupId: 'C003', day: 'ศุกร์', timeSlotId: 'TS06', customActivity: 'กิจกรรมชมรม', teacherIds: ['T001'], locationId: 'L003' },
    { id: 'SE007', classGroupId: 'C002', day: 'อังคาร', timeSlotId: 'TS01', subjectCode: undefined, teacherIds: [], locationId: undefined },
];

export const DATA_CONFIG: any = {
    teachers: {
        title: 'จัดการข้อมูลครู',
        fields: [
            { name: 'prefix', label: 'คำนำหน้า', type: 'text', required: true },
            { name: 'name', label: 'ชื่อ-สกุล', type: 'text', required: true },
            { name: 'subjectGroup', label: 'กลุ่มสาระฯ', type: 'select', options: SUBJECT_GROUP_OPTIONS, required: true },
            { name: 'isAdmin', label: 'Admin', type: 'checkbox', required: false },
        ],
        csvHeaders: ['prefix', 'name', 'subjectGroup', 'isAdmin'],
    },
    subjects: {
        title: 'จัดการข้อมูลรายวิชา',
        fields: [
            { name: 'code', label: 'รหัสวิชา (ตามหลักสูตร)', type: 'text', required: true },
            { name: 'name', label: 'ชื่อวิชา', type: 'text', required: true },
            { name: 'subjectGroup', label: 'กลุ่มสาระฯ', type: 'select', options: SUBJECT_GROUP_OPTIONS, required: true },
            { name: 'semester', label: 'ภาคเรียน', type: 'select', options: SEMESTER_OPTIONS.map(o => o.value), displayOptions: SEMESTER_OPTIONS, required: true },
            { name: 'gradeLevel', label: 'ระดับชั้น', type: 'select', options: ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6', 'ม.ต้น(ม.1-3)', 'ม.ปลาย(ม.4-6)'], required: true },
            { name: 'credits', label: 'หน่วยกิต', type: 'number', required: true },
            { name: 'periodsPerWeek', label: 'คาบ/สัปดาห์', type: 'number', required: true },
        ],
        csvHeaders: ['code', 'name', 'subjectGroup', 'semester', 'gradeLevel', 'credits', 'periodsPerWeek'],
    },
    classGroups: {
        title: 'จัดการข้อมูลกลุ่มเรียน',
        fields: [
            { name: 'name', label: 'ชื่อกลุ่มเรียน', type: 'text', required: true },
            { name: 'gradeLevel', label: 'ระดับชั้น', type: 'select', options: ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'], required: true },
            { name: 'parentId', label: 'กลุ่มเรียนหลัก (สำหรับกลุ่มย่อย)', type: 'select_classGroup', required: false },
        ],
        csvHeaders: ['name', 'gradeLevel', 'parentName'],
    },
    locations: {
        title: 'จัดการข้อมูลสถานที่',
        fields: [
            { name: 'name', label: 'ชื่อสถานที่', type: 'text', required: true },
            { name: 'responsibleTeacherId', label: 'ครูผู้รับผิดชอบ', type: 'select_teacher', required: false },
        ],
        csvHeaders: ['name', 'responsibleTeacherName'],
    },
    timeSlots: {
        title: 'จัดการข้อมูลคาบเรียน',
        fields: [
            { name: 'id', label: 'รหัสคาบเรียน', type: 'text', required: true },
            { name: 'period', label: 'คาบที่', type: 'number', required: true },
            { name: 'startTime', label: 'เวลาเริ่มต้น', type: 'time', required: true },
            { name: 'endTime', label: 'เวลาสิ้นสุด', type: 'time', required: true },
        ],
    },
};
