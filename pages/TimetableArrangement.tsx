import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTimetable } from '../context/TimetableContext';
import TimetableGrid from '../components/TimetableGrid';
import Modal from '../components/Modal';
import { ScheduleEntry, Subject, Location, ClassGroup, SchoolInfo } from '../types';
import { CheckCircle, Search, X, Settings, ChevronDown, ChevronUp, Move, Edit2, Filter } from 'lucide-react';
import { SUBJECT_GROUP_OPTIONS, SUBJECT_GROUP_COLORS, DAYS_OF_WEEK } from '../constants';
import AIChatbot from '../components/AIChatbot';
import { useAuth } from '../context/AuthContext';

type ConflictState = {
    message: string;
    conflict: {
        type: 'teacher' | 'location';
        conflictingEntry: ScheduleEntry;
        message: string;
    };
} | null;

type ArrangeByType = 'classGroup' | 'teacher';

const ManageSubjectsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    classGroup: ClassGroup;
    schoolInfo: SchoolInfo | null;
}> = ({ isOpen, onClose, classGroup, schoolInfo }) => {
    const { subjects: allSubjects, classGroupSubjects, updateClassGroupSubjects } = useTimetable();
    const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [subjectGroupFilter, setSubjectGroupFilter] = useState('');
    const [onlyCurrentSemester, setOnlyCurrentSemester] = useState(true);


    useEffect(() => {
        if (isOpen) {
            setSelectedCodes(new Set(classGroupSubjects.map(s => s.code)));
        }
    }, [isOpen, classGroupSubjects]);

    const availableSubjects = useMemo(() => {
        if (!classGroup || !schoolInfo) return [];
        const currentSemester = schoolInfo.currentSemester;
        return allSubjects.filter(subject => {
            if (onlyCurrentSemester && subject.semester !== 0 && subject.semester !== currentSemester) {
                return false;
            }
            const classGrade = classGroup.gradeLevel;
            if (subject.gradeLevel === classGrade) return true;
            const classGradeNum = parseInt(classGrade.split('.')[1]);
            if (classGradeNum <= 3 && subject.gradeLevel === 'ม.ต้น(ม.1-3)') return true;
            if (classGradeNum >= 4 && subject.gradeLevel === 'ม.ปลาย(ม.4-6)') return true;
            return false;
        }).sort((a,b) => a.name.localeCompare(b.name, 'th'));
    }, [classGroup, allSubjects, schoolInfo, onlyCurrentSemester]);
    
    const filteredSubjects = useMemo(() => {
        let subjectsToFilter = availableSubjects;
        if (subjectGroupFilter) {
            subjectsToFilter = subjectsToFilter.filter(s => s.subjectGroup === subjectGroupFilter);
        }

        if (!searchTerm) return subjectsToFilter;

        const lowerCaseSearch = searchTerm.toLowerCase();
        return subjectsToFilter.filter(s => 
            s.name.toLowerCase().includes(lowerCaseSearch) || 
            s.code.toLowerCase().includes(lowerCaseSearch)
        );
    }, [searchTerm, availableSubjects, subjectGroupFilter]);

    const handleToggle = (code: string) => {
        const newSelection = new Set(selectedCodes);
        if (newSelection.has(code)) {
            newSelection.delete(code);
        } else {
            newSelection.add(code);
        }
        setSelectedCodes(newSelection);
    };

    const handleSave = async () => {
        setIsLoading(true);
        const result = await updateClassGroupSubjects(classGroup.id, Array.from(selectedCodes));
        setIsLoading(false);
        if (result.success) {
            onClose();
        } else {
            alert(`เกิดข้อผิดพลาด: ${result.message}`);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`แก้ไขรายวิชาสำหรับ ${classGroup.name}`}>
            <div className="space-y-4">
                <input 
                    type="text"
                    placeholder="ค้นหารหัสวิชาหรือชื่อวิชา..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-2 border rounded-md"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 border rounded-md bg-gray-50">
                    <div>
                        <label htmlFor="sgf" className="block text-sm font-medium text-gray-700 mb-1">กรองตามกลุ่มสาระฯ</label>
                        <select id="sgf" value={subjectGroupFilter} onChange={e => setSubjectGroupFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                             <option value="">ทั้งหมด</option>
                            {SUBJECT_GROUP_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end pb-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={onlyCurrentSemester} onChange={e => setOnlyCurrentSemester(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="text-gray-800">เฉพาะวิชาภาคเรียนปัจจุบัน</span>
                        </label>
                    </div>
                </div>
                <div className="max-h-80 overflow-y-auto border rounded-md p-2 space-y-2">
                    {filteredSubjects.map(subject => (
                        <label key={subject.code} className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-md cursor-pointer">
                            <input 
                                type="checkbox"
                                checked={selectedCodes.has(subject.code)}
                                onChange={() => handleToggle(subject.code)}
                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-gray-800">{subject.name} ({subject.code}) - {subject.periodsPerWeek} คาบ/สัปดาห์</span>
                        </label>
                    ))}
                     {filteredSubjects.length === 0 && <p className="text-center text-gray-500 p-4">ไม่พบรายวิชาที่ตรงกับเงื่อนไข</p>}
                </div>
                <div className="flex justify-end pt-4 border-t">
                    <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg mr-2 hover:bg-gray-300">ยกเลิก</button>
                    <button onClick={handleSave} disabled={isLoading} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
                        {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};


const SubjectsToSchedulePanel: React.FC<{
    selectedClassGroupId: string;
    allRelevantSubjects: Subject[];
    scheduledCounts: { [subjectCode: string]: number };
    incompleteSubjects: { subject: Subject; count: number; firstEntry: ScheduleEntry | undefined }[];
}> = ({ selectedClassGroupId, allRelevantSubjects, scheduledCounts, incompleteSubjects }) => {
    const { classGroups, schoolInfo, subjects } = useTimetable();
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [subjectGroupFilter, setSubjectGroupFilter] = useState<string>('');

    if (!schoolInfo) return null;
    const { currentSemester, academicYear } = schoolInfo;

    const selectedClassGroup = classGroups.find(cg => cg.id === selectedClassGroupId);

    const getSubjectColor = (entryOrSubject: ScheduleEntry | Subject): string => {
        const subject = 'code' in entryOrSubject ? entryOrSubject : subjects.find(s => s.code === entryOrSubject.subjectCode);
        if (!subject) return '#f3f4f6'; // A neutral gray
        const baseColor = SUBJECT_GROUP_COLORS[subject.subjectGroup] || SUBJECT_GROUP_COLORS.default;
        return `hsl(${baseColor.h}, ${baseColor.s}%, 85%)`;
    };
    
    const displayedSubjects = useMemo(() => {
        if (!subjectGroupFilter) return allRelevantSubjects;
        return allRelevantSubjects.filter(s => s.subjectGroup === subjectGroupFilter);
    }, [allRelevantSubjects, subjectGroupFilter]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, subject: Subject, firstEntry: ScheduleEntry | undefined) => {
        const data = JSON.stringify({
            type: 'new',
            subjectCode: subject.code,
            originalEntryId: firstEntry ? firstEntry.id : undefined,
        });
        e.dataTransfer.setData("application/json", data);
        e.currentTarget.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.style.opacity = '1';
    };

    if (!selectedClassGroupId || !selectedClassGroup) return null;

    return (
        <div className="p-4 bg-white rounded-lg shadow mb-6">
            <ManageSubjectsModal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} classGroup={selectedClassGroup} schoolInfo={schoolInfo} />
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3 gap-3">
                <h3 className="text-xl font-semibold text-gray-700">รายวิชาที่ต้องจัด (ปี {academicYear} เทอม {currentSemester})</h3>
                 <div className="flex items-center gap-2">
                     <div className="relative">
                        <Filter size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select 
                            value={subjectGroupFilter} 
                            onChange={e => setSubjectGroupFilter(e.target.value)}
                            className="pl-8 pr-2 py-1 border rounded-md text-sm"
                        >
                            <option value="">กลุ่มสาระฯ ทั้งหมด</option>
                            {SUBJECT_GROUP_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <button onClick={() => setIsManageModalOpen(true)} className="flex items-center bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 text-sm">
                        <Edit2 size={16} className="mr-2"/> แก้ไขรายวิชา
                    </button>
                </div>
            </div>
            {allRelevantSubjects.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {displayedSubjects.map(subject => {
                        const count = scheduledCounts[subject.code] || 0;
                        const isCompleted = count >= subject.periodsPerWeek;
                        return (
                            <div key={subject.code} className="flex items-center p-2 bg-gray-50 rounded-md">
                                {isCompleted ? (
                                    <CheckCircle size={20} className="text-green-500 mr-2 flex-shrink-0" />
                                ) : (
                                    <div className="w-5 h-5 border-2 border-yellow-400 rounded-full mr-2 flex-shrink-0"></div>
                                )}
                                <div className="flex-grow overflow-hidden">
                                    <p className={`font-medium text-gray-800 truncate ${isCompleted ? 'line-through text-gray-400' : ''}`} title={subject.name}>{subject.name}</p>
                                    <p className="text-sm text-gray-500">{count} / {subject.periodsPerWeek} คาบ</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-center text-gray-500 py-4">กรุณาคลิก 'แก้ไขรายวิชา' เพื่อกำหนดวิชาที่ต้องเรียนสำหรับกลุ่มเรียนนี้ หรือเริ่มจัดตารางได้เลย</p>
            )}

            {incompleteSubjects.length > 0 && (
                <>
                    <h3 className="text-xl font-semibold text-gray-700 mb-3 mt-6">รายวิชาที่ยังจัดไม่ครบ (ลากเพื่อวาง)</h3>
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {incompleteSubjects.map(({ subject, count, firstEntry }) => {
                            const bgColor = getSubjectColor(subject);
                            const borderColor = `hsl(${(SUBJECT_GROUP_COLORS[subject.subjectGroup] || SUBJECT_GROUP_COLORS.default).h}, ${(SUBJECT_GROUP_COLORS[subject.subjectGroup] || SUBJECT_GROUP_COLORS.default).s}%, 70%)`;
                            
                            return (
                                <div
                                    key={subject.code}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, subject, firstEntry)}
                                    onDragEnd={handleDragEnd}
                                    className="flex items-center p-3 rounded-md border cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md"
                                    style={{ backgroundColor: bgColor, borderColor: borderColor }}
                                    title={`ลากเพื่อจัดคาบที่ ${count + 1} ของวิชา ${subject.name}`}
                                >
                                    <Move size={20} className="text-gray-700 mr-3 flex-shrink-0" />
                                    <div className="flex-grow overflow-hidden">
                                        <p className="font-semibold text-gray-900 truncate" title={subject.name}>{subject.name}</p>
                                        <p className="text-sm text-gray-800">{count} / {subject.periodsPerWeek} คาบ</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
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
    const { 
        activeClassGroups,
        activeSubjects,
        activeTeachers,
        activeLocations,
        schedule, 
        timeSlots, 
        addScheduleEntry, 
        updateScheduleEntry, 
        deleteScheduleEntry, 
        deleteConflictingEntryAndSave, 
        schoolInfo,
        fetchClassGroupSubjects,
        classGroupSubjects,
    } = useTimetable();
    const { user } = useAuth();
    
    const classGroups = activeClassGroups;
    const subjects = activeSubjects;
    const teachers = activeTeachers;
    const locations = activeLocations;

    const [arrangeBy, setArrangeBy] = useState<ArrangeByType>('classGroup');
    const [selectedId, setSelectedId] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [currentEntry, setCurrentEntry] = useState<Partial<ScheduleEntry> & { originalEntryIdToMove?: string } | null>(null);
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
    const [showOnlyPlannedSubjects, setShowOnlyPlannedSubjects] = useState(true);

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [entryToDelete, setEntryToDelete] = useState<ScheduleEntry | null>(null);
    const [classGroupInputMode, setClassGroupInputMode] = useState<'select' | 'text'>('select');

    const memoizedFetchClassGroupSubjects = useCallback(fetchClassGroupSubjects, []);

    useEffect(() => {
        if (arrangeBy === 'classGroup' && selectedId) {
            memoizedFetchClassGroupSubjects(selectedId);
        }
    }, [arrangeBy, selectedId, memoizedFetchClassGroupSubjects]);

    const sortedClassGroups = useMemo(() => 
        [...classGroups].sort((a, b) => a.name.localeCompare(b.name, 'th', { numeric: true })),
    [classGroups]);
    
    const sortedTeachers = useMemo(() => 
        [...teachers].sort((a, b) => a.name.localeCompare(b.name, 'th')),
    [teachers]);
    
    const sortedTeachersForModal = useMemo(() => {
        if (!subjectFilters.subjectGroup) {
            return sortedTeachers;
        }

        const filteredGroupTeachers = teachers
            .filter(t => t.subjectGroup === subjectFilters.subjectGroup)
            .sort((a, b) => a.name.localeCompare(b.name, 'th'));
        
        const otherTeachers = teachers
            .filter(t => t.subjectGroup !== subjectFilters.subjectGroup)
            .sort((a, b) => a.name.localeCompare(b.name, 'th'));

        return [...filteredGroupTeachers, ...otherTeachers];
    }, [teachers, subjectFilters.subjectGroup, sortedTeachers]);

    const sortedLocationsForModal = useMemo(() => {
        if (!currentEntry?.teacherIds || currentEntry.teacherIds.length === 0) {
            return [...locations].sort((a, b) => a.name.localeCompare(b.name, 'th'));
        }

        const selectedTeacherIds = new Set(currentEntry.teacherIds);
        const responsibleLocations: Location[] = [];
        const otherLocations: Location[] = [];

        for (const location of locations) {
            if (location.responsibleTeacherId && selectedTeacherIds.has(location.responsibleTeacherId)) {
                responsibleLocations.push(location);
            } else {
                otherLocations.push(location);
            }
        }
        responsibleLocations.sort((a, b) => a.name.localeCompare(b.name, 'th'));
        otherLocations.sort((a, b) => a.name.localeCompare(b.name, 'th'));

        return [...responsibleLocations, ...otherLocations];
    }, [locations, currentEntry?.teacherIds]);

    const handleCellClick = (day: string, timeSlotId: string) => {
        setIsCustomActivity(false);
        setShowOnlyPlannedSubjects(true);
        setClassGroupInputMode('select');
        const newEntry: Partial<ScheduleEntry> = { day, timeSlotId, teacherIds: [] };
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
        setShowOnlyPlannedSubjects(true);
        setCurrentEntry(entry);
        setSubmissionError(null);
        setIsModalOpen(true);
    
        if (entry.customActivity && entry.classGroupId) {
            const isRealGroup = activeClassGroups.some(cg => cg.id === entry.classGroupId);
            setClassGroupInputMode(isRealGroup ? 'select' : 'text');
        } else {
            setClassGroupInputMode('select');
        }
    }
    
    const handleDeleteClick = (entry: ScheduleEntry) => {
        setEntryToDelete(entry);
        setIsDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!entryToDelete) return;
        const result = await deleteScheduleEntry(entryToDelete.id);
        if (!result.success) {
            alert(`เกิดข้อผิดพลาดในการลบ: ${result.message}`);
        }
        setIsDeleteConfirmOpen(false);
        setEntryToDelete(null);
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

        const { originalEntryIdToMove, ...entryData } = currentEntry;
        const entryToSave: Partial<ScheduleEntry> = { ...entryData };

        if (entryToSave.locationId === '') entryToSave.locationId = undefined;
        if (entryToSave.classGroupId === '') entryToSave.classGroupId = undefined;

        if (isCustomActivity) {
            entryToSave.subjectCode = undefined;
            if (!entryToSave.teacherIds) entryToSave.teacherIds = [];
        } else {
            entryToSave.customActivity = undefined;
        }

        let result;
        if ('id' in entryToSave && entryToSave.id) { 
            result = await updateScheduleEntry(entryToSave as Omit<ScheduleEntry, 'academicYear' | 'semester'>);
             if (result && result.success) {
                handleCloseModal();
            } else if (result && result.conflict) {
                setSubmissionError({ message: result.message || 'Error', conflict: result.conflict });
                setIsModalOpen(false);
                setIsConfirmModalOpen(true);
            } else if (result) {
                alert(`เกิดข้อผิดพลาด: ${result.message || 'ไม่สามารถบันทึกข้อมูลได้'}`);
            }
        } else {
            const { classGroupId, day, timeSlotId, subjectCode, customActivity, teacherIds, locationId } = entryToSave;
            const requiredFieldsPresent = day && timeSlotId && (subjectCode || customActivity);

            if (requiredFieldsPresent) {
                 result = await addScheduleEntry({ classGroupId, day, timeSlotId, subjectCode, customActivity, teacherIds: teacherIds || [], locationId });
                 if (result.success) {
                    if (originalEntryIdToMove) {
                        const deleteResult = await deleteScheduleEntry(originalEntryIdToMove);
                        if (!deleteResult.success) {
                            console.error(`CRITICAL: Move successful but failed to delete original entry ${originalEntryIdToMove}.`);
                            alert("คำเตือน: ย้ายคาบสอนสำเร็จ แต่ไม่สามารถลบคาบสอนเดิมได้ อาจมีข้อมูลซ้ำซ้อน");
                        }
                    }
                    handleCloseModal();
                } else if (result.conflict) {
                    setSubmissionError({ message: result.message || 'Error', conflict: result.conflict });
                    setIsModalOpen(false);
                    setIsConfirmModalOpen(true);
                } else {
                    alert(`เกิดข้อผิดพลาด: ${result.message || 'ไม่สามารถบันทึกข้อมูลได้'}`);
                }
            } else {
                alert("กรุณากรอกข้อมูลให้ครบถ้วน (วิชา/กิจกรรม)");
            }
        }
    };
    
    const handleConfirmConflict = async () => {
        if (!currentEntry || !submissionError) return;
        
        const { originalEntryIdToMove, ...entryData } = currentEntry;
        const entryToSave = { ...entryData };
        if (isCustomActivity) entryToSave.subjectCode = undefined;
        else entryToSave.customActivity = undefined;
        
        const result = await deleteConflictingEntryAndSave(
            entryToSave as Omit<ScheduleEntry, 'id' | 'id_school' | 'academicYear' | 'semester'> | Omit<ScheduleEntry, 'id_school' | 'academicYear' | 'semester'>, 
            submissionError.conflict.conflictingEntry.id
        );

        if (result.success && originalEntryIdToMove) {
            const deleteResult = await deleteScheduleEntry(originalEntryIdToMove);
            if (!deleteResult.success) {
                console.error(`CRITICAL: Moved with conflict resolution but failed to delete original entry ${originalEntryIdToMove}.`);
                alert("คำเตือน: ย้ายคาบสอนสำเร็จ แต่ไม่สามารถลบคาบสอนเดิมได้ อาจมีข้อมูลซ้ำซ้อน");
            }
        }

        handleCloseModal();
    }
    
    const handleDragStartEntry = (event: React.DragEvent<HTMLDivElement>, entry: ScheduleEntry) => {
        const data = JSON.stringify({
            type: 'move',
            entryId: entry.id,
        });
        event.dataTransfer.setData("application/json", data);
        event.currentTarget.style.opacity = '0.5';
    };

    const handleDragEndEntry = (event: React.DragEvent<HTMLDivElement>) => {
        event.currentTarget.style.opacity = '1';
    };

    const handleDrop = (event: React.DragEvent<HTMLTableCellElement>, day: string, timeSlotId: string) => {
        event.preventDefault();
        try {
            const data = JSON.parse(event.dataTransfer.getData('application/json'));

            if (data.type === 'move' && data.entryId) {
                // It's a move operation
                const originalEntry = schedule.find(e => e.id === data.entryId);
                if (!originalEntry) return;

                // Prepare new entry for modal, copying details and adding original ID for later deletion
                const entryToOpen: Partial<ScheduleEntry> & { originalEntryIdToMove?: string } = {
                    day,
                    timeSlotId,
                    classGroupId: originalEntry.classGroupId,
                    subjectCode: originalEntry.subjectCode,
                    customActivity: originalEntry.customActivity,
                    teacherIds: originalEntry.teacherIds,
                    locationId: originalEntry.locationId,
                    originalEntryIdToMove: originalEntry.id,
                };

                setCurrentEntry(entryToOpen);
                setIsCustomActivity(!!originalEntry.customActivity);
                setSubmissionError(null);
                setIsModalOpen(true);

            } else if (data.type === 'new' && data.subjectCode) {
                // It's a new entry from the subject panel
                const { subjectCode, originalEntryId } = data;
                let teacherIds: string[] = [];
                let locationId: string | undefined = undefined;

                if (originalEntryId) {
                    const existingEntry = schedule.find(e => e.id === originalEntryId);
                    if (existingEntry) {
                        teacherIds = existingEntry.teacherIds;
                        locationId = existingEntry.locationId;
                    }
                }
                
                if (!locationId) {
                     const allEntriesForSubject = schedule.filter(e => e.subjectCode === subjectCode && e.classGroupId === selectedId && e.locationId);
                    if (allEntriesForSubject.length > 0) {
                        const sortedEntries = [...allEntriesForSubject].sort((a, b) => {
                            const dayIndexA = DAYS_OF_WEEK.indexOf(a.day);
                            const dayIndexB = DAYS_OF_WEEK.indexOf(b.day);
                            if (dayIndexA !== dayIndexB) return dayIndexB - dayIndexA;
                            const periodA = timeSlots.find(ts => ts.id === a.timeSlotId)?.period || 0;
                            const periodB = timeSlots.find(ts => ts.id === b.timeSlotId)?.period || 0;
                            return periodB - periodA;
                        });
                        locationId = sortedEntries[0].locationId;
                    }
                }

                const newEntry: Partial<ScheduleEntry> = { day, timeSlotId, subjectCode, teacherIds, classGroupId: selectedId, locationId };
                setCurrentEntry(newEntry);
                setIsCustomActivity(false);
                setSubmissionError(null);
                setIsModalOpen(true);
            }
        } catch (e) {
            console.error("Failed to handle drop:", e);
        }
    };

    const currentAcademicSchedule = useMemo(() => {
        if (!schoolInfo) return [];
        return schedule.filter(e => 
            e.academicYear === schoolInfo.academicYear &&
            e.semester === schoolInfo.currentSemester
        );
    }, [schedule, schoolInfo]);

    const filteredSchedule = useMemo(() => {
        if (!selectedId) return [];
        if (arrangeBy === 'classGroup') {
            const selectedGroup = classGroups.find(cg => cg.id === selectedId);
            if (!selectedGroup) return [];
            let idsToCheck: string[] = [selectedId];
            if (!selectedGroup.parentId) {
                const childIds = classGroups.filter(cg => cg.parentId === selectedId).map(cg => cg.id);
                idsToCheck.push(...childIds);
            }
            return currentAcademicSchedule.filter(e => e.classGroupId && idsToCheck.includes(e.classGroupId));
        }
        return currentAcademicSchedule.filter(e => e.teacherIds.includes(selectedId));
    }, [selectedId, arrangeBy, currentAcademicSchedule, classGroups]);

    const allRelevantSubjectsForClassGroup = useMemo(() => {
        if (arrangeBy !== 'classGroup' || !selectedId || !schoolInfo) return [];

        const subjectCodesOnGrid = new Set(
            currentAcademicSchedule
                .filter(e => e.classGroupId === selectedId && e.subjectCode)
                .map(e => e.subjectCode!)
        );
        const subjectsOnGrid = subjects.filter(s => subjectCodesOnGrid.has(s.code));
        const combined = [...classGroupSubjects, ...subjectsOnGrid];
        const uniqueSubjects = Array.from(new Map(combined.map(s => [s.code, s])).values());
        
        return uniqueSubjects.sort((a, b) => a.name.localeCompare(b.name, 'th'));
    }, [arrangeBy, selectedId, currentAcademicSchedule, subjects, classGroupSubjects, schoolInfo]);

    const scheduledCounts = useMemo(() => {
        if (!schoolInfo || arrangeBy !== 'classGroup' || !selectedId) return {};
        const counts: { [subjectCode: string]: number } = {};
        currentAcademicSchedule
            .filter(entry => 
                entry.classGroupId === selectedId && 
                entry.subjectCode
            )
            .forEach(entry => {
                counts[entry.subjectCode!] = (counts[entry.subjectCode!] || 0) + 1;
            });
        return counts;
    }, [currentAcademicSchedule, selectedId, arrangeBy, schoolInfo]);

    const incompleteSubjects = useMemo(() => {
        return allRelevantSubjectsForClassGroup
            .map(subject => {
                const count = scheduledCounts[subject.code] || 0;
                if (count < subject.periodsPerWeek) {
                    const firstEntry = currentAcademicSchedule.find(e => 
                        e.classGroupId === selectedId && 
                        e.subjectCode === subject.code
                    );
                    return { subject, count, firstEntry };
                }
                return null;
            })
            .filter((item): item is { subject: Subject; count: number; firstEntry: ScheduleEntry | undefined } => item !== null)
            .sort((a,b) => a.subject.name.localeCompare(b.subject.name, 'th'));
    }, [allRelevantSubjectsForClassGroup, scheduledCounts, currentAcademicSchedule, selectedId]);

    const filteredSubjects = useMemo(() => {
        const currentSemester = schoolInfo?.currentSemester;
        const classGroupId = arrangeBy === 'classGroup' ? selectedId : currentEntry?.classGroupId;

        if (showOnlyPlannedSubjects && arrangeBy === 'classGroup' && classGroupId === selectedId) {
            return allRelevantSubjectsForClassGroup.filter(subject => {
                if (subjectFilters.subjectGroup && subject.subjectGroup !== subjectFilters.subjectGroup) return false;
                return true;
            });
        }

        if (!classGroupId) return [];
        const selectedClassGroup = classGroups.find(cg => cg.id === classGroupId);
        if (!selectedClassGroup) return [];

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
    }, [showOnlyPlannedSubjects, arrangeBy, selectedId, currentEntry, allRelevantSubjectsForClassGroup, schoolInfo, classGroups, subjects, subjectFilters]);
    
    const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setDisplayOptions(prev => ({ ...prev, [name]: checked }));
    };

    const handleQuickActivitySelect = (activity: string) => {
        setCurrentEntry(prev => prev ? { ...prev, customActivity: activity } : { customActivity: activity });
    };

    const chatbotContext = useMemo(() => {
        if (!selectedId) return null;

        const context: any = {
            page: "Timetable Arrangement",
            arrangeBy: arrangeBy,
        };

        if (arrangeBy === 'classGroup') {
            const selectedGroup = classGroups.find(cg => cg.id === selectedId);
            if (!selectedGroup) return null;

            context.selectedClassGroup = { name: selectedGroup.name, gradeLevel: selectedGroup.gradeLevel };
            
            context.subjectsToSchedule = allRelevantSubjectsForClassGroup.map(s => ({
                name: s.name,
                code: s.code,
                periodsPerWeek: s.periodsPerWeek
            }));

            context.incompleteSubjects = incompleteSubjects.map(item => ({
                name: item.subject.name,
                code: item.subject.code,
                scheduled: item.count,
                required: item.subject.periodsPerWeek
            }));
            
            const relatedClassGroups = classGroups.filter(cg => cg.gradeLevel === selectedGroup.gradeLevel);
            context.gradeLevelSchedules = relatedClassGroups.map(cg => ({
                classGroupName: cg.name,
                schedule: currentAcademicSchedule
                    .filter(e => e.classGroupId === cg.id)
                    .map(e => ({
                        day: e.day,
                        period: timeSlots.find(ts => ts.id === e.timeSlotId)?.period,
                        subject: subjects.find(s => s.code === e.subjectCode)?.name || e.customActivity,
                        teacher: teachers.filter(t => e.teacherIds.includes(t.id)).map(t => t.name).join(', '),
                        location: locations.find(l => l.id === e.locationId)?.name
                    }))
            }));
            
            const relevantTeacherIds = [...new Set(
                currentAcademicSchedule
                    .filter(e => e.classGroupId === selectedId)
                    .flatMap(e => e.teacherIds)
            )];

            context.relevantTeacherSchedules = relevantTeacherIds.map(teacherId => {
                const teacherInfo = teachers.find(t => t.id === teacherId);
                return {
                    teacherName: teacherInfo?.name || 'Unknown Teacher',
                    schedule: currentAcademicSchedule
                        .filter(e => e.teacherIds.includes(teacherId))
                        .map(e => ({
                            day: e.day,
                            period: timeSlots.find(ts => ts.id === e.timeSlotId)?.period,
                            subject: subjects.find(s => s.code === e.subjectCode)?.name || e.customActivity,
                            classGroup: classGroups.find(cg => cg.id === e.classGroupId)?.name,
                            location: locations.find(l => l.id === e.locationId)?.name
                        }))
                };
            });


        } else { // arrangeBy === 'teacher'
            const selectedTeacher = teachers.find(t => t.id === selectedId);
            if (!selectedTeacher) return null;
            
            context.selectedTeacher = { name: selectedTeacher.name, subjectGroup: selectedTeacher.subjectGroup };
            context.teacherSchedule = filteredSchedule.map(e => ({
                day: e.day,
                period: timeSlots.find(ts => ts.id === e.timeSlotId)?.period,
                subject: subjects.find(s => s.code === e.subjectCode)?.name || e.customActivity,
                classGroup: classGroups.find(cg => cg.id === e.classGroupId)?.name,
            }));
        }

        return context;

    }, [selectedId, arrangeBy, classGroups, teachers, allRelevantSubjectsForClassGroup, incompleteSubjects, currentAcademicSchedule, timeSlots, subjects, locations]);

    const showChatbot = user && (user.role === 'admin' || user.role === 'super') && schoolInfo?.features?.AIChatbot;

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">จัดตารางสอน</h1>
                    {schoolInfo && (
                        <p className="text-md text-gray-600 mt-1">
                            สำหรับปีการศึกษา <span className="font-semibold">{schoolInfo.academicYear}</span> ภาคเรียนที่ <span className="font-semibold">{schoolInfo.currentSemester}</span>
                        </p>
                    )}
                </div>
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
                    {(arrangeBy === 'classGroup' ? sortedClassGroups : sortedTeachers).map(item => (<option key={item.id} value={item.id}>{item.name}</option>))}
                </select>
            </div>
            
            {arrangeBy === 'classGroup' && <SubjectsToSchedulePanel selectedClassGroupId={selectedId} allRelevantSubjects={allRelevantSubjectsForClassGroup} scheduledCounts={scheduledCounts} incompleteSubjects={incompleteSubjects} />}

            {selectedId && (
                <TimetableGrid 
                    entries={filteredSchedule} 
                    isEditable={true} 
                    onCellClick={handleCellClick}
                    onEditEntry={handleEditEntry}
                    onDeleteEntry={handleDeleteClick}
                    onDropOnCell={handleDrop}
                    onDragStartEntry={handleDragStartEntry}
                    onDragEndEntry={handleDragEndEntry}
                    viewContext={arrangeBy === 'classGroup' ? 'class' : 'teacher'}
                    displayOptions={displayOptions}
                    colorBy={arrangeBy === 'classGroup' ? 'subjectGroup' : 'classGroup'}
                    selectedItemCount={1}
                />
            )}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={currentEntry?.id ? "แก้ไขคาบเรียน" : "เพิ่มคาบเรียน"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                     {arrangeBy === 'teacher' && (
                        <div className="mb-4">
                            <label className="block text-gray-700">กลุ่มเรียน</label>
                            {isCustomActivity ? (
                                <div className="mt-1 space-y-3 p-3 bg-gray-50 border rounded-md">
                                    <div className="flex items-center gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="classGroupMode"
                                                value="select"
                                                checked={classGroupInputMode === 'select'}
                                                onChange={() => {
                                                    setClassGroupInputMode('select');
                                                    setCurrentEntry(prev => prev ? { ...prev, classGroupId: '' } : null);
                                                }}
                                                className="form-radio h-4 w-4 text-blue-600"
                                            />
                                            <span>เลือกกลุ่มเรียน</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="classGroupMode"
                                                value="text"
                                                checked={classGroupInputMode === 'text'}
                                                onChange={() => {
                                                    setClassGroupInputMode('text');
                                                    setCurrentEntry(prev => prev ? { ...prev, classGroupId: '' } : null);
                                                }}
                                                className="form-radio h-4 w-4 text-blue-600"
                                            />
                                            <span>ระบุข้อความแทน</span>
                                        </label>
                                    </div>
                    
                                    {classGroupInputMode === 'select' ? (
                                        <select name="classGroupId" value={currentEntry?.classGroupId || ''} onChange={handleFormChange} className="w-full p-2 border rounded">
                                            <option value="">-- เลือกกลุ่มเรียน (ถ้ามี) --</option>
                                            {sortedClassGroups.map(cg => <option key={cg.id} value={cg.id}>{cg.name}</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            name="classGroupId"
                                            type="text"
                                            value={currentEntry?.classGroupId || ''}
                                            onChange={handleFormChange}
                                            className="w-full p-2 border rounded"
                                            placeholder="ระบุข้อความแทนกลุ่มเรียน (เช่น ประชุม, PLC)"
                                        />
                                    )}
                                </div>
                            ) : (
                                <select name="classGroupId" value={currentEntry?.classGroupId || ''} onChange={handleFormChange} className="w-full p-2 border rounded" required>
                                    <option value="">-- เลือกกลุ่มเรียน --</option>
                                    {sortedClassGroups.map(cg => <option key={cg.id} value={cg.id}>{cg.name}</option>)}
                                </select>
                            )}
                        </div>
                    )}

                    <div className="flex items-center space-x-3 mb-2"><input id="isCustomActivity" type="checkbox" checked={isCustomActivity} onChange={e => setIsCustomActivity(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" /><label htmlFor="isCustomActivity" className="text-gray-700 font-medium">กิจกรรมพิเศษ (ไม่ใช่วิชาสอน)</label></div>

                    {isCustomActivity ? (
                        <div className="space-y-2">
                            <div>
                                <label className="block text-gray-700">ชื่อกิจกรรม</label>
                                <input name="customActivity" type="text" value={currentEntry?.customActivity || ''} onChange={handleFormChange} className="w-full p-2 border rounded" required />
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {['พักเที่ยง', 'ซ่อมเสริม', 'ลูกเสือ', 'บำเพ็ญฯ', 'สวดมนต์', 'PLC'].map((activity) => (
                                    <button
                                        key={activity}
                                        type="button"
                                        onClick={() => handleQuickActivitySelect(activity)}
                                        className="px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-colors"
                                    >
                                        {activity}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 p-3 border rounded-md bg-gray-50">
                            <h4 className="font-semibold text-gray-700">ตัวกรองรายวิชา</h4>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><label className="block text-gray-700 text-sm">กลุ่มสาระฯ</label><select value={subjectFilters.subjectGroup} onChange={e => setSubjectFilters(p => ({...p, subjectGroup: e.target.value}))} className="w-full p-2 border rounded text-sm"><option value="">ทั้งหมด</option>{SUBJECT_GROUP_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                                <label className="flex items-center space-x-2 pt-5"><input type="checkbox" checked={subjectFilters.onlyCurrentSemester} onChange={e => setSubjectFilters(p => ({...p, onlyCurrentSemester: e.target.checked}))} className="h-4 w-4 text-blue-600 border-gray-300 rounded" /><span>เฉพาะวิชาภาคเรียนปัจจุบัน</span></label>
                             </div>
                             <hr/>
                            <label className="block text-gray-700 font-semibold">รายวิชา</label>
                            <div className="flex items-center space-x-3 mb-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" checked={showOnlyPlannedSubjects} onChange={(e) => setShowOnlyPlannedSubjects(e.target.checked)} className="sr-only peer" />
                                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                  <span className="ml-3 text-sm font-medium text-gray-900">แสดงเฉพาะวิชาที่ต้องจัด</span>
                                </label>
                            </div>
                            <SearchableSubjectSelect subjects={filteredSubjects} selectedSubjectCode={currentEntry?.subjectCode} onSelect={(code) => setCurrentEntry(prev => prev ? {...prev, subjectCode: code} : null)} />
                        </div>
                    )}
                    
                    <div><label className="block text-gray-700">ครูผู้สอน (เลือกได้มากกว่า 1)</label><select name="teacherIds" multiple value={currentEntry?.teacherIds || []} onChange={handleFormChange} className="w-full p-2 border rounded h-32" required={!isCustomActivity}><option value="" disabled>-- เลือกครู --</option>{sortedTeachersForModal.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                    <div><label className="block text-gray-700">สถานที่</label><select name="locationId" value={currentEntry?.locationId || ''} onChange={handleFormChange} className="w-full p-2 border rounded" required={!isCustomActivity}><option value="">-- เลือกสถานที่ --</option>{sortedLocationsForModal.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                    <div className="flex justify-end pt-4"><button type="button" onClick={handleCloseModal} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 mr-2">ยกเลิก</button><button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">บันทึก</button></div>
                </form>
            </Modal>
            
            <Modal isOpen={isConfirmModalOpen} onClose={handleCloseModal} title="เกิดข้อขัดแย้งในการจัดตาราง">
                {submissionError && (() => {
                    const { conflictingEntry } = submissionError.conflict;
                    const subject = subjects.find(s => s.code === conflictingEntry.subjectCode);
                    const entryTeachers = teachers.filter(t => conflictingEntry.teacherIds.includes(t.id));
                    const location = locations.find(l => l.id === conflictingEntry.locationId);
                    const classGroup = classGroups.find(cg => cg.id === conflictingEntry.classGroupId);
                    const timeSlot = timeSlots.find(ts => ts.id === conflictingEntry.timeSlotId);
            
                    const handleGoBackAndEdit = () => {
                        setIsConfirmModalOpen(false);
                        setIsModalOpen(true);
                    };
            
                    return (
                        <div>
                            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                                <p className="font-bold">เกิดข้อขัดแย้งในการจัดตาราง</p>
                                <p>{submissionError.message}</p>
                            </div>
                            <p className="mb-2 text-gray-800 font-semibold">
                                การบันทึกนี้จะ <strong className="text-red-600">ลบและเขียนทับ</strong> คาบเรียนเดิมที่มีอยู่แล้ว:
                            </p>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2 text-sm text-gray-700">
                                <p><strong>กลุ่มเรียน:</strong> {classGroup?.name}</p>
                                <p><strong>วัน:</strong> {conflictingEntry.day}</p>
                                <p><strong>คาบที่:</strong> {timeSlot?.period} ({timeSlot?.startTime} - {timeSlot?.endTime})</p>
                                <p><strong>วิชา/กิจกรรม:</strong> {conflictingEntry.customActivity || subject?.name || 'N/A'}</p>
                                <p><strong>ครู:</strong> {entryTeachers.map(t => t.name).join(', ') || 'N/A'}</p>
                                <p><strong>สถานที่:</strong> {location?.name || 'N/A'}</p>
                            </div>
                            <p className="mt-4 font-semibold text-gray-800">
                                คุณสามารถกลับไปแก้ไข หรือยืนยันเพื่อบันทึกทับข้อมูลเดิมได้
                            </p>
                            <div className="flex justify-end pt-6 mt-4 border-t">
                                <button type="button" onClick={handleCloseModal} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 mr-2">
                                    ยกเลิก
                                </button>
                                <button type="button" onClick={handleGoBackAndEdit} className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 mr-2">
                                    กลับไปแก้ไข
                                </button>
                                <button type="button" onClick={handleConfirmConflict} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                                    ยืนยันและบันทึกทับ
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="ยืนยันการลบ">
                {entryToDelete && (() => {
                    const subject = subjects.find(s => s.code === entryToDelete.subjectCode);
                    const displayName = entryToDelete.customActivity || subject?.name || 'รายการที่เลือก';
                    return (
                        <div>
                            <p className="mb-4 text-gray-800 text-lg">
                                คุณแน่ใจหรือไม่ว่าต้องการลบ "{displayName}" ออกจากตาราง?
                            </p>
                            <p className="text-red-600">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
                            <div className="flex justify-end pt-6 mt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => { setIsDeleteConfirmOpen(false); setEntryToDelete(null); }}
                                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 mr-2"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmDelete}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                                >
                                    ยืนยันการลบ
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>
            {showChatbot && <AIChatbot contextData={chatbotContext} />}
        </div>
    );
};

export default TimetableArrangement;