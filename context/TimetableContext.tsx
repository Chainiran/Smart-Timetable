
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Teacher, ClassGroup, Subject, Location, TimeSlot, ScheduleEntry, SchoolInfo, TimetableContextType, ApiResponse, ConflictInfo } from '../types';
import {
    INITIAL_TEACHERS,
    INITIAL_CLASS_GROUPS,
    INITIAL_SUBJECTS,
    INITIAL_LOCATIONS,
    INITIAL_TIME_SLOTS,
    INITIAL_SCHEDULE,
    INITIAL_SCHOOL_INFO,
    SUBJECT_COLORS
} from '../constants';


const TimetableContext = createContext<TimetableContextType | undefined>(undefined);

export const TimetableProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
    const [classGroups, setClassGroups] = useState<ClassGroup[]>(INITIAL_CLASS_GROUPS);
    const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
    const [locations, setLocations] = useState<Location[]>(INITIAL_LOCATIONS);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(() => INITIAL_TIME_SLOTS.sort((a,b) => a.period - b.period));
    const [schedule, setSchedule] = useState<ScheduleEntry[]>(INITIAL_SCHEDULE);
    const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(INITIAL_SCHOOL_INFO);

    const loading = false;
    const error = null;

    const updateSchoolInfo = async (info: Partial<SchoolInfo>): Promise<ApiResponse<SchoolInfo>> => {
        const updatedInfo = { ...schoolInfo!, ...info };
        setSchoolInfo(updatedInfo);
        return { success: true, item: updatedInfo };
    };

    const addOrUpdateTeacher = async (teacher: Omit<Teacher, 'id'> & { id?: string }): Promise<ApiResponse<Teacher>> => {
        let newTeacher: Teacher;
        const existing = teachers.find(t => t.id === teacher.id);
        if (existing) { // Update
            newTeacher = { ...existing, ...teacher };
            setTeachers(prev => prev.map(t => t.id === teacher.id ? newTeacher : t));
        } else { // Add
            newTeacher = { ...teacher, id: `T${Date.now()}` } as Teacher;
            setTeachers(prev => [...prev, newTeacher]);
        }
        return { success: true, item: newTeacher };
    };

    const deleteTeacher = async (id: string): Promise<ApiResponse> => {
        setTeachers(prev => prev.filter(t => t.id !== id));
        return { success: true };
    };

    const addTeachersInBulk = async (newTeachers: Omit<Teacher, 'id'>[]): Promise<ApiResponse> => {
        const existingNames = new Set(teachers.map(t => t.name));
        let addedCount = 0;
        const teachersToAdd = newTeachers
            .filter(t => !existingNames.has(t.name))
            .map(t => {
                addedCount++;
                return { ...t, id: `T${Date.now()}${addedCount}` } as Teacher;
            });
        setTeachers(prev => [...prev, ...teachersToAdd]);
        return { success: true, message: `เพิ่ม ${addedCount} รายการ, ข้าม ${newTeachers.length - addedCount} (ซ้ำ)` };
    };
    
    const addOrUpdateSubject = async (subject: Subject): Promise<ApiResponse<Subject>> => {
        let newSubject: Subject;
        const existing = subjects.find(s => s.code === subject.code);
        if (existing) { // Update
            newSubject = { ...existing, ...subject };
            setSubjects(prev => prev.map(s => s.code === subject.code ? newSubject : s));
        } else { // Add
            newSubject = { ...subject, color: SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)] };
            setSubjects(prev => [...prev, newSubject]);
        }
        return { success: true, item: newSubject };
    };

    const deleteSubject = async (code: string): Promise<ApiResponse> => {
        setSubjects(prev => prev.filter(s => s.code !== code));
        return { success: true };
    };

    const addSubjectsInBulk = async (newSubjects: Subject[]): Promise<ApiResponse> => {
        const existingCodes = new Set(subjects.map(s => s.code));
        let addedCount = 0;
        const subjectsToAdd = newSubjects
            .filter(s => !existingCodes.has(s.code))
            .map(s => {
                addedCount++;
                return {
                    ...s,
                    color: SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)]
                };
            });
        setSubjects(prev => [...prev, ...subjectsToAdd]);
        return { success: true, message: `เพิ่ม ${addedCount} รายการ, ข้าม ${newSubjects.length - addedCount} (ซ้ำ)` };
    };

    const addOrUpdateClassGroup = async (classGroup: Omit<ClassGroup, 'id'> & { id?: string }): Promise<ApiResponse<ClassGroup>> => {
        let newClassGroup: ClassGroup;
        const existing = classGroups.find(cg => cg.id === classGroup.id);
        if (existing) { // Update
            newClassGroup = { ...existing, ...classGroup };
            setClassGroups(prev => prev.map(cg => cg.id === classGroup.id ? newClassGroup : cg));
        } else { // Add
            newClassGroup = { ...classGroup, id: `C${Date.now()}` } as ClassGroup;
            setClassGroups(prev => [...prev, newClassGroup]);
        }
        return { success: true, item: newClassGroup };
    };
    
    const deleteClassGroup = async (id: string): Promise<ApiResponse> => {
        setClassGroups(prev => prev.filter(cg => cg.id !== id));
        return { success: true };
    };

    const addClassGroupsInBulk = async (newClassGroups: (Omit<ClassGroup, 'id' | 'parentId'> & { parentName?: string })[]): Promise<ApiResponse> => {
        const existingNames = new Set(classGroups.map(cg => cg.name));
        let addedCount = 0;
        const groupsToAdd = newClassGroups
            .filter(cg => !existingNames.has(cg.name))
            .map(cg => {
                addedCount++;
                const parent = classGroups.find(p => p.name === cg.parentName);
                return {
                    id: `C${Date.now()}${addedCount}`,
                    name: cg.name,
                    gradeLevel: cg.gradeLevel,
                    parentId: parent?.id
                };
            });
        setClassGroups(prev => [...prev, ...groupsToAdd]);
        return { success: true, message: `เพิ่ม ${addedCount} รายการ, ข้าม ${newClassGroups.length - addedCount} (ซ้ำ)` };
    };

    const addOrUpdateLocation = async (location: Omit<Location, 'id'> & { id?: string }): Promise<ApiResponse<Location>> => {
        let newLocation: Location;
        const existing = locations.find(l => l.id === location.id);
        if (existing) { // Update
            newLocation = { ...existing, ...location };
            setLocations(prev => prev.map(l => l.id === location.id ? newLocation : l));
        } else { // Add
            newLocation = { ...location, id: `L${Date.now()}` } as Location;
            setLocations(prev => [...prev, newLocation]);
        }
        return { success: true, item: newLocation };
    };

    const deleteLocation = async (id: string): Promise<ApiResponse> => {
        setLocations(prev => prev.filter(l => l.id !== id));
        return { success: true };
    };

    const addLocationsInBulk = async (newLocations: (Omit<Location, 'id' | 'responsibleTeacherId'> & { responsibleTeacherName?: string})[]): Promise<ApiResponse> => {
        const existingNames = new Set(locations.map(l => l.name));
        let addedCount = 0;
        const locationsToAdd = newLocations
            .filter(l => !existingNames.has(l.name))
            .map(l => {
                addedCount++;
                const teacher = teachers.find(t => t.name === l.responsibleTeacherName);
                return {
                    id: `L${Date.now()}${addedCount}`,
                    name: l.name,
                    responsibleTeacherId: teacher?.id
                };
            });
        setLocations(prev => [...prev, ...locationsToAdd]);
        return { success: true, message: `เพิ่ม ${addedCount} รายการ, ข้าม ${newLocations.length - addedCount} (ซ้ำ)` };
    };

    const addOrUpdateTimeSlot = async (timeSlot: TimeSlot): Promise<ApiResponse<TimeSlot>> => {
        const existing = timeSlots.find(ts => ts.id === timeSlot.id);
        if (existing) { // Update
            setTimeSlots(prev => prev.map(ts => ts.id === timeSlot.id ? timeSlot : ts).sort((a,b) => a.period - b.period));
        } else { // Add
            setTimeSlots(prev => [...prev, timeSlot].sort((a,b) => a.period - b.period));
        }
        return { success: true, item: timeSlot };
    };
    
    const deleteTimeSlot = async (id: string): Promise<ApiResponse> => {
        setTimeSlots(prev => prev.filter(ts => ts.id !== id));
        return { success: true };
    };
    
    // Schedule-specific logic with conflict detection
    const checkConflict = (entry: Partial<ScheduleEntry>, currentSchedule: ScheduleEntry[], existingEntryId?: string): ConflictInfo | null => {
        // Location conflict
        if (entry.locationId) {
            const conflicting = currentSchedule.find(e =>
                e.id !== existingEntryId &&
                e.day === entry.day &&
                e.timeSlotId === entry.timeSlotId &&
                e.locationId === entry.locationId
            );
            if (conflicting) {
                const conflictingClass = classGroups.find(cg => cg.id === conflicting.classGroupId);
                return { type: 'location', conflictingEntry: conflicting, message: `สถานที่ถูกใช้โดยกลุ่มเรียน "${conflictingClass?.name}" ในเวลานี้แล้ว` };
            }
        }

        // Teacher conflict
        if (entry.teacherIds && entry.teacherIds.length > 0) {
            const conflicting = currentSchedule.find(e =>
                e.id !== existingEntryId &&
                e.day === entry.day &&
                e.timeSlotId === entry.timeSlotId &&
                Array.isArray(e.teacherIds) &&
                e.teacherIds.some(tid => entry.teacherIds!.includes(tid))
            );
            if (conflicting) {
                 const conflictingTeacher = teachers.find(t => conflicting.teacherIds.some(tid => t.id === tid));
                 const conflictingClass = classGroups.find(cg => cg.id === conflicting.classGroupId);
                 return { type: 'teacher', conflictingEntry: conflicting, message: `ครู "${conflictingTeacher?.name}" มีสอนซ้อนกับกลุ่มเรียน "${conflictingClass?.name}" ในเวลานี้` };
            }
        }
        return null;
    };

    const addScheduleEntry = async (entry: Omit<ScheduleEntry, 'id'>): Promise<ApiResponse<ScheduleEntry>> => {
        const conflict = checkConflict(entry, schedule);
        if (conflict) {
            return { success: false, message: conflict.message, conflict };
        }
        const newEntry: ScheduleEntry = { ...entry, id: `SE${Date.now()}` };
        setSchedule(prev => [...prev, newEntry]);
        return { success: true, item: newEntry };
    };

    const updateScheduleEntry = async (entry: ScheduleEntry): Promise<ApiResponse<ScheduleEntry>> => {
        const conflict = checkConflict(entry, schedule, entry.id);
        if (conflict) {
            return { success: false, message: conflict.message, conflict };
        }
        setSchedule(prev => prev.map(e => e.id === entry.id ? entry : e));
        return { success: true, item: entry };
    };

    const deleteScheduleEntry = async (id: string): Promise<ApiResponse> => {
        setSchedule(prev => prev.filter(e => e.id !== id));
        return { success: true };
    };

    const deleteConflictingEntryAndSave = async (entryData: Omit<ScheduleEntry, 'id'> | ScheduleEntry, conflictingEntryId: string): Promise<ApiResponse> => {
        let updatedSchedule = schedule.filter(e => e.id !== conflictingEntryId);
        
        const conflict = checkConflict(entryData, updatedSchedule, ('id' in entryData) ? entryData.id : undefined);
        if (conflict) {
            return { success: false, message: `Even after removing the conflict, the new entry conflicts with another entry: ${conflict.message}`, conflict };
        }

        if ('id' in entryData && entryData.id) {
            const existingIndex = updatedSchedule.findIndex(e => e.id === entryData.id);
            if (existingIndex > -1) {
                updatedSchedule[existingIndex] = entryData;
            } else {
                 updatedSchedule.push(entryData);
            }
        } else {
            const newEntry = { ...entryData, id: `SE${Date.now()}` };
            updatedSchedule.push(newEntry);
        }
        setSchedule(updatedSchedule);
        return { success: true };
    };
    
    return (
        <TimetableContext.Provider value={{
            teachers, classGroups, subjects, locations, timeSlots, schedule, schoolInfo, loading, error,
            updateSchoolInfo,
            addOrUpdateTeacher,
            deleteTeacher,
            addTeachersInBulk,
            addOrUpdateSubject,
            deleteSubject,
            addSubjectsInBulk,
            addOrUpdateClassGroup,
            deleteClassGroup,
            addClassGroupsInBulk,
            addOrUpdateLocation,
            deleteLocation,
            addLocationsInBulk,
            addOrUpdateTimeSlot,
            deleteTimeSlot,
            addScheduleEntry,
            updateScheduleEntry,
            deleteScheduleEntry,
            deleteConflictingEntryAndSave
        }}>
            {children}
        </TimetableContext.Provider>
    );
};

export const useTimetable = (): TimetableContextType => {
    const context = useContext(TimetableContext);
    if (context === undefined) {
        throw new Error('useTimetable must be used within a TimetableProvider');
    }
    return context;
};
