import React, { useState, useEffect, useMemo } from 'react';
import { useTimetable } from '../context/TimetableContext';
import { ScheduleEntry, Teacher, DisplaySubstitution, Substitution } from '../types';
import SearchableMultiSelect from '../components/SearchableMultiSelect';
import Modal from '../components/Modal';
import { PlusCircle, Trash2, User, Book, MapPin, Plus, Printer, FileDown } from 'lucide-react';
import { DYNAMIC_COLOR_PALETTE } from '../constants';
import AIChatbot from '../components/AIChatbot';
import { useAuth } from '../context/AuthContext';

// Helper function to create a consistent numeric hash from a string
const stringToHash = (str: string): number => {
    let hash = 0;
    if (!str || str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

// Helper function to get a unique, consistent color for a teacher
const getTeacherColor = (teacherId: string): string => {
    if (!teacherId) return '#e5e7eb'; // gray-200
    const lightness = 85;
    const teacherHash = stringToHash(teacherId);
    const baseColor = DYNAMIC_COLOR_PALETTE[teacherHash % DYNAMIC_COLOR_PALETTE.length];
    return `hsl(${baseColor.h}, ${baseColor.s}%, ${lightness}%)`;
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


// Card component for displaying individual schedule entries in the grid
const ScheduleCard: React.FC<{
    entry: ScheduleEntry;
    bgColor?: string;
    textColor: string;
    isClickable: boolean;
    onClick?: () => void;
    statusText?: string;
    style?: React.CSSProperties;
}> = ({ entry, bgColor, textColor, isClickable, onClick, statusText, style }) => {
    const { subjects, classGroups, locations, teachers } = useTimetable();
    const subject = subjects.find(s => s.code === entry.subjectCode);
    const classGroup = classGroups.find(cg => cg.id === entry.classGroupId);
    const location = locations.find(l => l.id === entry.locationId);
    const entryTeachers = teachers.filter(t => entry.teacherIds.includes(t.id));

    return (
        <div 
            className={`p-2 rounded-lg text-xs flex flex-col justify-between ${isClickable ? 'cursor-pointer hover:shadow-lg hover:ring-2 ring-blue-400' : ''} ${bgColor || ''} ${textColor}`}
            style={style}
            onClick={onClick}
        >
            <div>
                <p className="font-bold truncate">
                    {subject?.name || entry.customActivity}
                </p>
                {classGroup && <div className="flex items-center"><User size={12} className="mr-1 flex-shrink-0" /> <span className="truncate">{classGroup.name}</span></div>}
                {entryTeachers.length > 0 && <div className="flex items-center"><User size={12} className="mr-1 flex-shrink-0" /> <span className="truncate">{entryTeachers.map(t => t.name).join(', ')}</span></div>}
                {location && <div className="flex items-center"><MapPin size={12} className="mr-1 flex-shrink-0" /> <span className="truncate">{location.name}</span></div>}
            </div>
            {statusText && <p className="text-center font-semibold mt-1">{statusText}</p>}
        </div>
    );
};

// New card component for substitutions by other teachers being considered
const SubstitutionCard: React.FC<{
    sub: DisplaySubstitution;
    style?: React.CSSProperties;
}> = ({ sub, style }) => {
    return (
        <div
            className="p-2 rounded-lg text-xs flex flex-col justify-between text-gray-800"
            style={style}
        >
            <div>
                <p className="font-bold truncate" title={sub.subjectName}>{sub.subjectName}</p>
                <div className="flex items-center" title={sub.classGroupName}><User size={12} className="mr-1 flex-shrink-0" /> <span className="truncate">{sub.classGroupName}</span></div>
                <div className="flex items-center" title={sub.locationName}><MapPin size={12} className="mr-1 flex-shrink-0" /> <span className="truncate">{sub.locationName}</span></div>
            </div>
             <div className="text-center font-semibold mt-1" title={`${sub.substituteTeacherName} สอนแทน ${sub.absentTeacherName}`}>
                <p className="text-green-700 truncate">{sub.substituteTeacherName}</p>
                <p className="text-red-700 truncate">สอนแทน: {sub.absentTeacherName}</p>
            </div>
        </div>
    );
};


const SubstituteArrangement: React.FC = () => {
    const {
        activeTeachers: teachers,
        timeSlots,
        subjects,
        classGroups,
        locations,
        schedule,
        substitutions,
        fetchSubstitutions,
        addSubstitution,
        deleteSubstitution,
        schoolInfo
    } = useTimetable();
    const { user } = useAuth();

    const [selectedDate, setSelectedDate] = useState<string>(getThaiDateString());
    const [absentTeacherId, setAbsentTeacherId] = useState<string>('');
    const [absentReason, setAbsentReason] = useState<string>('ลาป่วย');
    const [consideringTeacherIds, setConsideringTeacherIds] = useState<string[]>([]);
    
    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [entryToSubstitute, setEntryToSubstitute] = useState<ScheduleEntry | null>(null);
    const [substituteTeacherId, setSubstituteTeacherId] = useState<string>('');
    const [reason, setReason] = useState<string>('ลาป่วย');
    const [notes, setNotes] = useState<string>('');
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [subToDelete, setSubToDelete] = useState<DisplaySubstitution | null>(null);
    
    const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
    const [replaceInfo, setReplaceInfo] = useState<{ existingSub: DisplaySubstitution, newSubData: Omit<Substitution, 'id' | 'id_school'> } | null>(null);

    useEffect(() => {
        if (selectedDate) {
            fetchSubstitutions(selectedDate);
        }
    }, [selectedDate, fetchSubstitutions]);

    const dayOfWeek = useMemo(() => {
        if (!selectedDate) return '';
        const date = new Date(selectedDate);
        const dayIndex = date.getUTCDay();
        const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
        return thaiDays[dayIndex];
    }, [selectedDate]);

    const scheduleForDay = useMemo(() => {
        if (!dayOfWeek || !schoolInfo) return [];
        return schedule.filter(entry => 
            entry.day === dayOfWeek &&
            entry.academicYear === schoolInfo.academicYear &&
            entry.semester === schoolInfo.currentSemester
        );
    }, [dayOfWeek, schedule, schoolInfo]);
    
    const freeConsideringTeachersBySlot = useMemo(() => {
        const result: { [timeSlotId: string]: Teacher[] } = {};
        if (consideringTeacherIds.length === 0 || !dayOfWeek) return result;

        const busyTeacherIdsBySlot: { [timeSlotId: string]: Set<string> } = {};

        // Find all busy teachers for the selected day
        for (const entry of scheduleForDay) {
            if (!busyTeacherIdsBySlot[entry.timeSlotId]) {
                busyTeacherIdsBySlot[entry.timeSlotId] = new Set();
            }
            entry.teacherIds.forEach(tid => busyTeacherIdsBySlot[entry.timeSlotId].add(tid));
        }

        // For each slot, find which of the considering teachers are not busy
        for (const ts of timeSlots) {
            const busyIds = busyTeacherIdsBySlot[ts.id] || new Set();
            result[ts.id] = teachers
                .filter(t => consideringTeacherIds.includes(t.id) && !busyIds.has(t.id))
                .sort((a,b) => a.name.localeCompare(b.name, 'th'));
        }
        return result;
    }, [consideringTeacherIds, scheduleForDay, timeSlots, teachers, dayOfWeek]);


    const handleOpenAddModal = (entry: ScheduleEntry) => {
        setEntryToSubstitute(entry);
        setSubstituteTeacherId('');
        setReason(absentReason);
        setNotes('');
        setSubmissionError(null);
        setIsAddModalOpen(true);
    };
    
    const handleQuickAssign = (entry: ScheduleEntry, subTeacherId: string) => {
        setEntryToSubstitute(entry);
        setSubstituteTeacherId(subTeacherId);
        setReason(absentReason);
        setNotes('');
        setSubmissionError(null);
        setIsAddModalOpen(true);
    };

    const handleSubmit = async (replaceId?: string) => {
        if (!entryToSubstitute || !substituteTeacherId || !reason || !selectedDate) {
            alert('ข้อมูลไม่ครบถ้วน');
            return;
        }

        setSubmissionError(null);

        const newSubData: Omit<Substitution, 'id' | 'id_school'> = {
            substitutionDate: selectedDate,
            absentTeacherId,
            substituteTeacherId,
            originalScheduleEntryId: entryToSubstitute.id,
            reason,
            notes,
        };
        
        // If we are not in a replacement flow, check for conflicts first.
        if (!replaceId) {
            const existingSub = substitutions.find(s => s.originalScheduleEntryId === entryToSubstitute.id);
            if (existingSub) {
                setReplaceInfo({ existingSub, newSubData });
                setIsReplaceModalOpen(true);
                return; // Stop here and wait for user confirmation
            }
        }

        // Proceed with adding/replacing
        const result = await addSubstitution(newSubData, replaceId);
        if (result.success) {
            setIsAddModalOpen(false);
            setIsReplaceModalOpen(false);
            setReplaceInfo(null);
        } else {
            setSubmissionError(result.message || 'เกิดข้อผิดพลาดที่ไม่รู้จัก');
        }
    };
    
    const handleConfirmReplace = () => {
        if (replaceInfo) {
            handleSubmit(replaceInfo.existingSub.id);
        }
    };

    const handleConfirmDelete = async () => {
        if (subToDelete) {
            const result = await deleteSubstitution(subToDelete.id);
            if (!result.success) {
                alert(`เกิดข้อผิดพลาด: ${result.message}`);
            }
            setIsDeleteModalOpen(false);
            setSubToDelete(null);
        }
    };

    const availableSubstituteTeachers = useMemo(() => {
        if (!entryToSubstitute) return [];
        
        const busyTeacherIds = new Set(
            scheduleForDay
                .filter(e => e.timeSlotId === entryToSubstitute.timeSlotId)
                .flatMap(e => e.teacherIds)
        );
        busyTeacherIds.add(absentTeacherId);

        return teachers.filter(t => !busyTeacherIds.has(t.id)).sort((a,b) => a.name.localeCompare(b.name, 'th'));
    }, [entryToSubstitute, scheduleForDay, teachers, absentTeacherId]);

    const sortedTeachers = [...teachers].sort((a, b) => a.name.localeCompare(b.name, 'th'));

    const handleSubstitutionExportToCsv = () => {
        if (substitutions.length === 0) {
            alert('ไม่มีข้อมูลสำหรับส่งออก');
            return;
        }
        const headers = ["คาบที่", "เวลา", "ครูที่ไม่มา", "เหตุผล", "ครูที่สอนแทน", "รหัสวิชา", "วิชา/กิจกรรม", "กลุ่มเรียน", "สถานที่", "หมายเหตุ"];
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += headers.join(',') + '\r\n';
        substitutions.forEach(sub => {
            const row = [
                sub.timeSlotPeriod,
                `${sub.startTime.slice(0,5)}-${sub.endTime.slice(0,5)}`,
                sub.absentTeacherName,
                sub.reason,
                sub.substituteTeacherName,
                sub.subjectCode || '',
                sub.subjectName,
                sub.classGroupName,
                sub.locationName,
                sub.notes || ''
            ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
            csvContent += row + '\r\n';
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `substitutions_${selectedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSubstitutionPrintPdf = () => {
        if (substitutions.length === 0) {
            alert('ไม่มีข้อมูลสำหรับพิมพ์');
            return;
        }
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write('<html><head><title>รายการสอนแทน</title>');
            printWindow.document.write(`<style> body { font-family: sans-serif; margin: 1in; } @page { size: A4 landscape; } h1, h2 { text-align: center; } table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10pt; } th, td { border: 1px solid #333; padding: 8px; text-align: left; word-break: break-word; } th { background-color: #e5e7eb; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } } </style>`);
            printWindow.document.write('</head><body>');
            printWindow.document.write(`<h1>${schoolInfo?.name || 'รายการสอนแทน'}</h1>`);
            printWindow.document.write(`<h2>รายการจัดสอนแทน วันที่ ${new Date(selectedDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })} (${dayOfWeek})</h2>`);
            let tableHtml = '<table><thead><tr>';
            const headers = ["ลำดับ", "คาบ", "ครูที่ไม่มา", "เหตุผล", "ครูที่สอนแทน", "รหัสวิชา", "วิชา/กิจกรรม", "กลุ่มเรียน", "สถานที่", "หมายเหตุ"];
            headers.forEach(h => tableHtml += `<th>${h}</th>`);
            tableHtml += '</tr></thead><tbody>';
            substitutions.sort((a,b) => a.timeSlotPeriod - b.timeSlotPeriod).forEach((sub, index) => {
                tableHtml += `<tr><td>${index + 1}</td><td>${sub.timeSlotPeriod} (${sub.startTime.slice(0,5)}-${sub.endTime.slice(0,5)})</td><td>${sub.absentTeacherName}</td><td>${sub.reason}</td><td>${sub.substituteTeacherName}</td><td>${sub.subjectCode || ''}</td><td>${sub.subjectName}</td><td>${sub.classGroupName}</td><td>${sub.locationName}</td><td>${sub.notes || ''}</td></tr>`;
            });
            tableHtml += '</tbody></table>';
            printWindow.document.write(tableHtml);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };
    
    const chatbotContext = useMemo(() => {
        if (!selectedDate || !absentTeacherId) return null;

        const absentTeacher = teachers.find(t => t.id === absentTeacherId);
        const consideringTeachers = teachers.filter(t => consideringTeacherIds.includes(t.id));

        const absentTeacherSchedule = scheduleForDay.filter(e => e.teacherIds.includes(absentTeacherId)).map(e => {
            return {
                period: timeSlots.find(ts => ts.id === e.timeSlotId)?.period,
                subject: subjects.find(s => s.code === e.subjectCode)?.name || e.customActivity,
                classGroup: classGroups.find(cg => cg.id === e.classGroupId)?.name,
                location: locations.find(l => l.id === e.locationId)?.name
            }
        });

        const freeTeachersFormatted = Object.entries(freeConsideringTeachersBySlot).map(([timeSlotId, freeTeachers]) => {
            const period = timeSlots.find(ts => ts.id === timeSlotId)?.period;
            return {
                period,
                // FIX: Use a type assertion to ensure `freeTeachers` is treated as an array.
                teachers: (freeTeachers as Teacher[]).map(t => t.name)
            }
        }).filter(item => item.teachers.length > 0);

        return {
            page: "Substitute Arrangement",
            selectedDate,
            dayOfWeek,
            absentTeacher: absentTeacher ? { name: absentTeacher.name, subjectGroup: absentTeacher.subjectGroup } : null,
            absentTeacherSchedule,
            consideringTeachers: consideringTeachers.map(t => t.name),
            freeTeachersBySlot: freeTeachersFormatted,
            arrangedSubstitutions: substitutions.map(s => ({
                period: s.timeSlotPeriod,
                absentTeacher: s.absentTeacherName,
                substituteTeacher: s.substituteTeacherName,
                subject: s.subjectName,
                classGroup: s.classGroupName
            }))
        };
    }, [
        selectedDate, dayOfWeek, absentTeacherId, consideringTeacherIds, 
        teachers, scheduleForDay, timeSlots, subjects, classGroups, locations, 
        freeConsideringTeachersBySlot, substitutions
    ]);

    const showChatbot = user && (user.role === 'admin' || user.role === 'super') && schoolInfo?.features?.AIChatbot;

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">จัดสอนแทน</h1>
            <div className="mb-6 p-4 bg-white rounded-lg shadow space-y-4">
                 <div className="flex items-center gap-3">
                    <label htmlFor="sub-date" className="text-lg font-medium text-gray-700">เลือกวันที่:</label>
                    <input type="date" id="sub-date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="p-2 border border-gray-300 rounded-md shadow-sm"/>
                    {dayOfWeek && <span className="text-lg font-semibold text-blue-600">{dayOfWeek}</span>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-lg font-medium text-gray-700 mb-2">ครูที่ไม่มาปฏิบัติหน้าที่:</label>
                        <select value={absentTeacherId} onChange={e => setAbsentTeacherId(e.target.value)} className="w-full p-2 border rounded">
                             <option value="">-- เลือกครู --</option>
                            {sortedTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-lg font-medium text-gray-700 mb-2">เหตุผลที่ไม่มา:</label>
                        <select 
                            value={absentReason} 
                            onChange={e => setAbsentReason(e.target.value)} 
                            className="w-full p-2 border rounded"
                            disabled={!absentTeacherId}
                        >
                            {['ลาป่วย', 'ลากิจ', 'ไปราชการ', 'อื่น ๆ'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <SearchableMultiSelect
                            label="ครูที่จะพิจารณาสอนแทน:"
                            options={sortedTeachers.filter(t => t.id !== absentTeacherId)}
                            selectedIds={consideringTeacherIds}
                            onChange={setConsideringTeacherIds}
                            allTeachers={teachers}
                            viewType='teacher'
                            widthClass="w-full"
                        />
                    </div>
                </div>
            </div>
            
            {/* Timetable Grid Display */}
            <div className="bg-white p-4 rounded-lg shadow">
                 <h2 className="text-2xl font-semibold text-gray-700 mb-4">ตารางสอนวันที่ {selectedDate} ({dayOfWeek})</h2>
                 <div className="overflow-x-auto">
                     <div className="grid" style={{ gridTemplateColumns: `60px repeat(${timeSlots.length}, 1fr)` }}>
                        <div className="sticky top-0 left-0 z-20 bg-white font-semibold text-sm text-center p-1">คาบ</div>
                        {timeSlots.map(ts => (
                            <div key={ts.id} className="sticky top-0 z-10 bg-white font-semibold text-sm text-center border-l p-1">
                                <p>{ts.period}</p>
                                <p className="text-xs text-gray-500">{ts.startTime.slice(0, 5)}-{ts.endTime.slice(0, 5)}</p>
                            </div>
                        ))}

                        <div className="sticky left-0 z-10 bg-white font-semibold text-sm text-center border-t pt-2">เวลา</div>
                         {timeSlots.map(ts => {
                            const absentEntry = scheduleForDay.find(e => e.timeSlotId === ts.id && e.teacherIds.includes(absentTeacherId));
                            const absentTeacherDetails = teachers.find(t => t.id === absentTeacherId);
                            
                            const otherSubstitutions = substitutions.filter(sub => 
                                sub.timeSlotPeriod === ts.period &&
                                consideringTeacherIds.includes(sub.substituteTeacherId) &&
                                (!absentTeacherDetails || sub.absentTeacherName !== absentTeacherDetails.name)
                            );
                            
                            const teachersBusyWithOtherSubs = new Set(otherSubstitutions.map(s => s.substituteTeacherId));

                            const consideringEntries = scheduleForDay.filter(e => 
                                e.timeSlotId === ts.id &&
                                e.id !== absentEntry?.id &&
                                e.teacherIds.some(tid => consideringTeacherIds.includes(tid) && !teachersBusyWithOtherSubs.has(tid))
                            );

                            const freeTeachers = (freeConsideringTeachersBySlot[ts.id] || []).filter(
                                teacher => !teachersBusyWithOtherSubs.has(teacher.id)
                            );

                            const substitution = absentEntry ? substitutions.find(s => s.originalScheduleEntryId === absentEntry.id) : null;

                            return (
                                <div key={ts.id} className="border-l border-t p-1 space-y-1">
                                    {/* 1. Absent Teacher's Card */}
                                    {absentEntry && (
                                        <ScheduleCard 
                                            key={absentEntry.id} 
                                            entry={absentEntry} 
                                            bgColor={substitution ? undefined : "bg-yellow-300"} 
                                            textColor={substitution ? "text-gray-800" : "text-red-800"} 
                                            isClickable={true} 
                                            onClick={() => handleOpenAddModal(absentEntry)}
                                            statusText={substitution ? `แทนโดย: ${substitution.substituteTeacherName}` : undefined}
                                            style={substitution ? { backgroundColor: getTeacherColor(substitution.substituteTeacherId) } : undefined}
                                        />
                                    )}

                                    {/* 2. Other substitutions by considering teachers */}
                                    {otherSubstitutions.map(sub => (
                                        <SubstitutionCard
                                            key={`sub-${sub.id}`}
                                            sub={sub}
                                            style={{ backgroundColor: getTeacherColor(sub.substituteTeacherId) }}
                                        />
                                    ))}

                                    {/* 3. Considering Teachers' Regular Schedule Cards */}
                                    {consideringEntries.map(entry => {
                                        const entryConsideringTeacherId = consideringTeacherIds.find(tid => entry.teacherIds.includes(tid));
                                        const colorStyle = entryConsideringTeacherId ? { backgroundColor: getTeacherColor(entryConsideringTeacherId) } : {};
                                        return (
                                            <ScheduleCard 
                                                key={entry.id} 
                                                entry={entry} 
                                                bgColor={!entryConsideringTeacherId ? "bg-blue-100" : undefined}
                                                textColor="text-gray-800"
                                                isClickable={false} 
                                                style={colorStyle}
                                            />
                                        );
                                    })}

                                    {/* 4. Free Teachers List & Manual button */}
                                    {absentEntry && (
                                        <div className="mt-1 p-1.5 bg-green-50 rounded-md border border-green-200">
                                            {freeTeachers.length > 0 && (
                                                 <>
                                                    <p className="text-xs font-semibold text-green-800 mb-1">ครูที่ว่าง:</p>
                                                    <ul className="space-y-1">
                                                        {freeTeachers.map((teacher: Teacher) => (
                                                            <li key={teacher.id} className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-700 truncate pr-1">{teacher.name}</span>
                                                                <button 
                                                                    onClick={() => handleQuickAssign(absentEntry, teacher.id)} 
                                                                    className="flex-shrink-0 bg-green-200 text-green-800 rounded-full w-5 h-5 flex items-center justify-center hover:bg-green-300"
                                                                    title={`จัดให้ ${teacher.name} สอนแทน`}
                                                                >
                                                                    <Plus size={14} />
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </>
                                            )}
                                            <button 
                                                onClick={() => handleOpenAddModal(absentEntry)} 
                                                className="w-full text-center text-xs mt-2 text-blue-600 hover:underline"
                                            >
                                                กำหนดเอง...
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                     </div>
                 </div>
            </div>

            {/* Arranged Substitutions List */}
             <div className="mt-8 p-4 bg-white rounded-lg shadow">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h2 className="text-2xl font-semibold text-gray-700">รายการสอนแทนที่จัดแล้ว</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={handleSubstitutionPrintPdf} className="flex items-center bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm">
                            <Printer size={18} className="mr-2"/> พิมพ์ PDF
                        </button>
                        <button onClick={handleSubstitutionExportToCsv} className="flex items-center bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm">
                            <FileDown size={18} className="mr-2"/> ส่งออก CSV
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-max">
                        <thead className="bg-gray-100">
                            <tr>
                                {['คาบ', 'ครูที่ไม่มา', 'เหตุผล', 'ครูที่สอนแทน', 'รหัสวิชา', 'วิชา/กิจกรรม', 'กลุ่มเรียน', 'สถานที่', 'หมายเหตุ', 'การดำเนินการ'].map(h => 
                                    <th key={h} className="p-3 text-left font-semibold text-gray-600">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {substitutions.length > 0 ? substitutions.sort((a,b) => a.timeSlotPeriod - b.timeSlotPeriod).map(sub => (
                                <tr key={sub.id} className="border-t hover:bg-gray-50">
                                    <td className="p-3">{sub.timeSlotPeriod} ({sub.startTime.slice(0,5)}-{sub.endTime.slice(0,5)})</td>
                                    <td className="p-3">{sub.absentTeacherName}</td>
                                    <td className="p-3">{sub.reason}</td>
                                    <td className="p-3 font-medium text-green-700">{sub.substituteTeacherName}</td>
                                    <td className="p-3">{sub.subjectCode || '-'}</td>
                                    <td className="p-3">{sub.subjectName}</td>
                                    <td className="p-3">{sub.classGroupName}</td>
                                    <td className="p-3">{sub.locationName}</td>
                                    <td className="p-3">{sub.notes || '-'}</td>
                                    <td className="p-3 text-center">
                                        <button
                                            onClick={() => {
                                                setSubToDelete(sub);
                                                setIsDeleteModalOpen(true);
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                            title="ลบรายการ"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={10} className="text-center p-4 text-gray-500">ไม่มีรายการสอนแทนในวันที่เลือก</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Add Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="จัดสอนแทน">
                {entryToSubstitute && (
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
                         <div>
                            <p><strong>คาบสอน:</strong> {subjects.find(s=>s.code === entryToSubstitute.subjectCode)?.name || entryToSubstitute.customActivity}</p>
                            <p><strong>ครูที่ไม่มา:</strong> {teachers.find(t=>t.id === absentTeacherId)?.name}</p>
                         </div>
                         <div>
                            <label className="block text-gray-700">ครูผู้สอนแทน</label>
                            <select value={substituteTeacherId} onChange={e => setSubstituteTeacherId(e.target.value)} className="w-full p-2 border rounded" required>
                                <option value="">-- เลือกครู (เฉพาะครูที่ว่าง) --</option>
                                {availableSubstituteTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700">เหตุผล</label>
                            <select value={reason} onChange={e => setReason(e.target.value)} className="w-full p-2 border rounded" required>
                                {['ลาป่วย', 'ลากิจ', 'ไปราชการ', 'อื่น ๆ'].map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700">หมายเหตุ</label>
                            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 border rounded" />
                        </div>

                        {submissionError && (
                            <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                                <span className="font-medium">ผิดพลาด!</span> {submissionError}
                            </div>
                        )}

                        <div className="flex justify-end pt-4"><button type="button" onClick={() => setIsAddModalOpen(false)} className="bg-gray-500 text-white px-4 py-2 rounded-lg mr-2">ยกเลิก</button><button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-lg">บันทึก</button></div>
                    </form>
                )}
            </Modal>
            
             {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="ยืนยันการลบ">
                <p>คุณแน่ใจหรือไม่ว่าต้องการลบรายการสอนแทนของ <strong>{subToDelete?.absentTeacherName}</strong> ที่สอนแทนโดย <strong>{subToDelete?.substituteTeacherName}</strong>?</p>
                <div className="flex justify-end pt-6"><button type="button" onClick={() => setIsDeleteModalOpen(false)} className="bg-gray-500 text-white px-4 py-2 rounded-lg mr-2">ยกเลิก</button><button type="button" onClick={handleConfirmDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg">ยืนยันการลบ</button></div>
            </Modal>

            {/* Replace Confirmation Modal */}
            <Modal isOpen={isReplaceModalOpen} onClose={() => setIsReplaceModalOpen(false)} title="ยืนยันการแทนที่">
                {replaceInfo && (
                     <div>
                        <p className="mb-4 text-red-600 font-semibold">คาบสอนนี้มีการจัดสอนแทนไว้แล้ว</p>
                        <div className="p-3 bg-yellow-50 border rounded-md">
                            <p><strong>ครูที่สอนแทนเดิม:</strong> {replaceInfo.existingSub.substituteTeacherName}</p>
                            <p><strong>เหตุผลเดิม:</strong> {replaceInfo.existingSub.reason}</p>
                        </div>
                        <p className="my-4">คุณต้องการแทนที่ด้วยรายการใหม่นี้ใช่หรือไม่?</p>
                        <div className="p-3 bg-green-50 border rounded-md">
                            <p><strong>ครูที่สอนแทนใหม่:</strong> {teachers.find(t=>t.id === replaceInfo.newSubData.substituteTeacherId)?.name}</p>
                            <p><strong>เหตุผลใหม่:</strong> {replaceInfo.newSubData.reason}</p>
                        </div>
                        <div className="flex justify-end pt-6"><button type="button" onClick={() => setIsReplaceModalOpen(false)} className="bg-gray-500 text-white px-4 py-2 rounded-lg mr-2">ยกเลิก</button><button type="button" onClick={handleConfirmReplace} className="bg-blue-600 text-white px-4 py-2 rounded-lg">ยืนยันการแทนที่</button></div>
                    </div>
                )}
            </Modal>
            {showChatbot && <AIChatbot contextData={chatbotContext} />}
        </div>
    );
};

export default SubstituteArrangement;