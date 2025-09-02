import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTimetable } from '../context/TimetableContext';
import TimetableGrid from '../components/TimetableGrid';
import Modal from '../components/Modal';
import { ScheduleEntry, Subject } from '../types';
import { CheckCircle, Search, X, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { SUBJECT_GROUP_OPTIONS } from '../constants';

type ConflictState = {
    message: string;
    conflict: {
        type: 'teacher' | 'location';
        conflictingEntry: ScheduleEntry;
        message: string;
    };
} | null;

type ArrangeByType = 'classGroup' | 'teacher';

const SubjectProgressTracker: React.FC<{ selectedClassGroupId: string }> = ({ selectedClassGroupId }) => {
    const { subjects, classGroups, schedule, schoolInfo } = useTimetable();
    const { currentSemester } = schoolInfo;

    const classGroupSubjects = useMemo(() => {
        const selectedClassGroup = classGroups.find(cg => cg.id === selectedClassGroupId);
        if (!selectedClassGroup) return [];

        return subjects.filter(subject => {
            if (subject.semester !== 0 && subject.semester !== currentSemester) return false;

            const classGrade = selectedClassGroup.gradeLevel;
            if (subject.gradeLevel === classGrade) return true;

            const classGradeNum = parseInt(classGrade.split('.')[1]);
            if (classGradeNum <= 3 && subject.gradeLevel === 'ม.ต้น(ม.1-3)') return true;
            if (classGradeNum >= 4 && subject.gradeLevel === 'ม.ปลาย(ม.4-6)') return true;
            
            return false;
        });
    }, [selectedClassGroupId, classGroups, subjects, currentSemester]);

    const scheduledCounts = useMemo(() => {
        const counts: { [subjectCode: string]: number } = {};
        schedule
            .filter(entry => entry.classGroupId === selectedClassGroupId && entry.subjectCode)
            .forEach(entry => {
                counts[entry.subjectCode!] = (counts[entry.subjectCode!] || 0) + 1;
            });
        return counts;
    }, [schedule, selectedClassGroupId]);

    if (!selectedClassGroupId || classGroupSubjects.length === 0) return null;

    return (
        <div className="p-4 bg-white rounded-lg shadow mb-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-3">รายวิชาที่ต้องจัด (ภาคเรียนปัจจุบัน)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {classGroupSubjects.map(subject => {
                    const count = scheduledCounts[subject.code] || 0;
                    const isCompleted = count >= subject.periodsPerWeek;
                    return (
                        <div key={subject.code} className="flex items-center p-2 bg-gray-50 rounded-md">
                            {isCompleted ? (
                                <CheckCircle size={20} className="text-green-500 mr-2 flex-shrink-0" />
                            ) : (
                                <div className="w-5 h-5 border-2 border-gray-300 rounded-full mr-2 flex-shrink-0"></div>
                            )}
                            <div className="flex-grow">
                                <p className={`font-medium text-gray-800 ${isCompleted ? 'line-through text-gray-400' : ''}`}>{subject.name}</p>
                                <p className="text-sm text-gray-500">{count} / {subject.periodsPerWeek} คาบ</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const SearchableSubjectSelect: React.FC<{
    selectedSubjectCode: string | undefined;
    onSelect: (code: string) => void;
    subjects: Subject[];
}> = ({ selectedSubjectCode, onSelect, subjects }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const selectedSubject = subjects.find(s => s.code === selectedSubjectCode);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);
    
    useEffect(() => {
        if (selectedSubject) {
            setSearchTerm(`${selectedSubject.code} - ${selectedSubject.name}`);
        } else {
            setSearchTerm('');
        }
    }, [selectedSubject]);

    const filteredSubjects = subjects.filter(s =>
        s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {setSearchTerm(e.target.value); setIsOpen(true);}}
                    onFocus={() => setIsOpen(true)}
                    placeholder="ค้นหารหัสวิชาหรือชื่อวิชา..."
                    className="w-full p-2 pl-10 border rounded"
                />
            </div>
            {isOpen && (
                <ul className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                    {filteredSubjects.length > 0 ? filteredSubjects.map(s => (
                        <li key={s.code}
                            onClick={() => {
                                onSelect(s.code);
                                setIsOpen(false);
                            }}
                            className="p-2 hover:bg-blue-100 cursor-pointer"
                        >
                            {s.code} - {s.name}
                        </li>
                    )) : <li className="p-2 text-gray-500">ไม่พบรายวิชา</li>}
                </ul>
            )}
        </div>
    );
}


const TimetableArrangement: React.FC = () => {
    const { classGroups, subjects, teachers, locations, schedule, timeSlots, addScheduleEntry, updateScheduleEntry, deleteScheduleEntry, deleteConflictingEntryAndSave, schoolInfo } = useTimetable();
    const { currentSemester } = schoolInfo;
    const [arrangeBy, setArrangeBy] = useState<ArrangeByType>('classGroup');
    const [selectedId, setSelectedId] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [currentEntry, setCurrentEntry] = useState<Partial<ScheduleEntry> | null>(null);
    const [submissionError, setSubmissionError] = useState<ConflictState>(null);
    const [isCustomActivity, setIsCustomActivity] = useState(false);
    
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [displayOptions, setDisplayOptions] = useState({
        showSubjectName: true,
        showSubjectCode: false,
        showTeacher: true,
        showClassGroup: true,
        showLocation: true,
        useSubjectColors: true,
    });
    const [subjectFilters, setSubjectFilters] = useState({ onlyCurrentSemester: true, subjectGroup: '' });

    const handleCellClick = (day: string, timeSlotId: string) => {
        setIsCustomActivity(false);
        const newEntry: Partial<ScheduleEntry> = { day, timeSlotId, teacherIds: [], locationId: '' };
        if (arrangeBy === 'classGroup') {
            newEntry.classGroupId = selectedId;
        } else {
            newEntry.teacherIds = [selectedId];
        }
        setCurrentEntry(newEntry);
        setSubmissionError(null);
        setIsModalOpen(true);
    };
    
    const handleEditEntry = (entry: ScheduleEntry) => {
        setIsCustomActivity(!!entry.customActivity);
        setCurrentEntry(entry);
        setSubmissionError(null);
        setIsModalOpen(true);
    }
    
    const handleDeleteEntry = (id: string) => {
        if(window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบคาบเรียนนี้?')) {
            deleteScheduleEntry(id);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentEntry(null);
        setSubmissionError(null);
        setIsConfirmModalOpen(false);
        setIsCustomActivity(false);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'select-multiple') {
            const values = Array.from((e.target as HTMLSelectElement).selectedOptions, option => option.value);
            setCurrentEntry(prev => prev ? { ...prev, [name]: values } : null);
        } else {
            setCurrentEntry(prev => prev ? { ...prev, [name]: value } : null);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentEntry) return;

        const entryToSave: Partial<ScheduleEntry> = { ...currentEntry };
        if (isCustomActivity) {
            entryToSave.subjectCode = undefined;
            if (!entryToSave.teacherIds) entryToSave.teacherIds = [];
            if (!entryToSave.locationId) entryToSave.locationId = undefined;
            if (arrangeBy === 'teacher') {
                // For special activities arranged by teacher, classGroupId is not mandatory
            } else if (!entryToSave.classGroupId) {
                entryToSave.classGroupId = undefined;
            }
        } else {
            entryToSave.customActivity = undefined;
        }

        let result;
        if ('id' in entryToSave && entryToSave.id) { 
            result = await updateScheduleEntry(entryToSave as ScheduleEntry);
        } else {
            const { classGroupId, day, timeSlotId, subjectCode, customActivity, teacherIds, locationId } = entryToSave;
            const requiredFieldsPresent = day && timeSlotId && (subjectCode || customActivity);
            const classGroupValid = (arrangeBy === 'classGroup' || isCustomActivity) ? !!classGroupId : !!classGroupId;

            if (requiredFieldsPresent && (isCustomActivity && arrangeBy === 'teacher' ? true : classGroupValid)) {
                 result = await addScheduleEntry({ classGroupId, day, timeSlotId, subjectCode, customActivity, teacherIds: teacherIds || [], locationId });
            } else {
                alert("กรุณากรอกข้อมูลให้ครบถ้วน (กลุ่มเรียน, วิชา/กิจกรรม)");
                return;
            }
        }
        
        if (result && result.success) {
            handleCloseModal();
        } else if (result && result.conflict) {
            setSubmissionError({ message: result.message || 'Error', conflict: result.conflict });
            setIsConfirmModalOpen(true);
        }
    };
    
    const handleConfirmConflict = async () => {
        if (!currentEntry || !submissionError) return;
        
        const entryToSave = { ...currentEntry };
        if (isCustomActivity) {
            entryToSave.subjectCode = undefined;
        } else {
            entryToSave.customActivity = undefined;
        }
        
        await deleteConflictingEntryAndSave(
            entryToSave as Omit<ScheduleEntry, 'id'> | ScheduleEntry, 
            submissionError.conflict.conflictingEntry.id
        );
        
        handleCloseModal();
    }
    
    const filteredSchedule = useMemo(() => {
        if (!selectedId) return [];
        if (arrangeBy === 'classGroup') {
            return schedule.filter(e => e.classGroupId === selectedId);
        }
        return schedule.filter(e => e.teacherIds.includes(selectedId));
    }, [selectedId, arrangeBy, schedule]);

    const filteredSubjects = useMemo(() => {
        const classGroupId = arrangeBy === 'classGroup' ? selectedId : currentEntry?.classGroupId;
        if (!classGroupId) return subjects;
        const selectedClassGroup = classGroups.find(cg => cg.id === classGroupId);
        if (!selectedClassGroup) return subjects;

        return subjects.filter(subject => {
            if (subjectFilters.onlyCurrentSemester && subject.semester !== 0 && subject.semester !== currentSemester) return false;
            if (subjectFilters.subjectGroup && subject.subjectGroup !== subjectFilters.subjectGroup) return false;

            const classGrade = selectedClassGroup.gradeLevel;
            if (subject.gradeLevel === classGrade) return true;
            const classGradeNum = parseInt(classGrade.split('.')[1]);
            if (classGradeNum <= 3 && subject.gradeLevel === 'ม.ต้น(ม.1-3)') return true;
            if (classGradeNum >= 4 && subject.gradeLevel === 'ม.ปลาย(ม.4-6)') return true;
            return false;
        });
    }, [selectedId, currentEntry, arrangeBy, classGroups, subjects, subjectFilters, currentSemester]);
    
    const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setDisplayOptions(prev => ({ ...prev, [name]: checked }));
    };

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800">จัดตารางสอน</h1>
                <button onClick={() => setIsOptionsOpen(!isOptionsOpen)} className="flex items-center bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                    <Settings size={20} className="mr-2" />
                    ตัวเลือกการแสดงผล
                    {isOptionsOpen ? <ChevronUp size={20} className="ml-1" /> : <ChevronDown size={20} className="ml-1" />}
                </button>
            </div>
            {isOptionsOpen && (
                <div className="mb-6 p-4 bg-white rounded-lg shadow-md border animate-fade-in-down">
                    <h3 className="text-lg font-semibold mb-3 text-gray-700">ตั้งค่าการแสดงผลตาราง</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showSubjectName" checked={displayOptions.showSubjectName} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>ชื่อวิชา/กิจกรรม</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showSubjectCode" checked={displayOptions.showSubjectCode} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>รหัสวิชา</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showTeacher" checked={displayOptions.showTeacher} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>ครูผู้สอน</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showClassGroup" checked={displayOptions.showClassGroup} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>กลุ่มเรียน</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showLocation" checked={displayOptions.showLocation} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>สถานที่</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="useSubjectColors" checked={displayOptions.useSubjectColors} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>ใช้สีพื้นหลังรายวิชา</span></label>
                    </div>
                </div>
            )}
            <div className="mb-6 p-4 bg-white rounded-lg shadow">
                <div className="flex items-center space-x-4 mb-4">
                    <span className="text-lg font-medium text-gray-700">จัดตารางโดย:</span>
                    <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="arrangeBy" value="classGroup" checked={arrangeBy === 'classGroup'} onChange={() => { setArrangeBy('classGroup'); setSelectedId(''); }} className="form-radio h-5 w-5 text-blue-600" /><span className="text-gray-800">กลุ่มเรียน</span></label>
                    <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="arrangeBy" value="teacher" checked={arrangeBy === 'teacher'} onChange={() => { setArrangeBy('teacher'); setSelectedId(''); }} className="form-radio h-5 w-5 text-blue-600" /><span className="text-gray-800">ครูผู้สอน</span></label>
                </div>
                <label htmlFor="selection-dropdown" className="block text-lg font-medium text-gray-700 mb-2">{arrangeBy === 'classGroup' ? 'เลือกกลุ่มเรียน:' : 'เลือกครูผู้สอน:'}</label>
                <select id="selection-dropdown" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <option value="">-- กรุณาเลือก --</option>
                    {(arrangeBy === 'classGroup' ? classGroups : teachers).map(item => (<option key={item.id} value={item.id}>{item.name}</option>))}
                </select>
            </div>
            
            {arrangeBy === 'classGroup' && <SubjectProgressTracker selectedClassGroupId={selectedId} />}

            {selectedId && (
                <TimetableGrid 
                    entries={filteredSchedule} 
                    isEditable={true} 
                    onCellClick={handleCellClick}
                    onEditEntry={handleEditEntry}
                    onDeleteEntry={handleDeleteEntry}
                    viewContext={arrangeBy === 'classGroup' ? 'class' : 'teacher'}
                    displayOptions={displayOptions}
                />
            )}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={currentEntry?.id ? "แก้ไขคาบเรียน" : "เพิ่มคาบเรียน"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {arrangeBy === 'teacher' && (
                         <div className="mb-4">
                            <label className="block text-gray-700">กลุ่มเรียน</label>
                            <select name="classGroupId" value={currentEntry?.classGroupId || ''} onChange={handleFormChange} className="w-full p-2 border rounded" required={!isCustomActivity}><option value="">-- เลือกกลุ่มเรียน --</option>{classGroups.map(cg => <option key={cg.id} value={cg.id}>{cg.name}</option>)}</select>
                        </div>
                    )}

                    <div className="flex items-center space-x-3 mb-2"><input id="isCustomActivity" type="checkbox" checked={isCustomActivity} onChange={e => setIsCustomActivity(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" /><label htmlFor="isCustomActivity" className="text-gray-700 font-medium">กิจกรรมพิเศษ (ไม่ใช่วิชาสอน)</label></div>

                    {isCustomActivity ? (
                        <div><label className="block text-gray-700">ชื่อกิจกรรม</label><input name="customActivity" type="text" value={currentEntry?.customActivity || ''} onChange={handleFormChange} className="w-full p-2 border rounded" required /></div>
                    ) : (
                        <div className="space-y-3 p-3 border rounded-md bg-gray-50">
                            <h4 className="font-semibold text-gray-700">ตัวกรองรายวิชา</h4>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><label className="block text-gray-700 text-sm">กลุ่มสาระฯ</label><select value={subjectFilters.subjectGroup} onChange={e => setSubjectFilters(p => ({...p, subjectGroup: e.target.value}))} className="w-full p-2 border rounded text-sm"><option value="">ทั้งหมด</option>{SUBJECT_GROUP_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                                <label className="flex items-center space-x-2 pt-5"><input type="checkbox" checked={subjectFilters.onlyCurrentSemester} onChange={e => setSubjectFilters(p => ({...p, onlyCurrentSemester: e.target.checked}))} className="h-4 w-4 text-blue-600 border-gray-300 rounded" /><span>เฉพาะวิชาภาคเรียนปัจจุบัน</span></label>
                             </div>
                             <hr/>
                            <label className="block text-gray-700 font-semibold">รายวิชา</label>
                            <SearchableSubjectSelect subjects={filteredSubjects} selectedSubjectCode={currentEntry?.subjectCode} onSelect={(code) => setCurrentEntry(prev => prev ? {...prev, subjectCode: code} : null)} />
                        </div>
                    )}
                    
                    <div><label className="block text-gray-700">ครูผู้สอน (เลือกได้มากกว่า 1)</label><select name="teacherIds" multiple value={currentEntry?.teacherIds || []} onChange={handleFormChange} className="w-full p-2 border rounded h-32" required={!isCustomActivity}><option value="">-- เลือกครู --</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                    <div><label className="block text-gray-700">สถานที่</label><select name="locationId" value={currentEntry?.locationId || ''} onChange={handleFormChange} className="w-full p-2 border rounded" required={!isCustomActivity}><option value="">-- เลือกสถานที่ --</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                    <div className="flex justify-end pt-4"><button type="button" onClick={handleCloseModal} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 mr-2">ยกเลิก</button><button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">บันทึก</button></div>
                </form>
            </Modal>
            
            <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="ยืนยันการบันทึกทับ">
                {submissionError && (() => {
                    const { conflictingEntry } = submissionError.conflict;
                    const subject = subjects.find(s => s.code === conflictingEntry.subjectCode);
                    const entryTeachers = teachers.filter(t => conflictingEntry.teacherIds.includes(t.id));
                    const location = locations.find(l => l.id === conflictingEntry.locationId);
                    const classGroup = classGroups.find(cg => cg.id === conflictingEntry.classGroupId);
                    const timeSlot = timeSlots.find(ts => ts.id === conflictingEntry.timeSlotId);

                    return (
                        <div>
                            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert"><p className="font-bold">เกิดข้อขัดแย้งในการจัดตาราง</p><p>{submissionError.message}</p></div>
                            <p className="mb-4 text-gray-800 font-semibold">การยืนยันจะ <span className="text-red-600 font-bold">ลบ</span> คาบเรียนเดิมที่ขัดแย้งกันออกจากตาราง:</p>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2 text-sm text-gray-700">
                                <p><strong>กลุ่มเรียน:</strong> {classGroup?.name}</p>
                                <p><strong>วัน:</strong> {conflictingEntry.day}</p>
                                <p><strong>คาบที่:</strong> {timeSlot?.period} ({timeSlot?.startTime} - {timeSlot?.endTime})</p>
                                <p><strong>วิชา/กิจกรรม:</strong> {conflictingEntry.customActivity || subject?.name || 'N/A'}</p>
                                <p><strong>ครู:</strong> {entryTeachers.map(t => t.name).join(', ') || 'N/A'}</p>
                                <p><strong>สถานที่:</strong> {location?.name || 'N/A'}</p>
                            </div>
                            <p className="mt-4 font-semibold text-gray-800">คุณต้องการดำเนินการต่อหรือไม่?</p>
                            <div className="flex justify-end pt-6"><button type="button" onClick={() => setIsConfirmModalOpen(false)} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 mr-2">ยกเลิก</button><button type="button" onClick={handleConfirmConflict} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">ยืนยัน</button></div>
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
};

export default TimetableArrangement;