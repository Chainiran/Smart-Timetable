import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTimetable } from '../context/TimetableContext';
import { ScheduleEntry, TeacherAttendance, ClassGroup, ColorBy } from '../types';
import { Save, Check, User, Book, Palette, Repeat, Filter } from 'lucide-react';
import SearchableMultiSelect from '../components/SearchableMultiSelect';
import { SUBJECT_GROUP_COLORS, DYNAMIC_COLOR_PALETTE, DAYS_OF_WEEK } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import Modal from '../components/Modal';

const stringToHash = (str: string): number => {
    let hash = 0;
    if (!str || str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

// This function converts a historical attendance log back into a ScheduleEntry-like object for display
const logToScheduleEntry = (log: TeacherAttendance): ScheduleEntry => {
    return {
        id: log.originalScheduleEntryId,
        id_school: '', // Not needed for display
        day: log.day,
        timeSlotId: '', // period is used instead
        classGroupId: log.classGroupId || undefined,
        subjectCode: log.subjectCode || undefined,
        customActivity: log.customActivity || undefined,
        teacherIds: log.originalTeacherIds,
        locationId: log.locationId || undefined,
        academicYear: '', // Not needed for display
        semester: 0, // Not needed for display
    };
};

const getThaiDateString = (): string => {
    try {
        // Use 'sv-SE' locale for its YYYY-MM-DD format, and specify the Bangkok timezone.
        const dateString = new Date().toLocaleDateString('sv-SE', {
            timeZone: 'Asia/Bangkok',
        });
        return dateString;
    } catch (e) {
        console.error("Could not format date for Thai timezone, falling back to local date.", e);
        // Fallback for older environments
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
};


const AttendanceCheck: React.FC = () => {
    const {
        schoolInfo,
        timeSlots,
        subjects,
        activeTeachers: teachers,
        classGroups,
        locations,
        schedule,
        attendanceLogs,
        fetchAttendanceLogs,
        saveAttendanceLogs,
        resetAttendanceLogs,
        substitutions,
        fetchSubstitutions
    } = useTimetable();

    const [selectedDate, setSelectedDate] = useState<string>(getThaiDateString());
    const [attendanceData, setAttendanceData] = useState<Map<string, Partial<TeacherAttendance>>>(new Map());
    const [scheduleForDisplay, setScheduleForDisplay] = useState<ScheduleEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [colorBy, setColorBy] = useState<ColorBy>('subjectGroup');
    const [gradeFilter, setGradeFilter] = useState<string>('all');

    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [resetAction, setResetAction] = useState<{
        type: 'group' | 'all';
        payload: { classGroupId?: string; visibleGroupIds?: string[] };
        message: string;
    } | null>(null);


    const gradeLevels = useMemo(() => {
        const grades = new Set(classGroups.map(cg => cg.gradeLevel));
        const sortedGrades = Array.from(grades).sort((a, b) => a.localeCompare(b, 'th-TH-u-kn-true'));
        return ['all', ...sortedGrades];
    }, [classGroups]);


    const memoizedFetchAttendance = useCallback(fetchAttendanceLogs, []);
    const memoizedFetchSubstitutions = useCallback(fetchSubstitutions, []);


    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            memoizedFetchAttendance(selectedDate),
            memoizedFetchSubstitutions(selectedDate)
        ]).then(() => {
            setIsLoading(false);
        });
    }, [selectedDate, memoizedFetchAttendance, memoizedFetchSubstitutions]);

    useEffect(() => {
        const dayOfWeek = DAYS_OF_WEEK[new Date(selectedDate).getUTCDay() - 1];
        
        // Get live schedule entries for the current day, academic year, and semester
        const currentScheduleForDay = schedule.filter(entry => 
            entry.day === dayOfWeek && 
            entry.academicYear === schoolInfo?.academicYear &&
            entry.semester === schoolInfo?.currentSemester &&
            entry.classGroupId // Ensure entry is associated with a class group
        );
    
        const finalScheduleForDisplay: ScheduleEntry[] = [];
        const newAttendanceData = new Map<string, Partial<TeacherAttendance>>();
        
        // Get all unique class group IDs from both live schedule and logs for the day
        const allClassGroupIds = new Set<string>();
        currentScheduleForDay.forEach(e => e.classGroupId && allClassGroupIds.add(e.classGroupId));
        attendanceLogs.forEach(l => l.classGroupId && allClassGroupIds.add(l.classGroupId));
    
        // For each class group, decide whether to show logs or live schedule
        allClassGroupIds.forEach(classGroupId => {
            // Find logs for this specific class group on the selected date
            const logsForGroup = attendanceLogs.filter(log => log.classGroupId === classGroupId);
    
            if (logsForGroup.length > 0) {
                // DATA HAS BEEN SAVED. Only use attendance logs for this group.
                logsForGroup.forEach(log => {
                    finalScheduleForDisplay.push(logToScheduleEntry(log));
                    newAttendanceData.set(log.originalScheduleEntryId, { ...log });
                });
            } else {
                // NO SAVED DATA. Use the live schedule for this group.
                const liveEntriesForGroup = currentScheduleForDay.filter(e => e.classGroupId === classGroupId);
                liveEntriesForGroup.forEach(liveEntry => {
                    finalScheduleForDisplay.push(liveEntry);
                    
                    // Create a default, unsaved attendance record for this live entry
                    const timeSlot = timeSlots.find(ts => ts.id === liveEntry.timeSlotId);
                    const substitution = substitutions.find(sub => sub.originalScheduleEntryId === liveEntry.id);
                    const substituteTeacherId = substitution ? substitution.substituteTeacherId : null;
                    let notes: string | null = null;
                    // For custom activities, initialize notes as an empty JSON array string to store selected teachers
                    if (liveEntry.customActivity && !substitution && liveEntry.teacherIds.length > 0) {
                        notes = JSON.stringify([]);
                    }
        
                    newAttendanceData.set(liveEntry.id, {
                        originalScheduleEntryId: liveEntry.id,
                        attendanceDate: selectedDate,
                        isPresent: false, 
                        substituteTeacherId: substituteTeacherId,
                        notes: notes,
                        timeSlotPeriod: timeSlot?.period,
                    });
                });
            }
        });
    
        setScheduleForDisplay(finalScheduleForDisplay);
        setAttendanceData(newAttendanceData);
    }, [attendanceLogs, schedule, selectedDate, substitutions, schoolInfo, timeSlots, classGroups]);
    
     const getDynamicBgColor = (entry: ScheduleEntry, colorByType: ColorBy): string => {
        const lightness = 85;

        switch (colorByType) {
            case 'teacher': {
                const firstTeacherId = entry.teacherIds[0];
                if (!firstTeacherId) return '#f3f4f6'; // gray-100
                const teacherHash = stringToHash(firstTeacherId);
                const baseColor = DYNAMIC_COLOR_PALETTE[Math.abs(teacherHash) % DYNAMIC_COLOR_PALETTE.length];
                return `hsl(${baseColor.h}, ${baseColor.s}%, ${lightness}%)`;
            }
            case 'classGroup': {
                if (!entry.classGroupId) return '#f3f4f6';
                const classGroupHash = stringToHash(entry.classGroupId);
                const baseColor = DYNAMIC_COLOR_PALETTE[Math.abs(classGroupHash) % DYNAMIC_COLOR_PALETTE.length];
                return `hsl(${baseColor.h}, ${baseColor.s}%, ${lightness}%)`;
            }
            case 'subject': {
                if (!entry.subjectCode) return '#fefce8'; // yellow-50 for custom activity
                const subjectHash = stringToHash(entry.subjectCode);
                const baseColor = DYNAMIC_COLOR_PALETTE[Math.abs(subjectHash) % DYNAMIC_COLOR_PALETTE.length];
                return `hsl(${baseColor.h}, ${baseColor.s}%, ${lightness}%)`;
            }
            case 'subjectGroup':
            default: {
                const subject = entry.subjectCode ? subjects.find(s => s.code === entry.subjectCode) : null;
                if (!subject) return '#fefce8';
                const baseColor = SUBJECT_GROUP_COLORS[subject.subjectGroup] || SUBJECT_GROUP_COLORS.default;
                return `hsl(${baseColor.h}, ${baseColor.s}%, ${lightness}%)`;
            }
        }
    };


    const handleAttendanceChange = (entryId: string, field: 'isPresent' | 'specialActivityTeachers', value: any) => {
        setAttendanceData(prev => {
            const newMap = new Map(prev);
            const current: Partial<TeacherAttendance> = newMap.get(entryId) || { originalScheduleEntryId: entryId, attendanceDate: selectedDate };
            const substitution = substitutions.find(sub => sub.originalScheduleEntryId === entryId);
    
            if (field === 'isPresent') {
                current.isPresent = value as boolean;
                if (substitution && current.isPresent) {
                    current.substituteTeacherId = substitution.substituteTeacherId;
                } else {
                    current.substituteTeacherId = null;
                }
            } else if (field === 'specialActivityTeachers') {
                const selectedIds = value as string[];
                current.isPresent = selectedIds.length > 0;
                current.notes = JSON.stringify(selectedIds);
                current.substituteTeacherId = null; 
            }
            
            newMap.set(entryId, current);
            return newMap;
        });
    };
    
    const handleMarkGroupAsPresent = (groupId: string) => {
        setAttendanceData(prev => {
            const newMap = new Map(prev);
            scheduleForDisplay.forEach(entry => {
                const substitution = substitutions.find(sub => sub.originalScheduleEntryId === entry.id);
                if (entry.classGroupId === groupId && !entry.customActivity && !substitution) {
                    const current: Partial<TeacherAttendance> = newMap.get(entry.id) || { originalScheduleEntryId: entry.id, attendanceDate: selectedDate };
                    current.isPresent = true;
                    current.substituteTeacherId = null;
                    newMap.set(entry.id, current);
                }
            });
            return newMap;
        });
    };

    const createStampedRecords = useCallback((entryIds: Set<string>): Omit<TeacherAttendance, 'id_school'>[] => {
        const records: Omit<TeacherAttendance, 'id_school'>[] = [];
        for (const [entryId, attendanceRecord] of attendanceData.entries()) {
            if (entryIds.has(entryId)) {
                const sourceEntry = scheduleForDisplay.find(e => e.id === entryId);
                if (!sourceEntry) continue;

                // 1. Skip "พักเที่ยง" (Lunch break)
                if (sourceEntry.customActivity === 'พักเที่ยง') {
                    continue;
                }
    
                // 2. Skip other custom activities if no teacher is selected
                if (sourceEntry.customActivity) {
                    let selectedTeachers: string[] = [];
                    if (attendanceRecord.notes) {
                        try {
                            const parsedNotes = JSON.parse(attendanceRecord.notes);
                            if (Array.isArray(parsedNotes)) {
                                selectedTeachers = parsedNotes;
                            }
                        } catch (e) {
                            // notes might not be valid JSON, ignore
                        }
                    }
                    if (selectedTeachers.length === 0) {
                        continue; // Don't save if no teachers are assigned
                    }
                }

                const ts = timeSlots.find(t => t.id === sourceEntry.timeSlotId) || timeSlots.find(t => t.period === (attendanceRecord as TeacherAttendance).timeSlotPeriod);
                const cg = classGroups.find(c => c.id === sourceEntry.classGroupId);
                const loc = locations.find(l => l.id === sourceEntry.locationId);
                const subj = subjects.find(s => s.code === sourceEntry.subjectCode);
                const originalTeachers = teachers.filter(t => sourceEntry.teacherIds.includes(t.id));

                const stampedRecord: Omit<TeacherAttendance, 'id_school'> = {
                    id: (attendanceRecord as TeacherAttendance).id || uuidv4(),
                    originalScheduleEntryId: sourceEntry.id,
                    attendanceDate: selectedDate,
                    isPresent: attendanceRecord.isPresent ?? false,
                    substituteTeacherId: attendanceRecord.substituteTeacherId || null,
                    notes: attendanceRecord.notes || null,
                    day: sourceEntry.day,
                    timeSlotPeriod: ts?.period || 0,
                    startTime: ts?.startTime || '00:00:00',
                    endTime: ts?.endTime || '00:00:00',
                    subjectCode: subj?.code || null,
                    subjectName: subj?.name || sourceEntry.subjectCode || null,
                    customActivity: sourceEntry.customActivity || null,
                    originalTeacherIds: sourceEntry.teacherIds,
                    originalTeacherNames: originalTeachers.map(t => t.name),
                    classGroupId: cg?.id || null,
                    classGroupName: cg?.name || null,
                    locationId: loc?.id || null,
                    locationName: loc?.name || null,
                };
                records.push(stampedRecord);
            }
        }
        return records;
    }, [attendanceData, scheduleForDisplay, selectedDate, timeSlots, classGroups, locations, subjects, teachers]);

    const handleSave = async (recordsToSave: Omit<TeacherAttendance, 'id_school'>[]) => {
        setIsSaving(true);
        if (recordsToSave.length > 0) {
            const result = await saveAttendanceLogs(recordsToSave);
            if (result.success) {
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
            } else {
                alert(`เกิดข้อผิดพลาด: ${result.message}`);
            }
        } else {
             setShowSuccess(true);
             setTimeout(() => setShowSuccess(false), 3000);
        }
        setIsSaving(false);
    };

    const handleSaveAll = () => {
        const allEntryIds = new Set(attendanceData.keys());
        const recordsToSave = createStampedRecords(allEntryIds);
        handleSave(recordsToSave);
    };

    const handleSaveGroup = (classGroupId: string) => {
        const entryIdsForGroup = new Set(scheduleForDisplay.filter(e => e.classGroupId === classGroupId).map(e => e.id));
        const recordsToSave = createStampedRecords(entryIdsForGroup);
        handleSave(recordsToSave);
    };

    const handleResetGroup = (classGroupId: string, classGroupName: string) => {
        setResetAction({
            type: 'group',
            payload: { classGroupId },
            message: `คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตข้อมูลการเข้าสอนของกลุ่มเรียน "${classGroupName}"?`
        });
        setIsResetConfirmOpen(true);
    };

    const handleResetAll = () => {
        const visibleGroupIds = Object.values(groupedSchedule)
            .flatMap(grade => Object.keys(grade))
            .map(groupName => classGroups.find(cg => cg.name === groupName)?.id)
            .filter((id): id is string => !!id);

        if (visibleGroupIds.length === 0) {
            alert("ไม่มีกลุ่มเรียนที่แสดงอยู่ให้รีเซ็ต");
            return;
        }

        setResetAction({
            type: 'all',
            payload: { visibleGroupIds },
            message: `คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตข้อมูลการเข้าสอนของกลุ่มเรียนที่แสดงอยู่ทั้งหมด (${visibleGroupIds.length} กลุ่ม)?`
        });
        setIsResetConfirmOpen(true);
    };
    
    const handleConfirmReset = async () => {
        if (!resetAction) return;
    
        setIsSaving(true);
        setIsResetConfirmOpen(false);
    
        try {
            let result;
            if (resetAction.type === 'group' && resetAction.payload.classGroupId) {
                result = await resetAttendanceLogs(selectedDate, [resetAction.payload.classGroupId]);
            } else if (resetAction.type === 'all' && resetAction.payload.visibleGroupIds) {
                result = await resetAttendanceLogs(selectedDate, resetAction.payload.visibleGroupIds);
            }
    
            if (result && result.success) {
                window.location.reload();
            } else {
                const errorMessage = result ? result.message : 'An unknown error occurred.';
                alert(`เกิดข้อผิดพลาดในการรีเซ็ต: ${errorMessage}`);
                setIsSaving(false);
                setResetAction(null);
            }
        } catch (error) {
            console.error("Reset failed:", error);
            alert('เกิดข้อผิดพลาดในการรีเซ็ต');
            setIsSaving(false);
            setResetAction(null);
        }
    };

    const groupedSchedule = useMemo(() => {
        const filteredByGrade = scheduleForDisplay.filter(entry => {
            if (gradeFilter === 'all') return true;
            const group = classGroups.find(cg => cg.id === entry.classGroupId);
            return group?.gradeLevel === gradeFilter;
        });

        const grouped: { [grade: string]: { [groupName: string]: ScheduleEntry[] } } = {};
        const sortedGroups = [...classGroups].sort((a, b) => a.name.localeCompare(b.name, 'th'));

        sortedGroups.forEach(cg => {
            if (gradeFilter !== 'all' && cg.gradeLevel !== gradeFilter) return;
            if (!grouped[cg.gradeLevel]) {
                grouped[cg.gradeLevel] = {};
            }
            grouped[cg.gradeLevel][cg.name] = [];
        });

        filteredByGrade.forEach(entry => {
            const group = classGroups.find(cg => cg.id === entry.classGroupId);
            if (group && grouped[group.gradeLevel] && grouped[group.gradeLevel][group.name]) {
                grouped[group.gradeLevel][group.name].push(entry);
            }
        });

        Object.keys(grouped).forEach(grade => {
            Object.keys(grouped[grade]).forEach(groupName => {
                if (grouped[grade][groupName].length === 0) {
                    delete grouped[grade][groupName];
                }
            });
            if (Object.keys(grouped[grade]).length === 0) {
                delete grouped[grade];
            }
        });

        return grouped;
    }, [scheduleForDisplay, classGroups, gradeFilter]);
    
    const sortedTeachers = useMemo(() => [...teachers].sort((a,b)=>a.name.localeCompare(b.name, 'th')), [teachers]);

    return (
        <div className="h-full flex flex-col space-y-4">
            {showSuccess && (
                <div className="fixed top-5 right-5 z-50 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg animate-bounce">
                    บันทึกข้อมูลสำเร็จ!
                </div>
            )}
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">เช็คครูเข้าสอน</h1>
                    <p className="text-md text-gray-600 mt-1">
                       สำหรับวันที่ {new Date(selectedDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                    </p>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-gray-600" />
                        <label htmlFor="grade-filter" className="text-sm font-medium text-gray-700">ระดับชั้น:</label>
                        <select
                            id="grade-filter"
                            value={gradeFilter}
                            onChange={e => setGradeFilter(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md shadow-sm text-sm"
                        >
                            {gradeLevels.map(grade => (
                                <option key={grade} value={grade}>
                                    {grade === 'all' ? 'ทุกระดับชั้น' : grade}
                                </option>
                            ))}
                        </select>
                    </div>
                     <div className="flex items-center gap-2">
                        <Palette size={16} className="text-gray-600" />
                        <label htmlFor="color-by-select" className="text-sm font-medium text-gray-700">จำแนกสีตาม:</label>
                        <select
                            id="color-by-select"
                            value={colorBy}
                            onChange={(e) => setColorBy(e.target.value as ColorBy)}
                            className="p-2 border border-gray-300 rounded-md shadow-sm text-sm"
                        >
                            <option value="subjectGroup">กลุ่มสาระวิชา</option>
                            <option value="teacher">ครูผู้สอน</option>
                            <option value="classGroup">กลุ่มเรียน</option>
                            <option value="subject">รายวิชา</option>
                        </select>
                    </div>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md shadow-sm"
                    />
                     <button
                        onClick={handleResetAll}
                        disabled={isSaving}
                        className="flex items-center bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:bg-red-300"
                    >
                        <Repeat size={20} className="mr-2" />
                        {isSaving ? 'กำลังดำเนินการ...' : 'รีเซ็ตข้อมูล'}
                    </button>
                     <button
                        onClick={handleSaveAll}
                        disabled={isSaving}
                        className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                    >
                        <Save size={20} className="mr-2" />
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลทั้งหมด'}
                    </button>
                </div>
            </div>

            <div className="relative flex-1 bg-white rounded-lg shadow-md overflow-auto">
                {isLoading ? (
                    <div className="p-8 text-center">กำลังโหลดข้อมูล...</div>
                ) : Object.keys(groupedSchedule).length === 0 ? (
                    <div className="p-8 text-center text-gray-500">ไม่พบตารางสอนสำหรับวันนี้</div>
                ) : (
                    <table className="w-full min-w-max border-collapse">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 border font-semibold text-sm sticky top-0 left-0 z-30 bg-gray-100 w-48">กลุ่มเรียน</th>
                                {timeSlots.map(ts => (
                                    <th key={ts.id} className="p-2 border font-semibold text-sm sticky top-0 z-20 bg-gray-100">
                                        คาบที่ {ts.period}
                                        <div className="font-normal text-xs text-gray-500">{ts.startTime}-{ts.endTime}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(groupedSchedule).sort().map(grade => (
                                <React.Fragment key={grade}>
                                    <tr><td colSpan={timeSlots.length + 1} className="p-2 bg-gray-200 font-bold text-lg sticky left-0 z-20">{grade}</td></tr>
                                    {Object.keys(groupedSchedule[grade]).map(groupName => {
                                        const entriesForGroup = groupedSchedule[grade][groupName];
                                        const classGroupId = classGroups.find(cg => cg.name === groupName)?.id;
                                        return (
                                        <tr key={groupName} className="hover:bg-gray-50">
                                            <td className="p-2 border align-top sticky left-0 z-20 bg-white hover:bg-gray-50">
                                                <div className="flex flex-col space-y-2 h-full">
                                                    <span className="font-semibold">{groupName}</span>
                                                    {classGroupId && (
                                                    <button 
                                                        onClick={() => handleMarkGroupAsPresent(classGroupId)} 
                                                        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold bg-green-100 text-green-800 px-2 py-1.5 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 transition-colors"
                                                    >
                                                        <Check size={14}/>
                                                        <span>เข้าสอนครบ</span>
                                                    </button>
                                                    )}
                                                     {classGroupId && (
                                                    <button 
                                                        onClick={() => handleResetGroup(classGroupId, groupName)}
                                                        disabled={isSaving}
                                                        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold bg-red-100 text-red-800 px-2 py-1.5 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 transition-colors disabled:bg-gray-200"
                                                    >
                                                        <Repeat size={14}/>
                                                        <span>รีเซ็ตกลุ่มนี้</span>
                                                    </button>
                                                    )}
                                                     {classGroupId && (
                                                    <button 
                                                        onClick={() => handleSaveGroup(classGroupId)} 
                                                        disabled={isSaving}
                                                        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1.5 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-colors disabled:bg-gray-200"
                                                    >
                                                        <Save size={14}/>
                                                        <span>บันทึกกลุ่มนี้</span>
                                                    </button>
                                                    )}
                                                </div>
                                            </td>
                                            {timeSlots.map(ts => {
                                                const entry = entriesForGroup.find(e => {
                                                    const attendanceLog = attendanceData.get(e.id) as Partial<TeacherAttendance>;
                                                    if (attendanceLog && attendanceLog.timeSlotPeriod) {
                                                        return attendanceLog.timeSlotPeriod === ts.period;
                                                    }
                                                    return e.timeSlotId === ts.id;
                                                });

                                                if (!entry) return <td key={ts.id} className="p-1 border"></td>;

                                                const subject = subjects.find(s => s.code === entry.subjectCode);
                                                const entryTeachers = teachers.filter(t => entry.teacherIds.includes(t.id));
                                                const attendance = attendanceData.get(entry.id);
                                                const substitution = substitutions.find(sub => sub.originalScheduleEntryId === entry.id);
                                                const bgColor = getDynamicBgColor(entry, colorBy);
                                                
                                                let specialActivityTeacherIds: string[] = [];
                                                if (entry.customActivity && attendance?.notes) {
                                                    try {
                                                        const ids = JSON.parse(attendance.notes);
                                                        if (Array.isArray(ids)) specialActivityTeacherIds = ids;
                                                    } catch {}
                                                }
                                                const selectedTeacherNames = specialActivityTeacherIds
                                                    .map(id => teachers.find(t => t.id === id)?.name)
                                                    .filter(Boolean)
                                                    .join(', ');

                                                return (
                                                    <td key={ts.id} className="p-1 border align-top">
                                                        <div className="p-2 rounded-lg h-full flex flex-col justify-between text-sm min-h-[150px]" style={{ backgroundColor: bgColor }}>
                                                            <div>
                                                                <div className="flex items-center gap-1.5 font-bold truncate">
                                                                    <Book size={14} className="flex-shrink-0 text-gray-500"/>
                                                                    <span title={subject?.name || entry.customActivity}>{subject?.name || entry.customActivity}</span>
                                                                </div>
                                                                {entryTeachers.length > 0 && !entry.customActivity && (
                                                                    <div className="flex items-center gap-1.5 text-xs text-gray-600 truncate">
                                                                        <User size={14} className="flex-shrink-0 text-gray-500"/>
                                                                        <span title={entryTeachers.map(t => t.name).join(', ')}>{entryTeachers.map(t => t.name).join(', ')}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="mt-2">
                                                                {entry.customActivity === 'พักเที่ยง' ? (
                                                                    <div className="text-center text-gray-500 pt-8">(กิจกรรมพัก)</div>
                                                                ) : entry.customActivity ? (
                                                                    <div>
                                                                        <div className="mb-1 p-1 bg-blue-50 border border-blue-200 rounded text-xs min-h-[2.5rem] text-blue-800">
                                                                            {selectedTeacherNames || 'ยังไม่ได้เลือกผู้สอน'}
                                                                        </div>
                                                                         <SearchableMultiSelect
                                                                            options={sortedTeachers}
                                                                            selectedIds={specialActivityTeacherIds}
                                                                            onChange={(selectedIds) => handleAttendanceChange(entry.id, 'specialActivityTeachers', selectedIds)}
                                                                            label=""
                                                                            placeholder="ค้นหาครู..."
                                                                            widthClass="w-full"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        {substitution ? (
                                                                            <div className="p-2 bg-green-100 border border-green-200 rounded text-sm space-y-1">
                                                                                <div className="flex items-center justify-between">
                                                                                    <div className="flex items-center gap-1.5 font-semibold text-green-800">
                                                                                        <Repeat size={14} />
                                                                                        <span>สอนแทนโดย:</span>
                                                                                    </div>
                                                                                </div>
                                                                                <p className="text-gray-800 font-medium pl-5">{substitution.substituteTeacherName}</p>
                                                                                <p className="text-xs text-gray-500 pl-5">({substitution.reason})</p>
                                                                                <label className="flex items-center space-x-2 cursor-pointer mt-2 pt-2 border-t border-green-200">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={!!attendance?.isPresent}
                                                                                        onChange={e => handleAttendanceChange(entry.id, 'isPresent', e.target.checked)}
                                                                                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                                    />
                                                                                    <span className="text-gray-700 font-medium">เข้าสอนแทน</span>
                                                                                </label>
                                                                            </div>
                                                                        ) : (
                                                                            <label className="flex items-center space-x-2 cursor-pointer mt-2">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={!!attendance?.isPresent}
                                                                                    onChange={e => handleAttendanceChange(entry.id, 'isPresent', e.target.checked)}
                                                                                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                                />
                                                                                <span className="text-gray-700">เข้าสอน</span>
                                                                            </label>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    )})}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <Modal isOpen={isResetConfirmOpen} onClose={() => setIsResetConfirmOpen(false)} title="ยืนยันการรีเซ็ตข้อมูล">
                {resetAction && (
                    <div>
                        <p className="mb-4 text-gray-800 text-lg whitespace-pre-line">
                            {resetAction.message}
                        </p>
                        <p className="text-red-600">
                            ข้อมูลที่บันทึกไว้จะถูกลบและแทนที่ด้วยตารางสอนปัจจุบัน การกระทำนี้ไม่สามารถย้อนกลับได้
                        </p>
                        <div className="flex justify-end pt-6 mt-4 border-t">
                            <button
                                type="button"
                                onClick={() => { setIsResetConfirmOpen(false); setResetAction(null); }}
                                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 mr-2"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmReset}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                            >
                                ยืนยันการรีเซ็ต
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AttendanceCheck;