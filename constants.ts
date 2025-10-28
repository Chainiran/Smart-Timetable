



export const DAYS_OF_WEEK = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

// Base HSL colors for dynamic generation. Hue (0-360), Saturation (%), Lightness (%)
// Using HSL allows for easy programmatic adjustments to lightness for shading.
export const SUBJECT_GROUP_COLORS: { [key: string]: { h: number, s: number } } = {
    'ภาษาไทย': { h: 25, s: 80 }, // Orange-ish
    'คณิตศาสตร์': { h: 220, s: 70 }, // Blue
    'วิทยาศาสตร์และเทคโนโลยี': { h: 140, s: 60 }, // Green
    'สังคมศึกษา ศาสนาและวัฒนธรรม': { h: 50, s: 75 }, // Yellow
    'สุขศึกษาและพลศึกษา': { h: 300, s: 70 }, // Magenta
    'ศิลปะ': { h: 270, s: 70 }, // Purple
    'การงานอาชีพ': { h: 190, s: 65 }, // Teal
    'ภาษาต่างประเทศ': { h: 0, s: 70 }, // Red
    'การศึกษาค้นคว้าด้วยตนเอง': { h: 30, s: 40 }, // Brownish
    'กิจกรรม': { h: 200, s: 30 }, // Gray-blue
    'กิจกรรมนอกหลักหลักสูตร': { h: 0, s: 0 }, // Gray
    'default': { h: 0, s: 0 } // Default color
};

// A versatile palette for dynamically assigning colors to numerous items like teachers or class groups.
export const DYNAMIC_COLOR_PALETTE: { h: number, s: number }[] = [
    { h: 15, s: 85 },   // Orange
    { h: 35, s: 85 },   // Yellow-Orange
    { h: 55, s: 75 },   // Yellow
    { h: 80, s: 60 },   // Lime Green
    { h: 130, s: 60 },  // Green
    { h: 170, s: 70 },  // Teal
    { h: 195, s: 80 },  // Cyan
    { h: 220, s: 75 },  // Blue
    { h: 250, s: 70 },  // Indigo
    { h: 280, s: 70 },  // Violet
    { h: 310, s: 70 },  // Magenta
    { h: 340, s: 85 },  // Red-Pink
];


export const SUBJECT_GROUP_OPTIONS = [
    'ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์และเทคโนโลยี', 'สังคมศึกษา ศาสนาและวัฒนธรรม', 
    'สุขศึกษาและพลศึกษา', 'ศิลปะ', 'การงานอาชีพ', 'ภาษาต่างประเทศ', 
    'การศึกษาค้นคว้าด้วยตนเอง',
    'กิจกรรม', 'กิจกรรมนอกหลักหลักสูตร'
];

export const SEMESTER_OPTIONS = [
    { value: 0, label: 'ทุกภาคเรียน' },
    { value: 1, label: 'ภาคเรียนที่ 1' },
    { value: 2, label: 'ภาคเรียนที่ 2' },
    { value: 3, label: 'ภาคฤดูร้อน' },
];


export const DATA_CONFIG: any = {
    teachers: {
        title: 'จัดการข้อมูลครู',
        fields: [
            { name: 'prefix', label: 'คำนำหน้า', type: 'text', required: true },
            { name: 'name', label: 'ชื่อ-สกุล', type: 'text', required: true },
            { name: 'subjectGroup', label: 'กลุ่มสาระฯ', type: 'select', options: SUBJECT_GROUP_OPTIONS, required: true },
        ],
        csvHeaders: ['prefix', 'name', 'subjectGroup'],
    },
    subjects: {
        title: 'จัดการข้อมูลรายวิชา',
        fields: [
            { name: 'code', label: 'รหัสวิชา (ตามหลักสูตร)', type: 'text', required: true },
            { name: 'name', label: 'ชื่อวิชา', type: 'text', required: true },
            { name: 'subjectGroup', label: 'กลุ่มสาระฯ', type: 'select', options: SUBJECT_GROUP_OPTIONS, required: true },
            { name: 'semester', label: 'ภาคเรียน', type: 'select', options: SEMESTER_OPTIONS.map(o => o.value), displayOptions: SEMESTER_OPTIONS, required: true },
            { name: 'gradeLevel', label: 'ระดับชั้น', type: 'select', options: ['อ.1', 'อ.2', 'อ.3', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6', 'อนุบาล(อ.1-3)', 'ประถม(ป.1-6)', 'ม.ต้น(ม.1-3)', 'ม.ปลาย(ม.4-6)'], required: true },
            { name: 'credits', label: 'หน่วยกิต', type: 'number', required: true },
            { name: 'periodsPerWeek', label: 'คาบ/สัปดาห์', type: 'number', required: true },
        ],
        csvHeaders: ['code', 'name', 'subjectGroup', 'semester', 'gradeLevel', 'credits', 'periodsPerWeek'],
    },
    classGroups: {
        title: 'จัดการข้อมูลกลุ่มเรียน',
        fields: [
            { name: 'name', label: 'ชื่อกลุ่มเรียน', type: 'text', required: true },
            { name: 'gradeLevel', label: 'ระดับชั้น', type: 'select', options: ['อ.1', 'อ.2', 'อ.3', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'], required: true },
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
            { 
                name: 'startTime', 
                label: 'เวลาเริ่มต้น', 
                type: 'text', 
                required: true, 
                placeholder: 'HH:mm',
                pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
                description: 'ระบุในรูปแบบ 24 ชั่วโมง (HH:mm) เช่น 08:30 หรือ 14:00'
            },
            { 
                name: 'endTime', 
                label: 'เวลาสิ้นสุด', 
                type: 'text', 
                required: true, 
                placeholder: 'HH:mm',
                pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
                description: 'ระบุในรูปแบบ 24 ชั่วโมง (HH:mm) เช่น 09:20 หรือ 15:50'
            },
        ],
        csvHeaders: ['id', 'period', 'startTime', 'endTime'],
    },
    users: {
        title: 'จัดการผู้ใช้',
        fields: [
            { name: 'username', label: 'ชื่อผู้ใช้', type: 'text', required: true },
            { name: 'password', label: 'รหัสผ่าน', type: 'password', required: false, placeholder: 'ปล่อยว่างไว้หากไม่ต้องการเปลี่ยน' },
            { name: 'role', label: 'สิทธิ์', type: 'select', options: ['admin', 'super'], required: true },
        ],
    },
};

export const TEMPLATE_EXAMPLES: { [key: string]: string[][] } = {
    teachers: [
        ['นาย', 'สมชาย ใจดี', 'คณิตศาสตร์'],
        ['นางสาว', 'สมหญิง เก่งมาก', 'ภาษาไทย'],
        ['นาง', 'จิตรา สอนดี', 'วิทยาศาสตร์และเทคโนโลยี'],
    ],
    subjects: [
        ['ท21101', 'ภาษาไทยพื้นฐาน 1', 'ภาษาไทย', '1', 'ม.1', '1.5', '3'],
        ['ค21101', 'คณิตศาสตร์พื้นฐาน 1', 'คณิตศาสตร์', '1', 'ม.1', '1.5', '3'],
        ['อ30201', 'ภาษาอังกฤษอ่าน-เขียน', 'ภาษาต่างประเทศ', '1', 'ม.ปลาย(ม.4-6)', '1.0', '2'],
        ['พ20105', 'สุขศึกษา', 'สุขศึกษาและพลศึกษา', '0', 'ม.1', '0.5', '1'],
    ],
    classGroups: [
        ['ม.1/1', 'ม.1', ''],
        ['ม.4/1', 'ม.4', ''],
        ['ห้องเรียนพิเศษวิทย์-คณิต ม.ต้น', 'ม.1', ''],
    ],
    locations: [
        ['ห้อง 111', 'สมชาย ใจดี'],
        ['ห้องสมุด', 'สมหญิง เก่งมาก'],
        ['ห้องคอมพิวเตอร์ 1', ''],
        ['สนามฟุตบอล', ''],
    ],
    timeSlots: [
        ['C01', '1', '08:30', '09:20'],
        ['C02', '2', '09:20', '10:10'],
        ['C03', '3', '10:10', '11:00'],
        ['C04', '4', '11:00', '11:50'],
        ['C05', '5', '12:40', '13:30'],
    ],
};