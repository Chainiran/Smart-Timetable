import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { Teacher, ClassGroup, Subject, Location, TimeSlot, ScheduleEntry, SchoolInfo, TimetableContextType, ApiResponse, User, PublishingStatus, MasterDataType, ConflictInfo, Substitution, DisplaySubstitution, TeacherAttendance, AttendanceStat, SubstitutionStat, Announcement } from '../types';
import { useAuth } from './AuthContext';
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = 'https://time.anuwat.in.th';

const getApiError = (error: unknown): { message: string; conflict?: ConflictInfo } => {
    let message = 'An unexpected server error occurred.';
    let conflict: ConflictInfo | undefined = undefined;

    if (error && typeof error === 'object') {
        const errObj = error as { [key: string]: unknown };
        if (typeof errObj.message === 'string' && errObj.message) {
            message = errObj.message;
        }
        if (errObj.conflict) {
            conflict = errObj.conflict as ConflictInfo;
        }
    } else if (typeof error === 'string' && error) {
        message = error;
    }

    return { message, conflict };
};


const TimetableContext = createContext<TimetableContextType | undefined>(undefined);

export const TimetableProvider: React.FC<{ children: ReactNode, schoolId: string }> = ({ children, schoolId }) => {
    const { token } = useAuth();
    // Active Data
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [publishingStatus, setPublishingStatus] = useState<PublishingStatus[]>([]);
    const [substitutions, setSubstitutions] = useState<DisplaySubstitution[]>([]);
    const [classGroupSubjects, setClassGroupSubjects] = useState<Subject[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    
    // Archived (Soft-deleted) Data
    const [archivedTeachers, setArchivedTeachers] = useState<Teacher[]>([]);
    const [archivedClassGroups, setArchivedClassGroups] = useState<ClassGroup[]>([]);
    const [archivedSubjects, setArchivedSubjects] = useState<Subject[]>([]);
    const [archivedLocations, setArchivedLocations] = useState<Location[]>([]);
    const [archivedTimeSlots, setArchivedTimeSlots] = useState<TimeSlot[]>([]);

    // New Feature States
    const [attendanceLogs, setAttendanceLogs] = useState<TeacherAttendance[]>([]);
    const [attendanceStats, setAttendanceStats] = useState<AttendanceStat[]>([]);
    const [substitutionStats, setSubstitutionStats] = useState<SubstitutionStat[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Memoized active data lists for performance
    const activeTeachers = useMemo(() => teachers.filter(t => t.isActive), [teachers]);
    const activeClassGroups = useMemo(() => classGroups.filter(cg => cg.isActive), [classGroups]);
    const activeSubjects = useMemo(() => subjects.filter(s => s.isActive), [subjects]);
    const activeLocations = useMemo(() => locations.filter(l => l.isActive), [locations]);

    // FIX: Add a helper function to safely parse `teacherIds` from a JSON string to an array.
    // This function will be used whenever schedule data is received from the API.
    const processScheduleEntry = (entry: any): ScheduleEntry => {
        if (!entry) return entry;
        let parsedTeacherIds: string[] = [];
        if (typeof entry.teacherIds === 'string') {
            try {
                const parsed = JSON.parse(entry.teacherIds);
                if (Array.isArray(parsed)) {
                    parsedTeacherIds = parsed;
                }
            } catch (e) {
                console.error("Failed to parse teacherIds from string:", entry.teacherIds, e);
            }
        } else if (Array.isArray(entry.teacherIds)) {
            parsedTeacherIds = entry.teacherIds;
        }
        return { ...entry, teacherIds: parsedTeacherIds };
    };

    const apiFetch = useCallback(async (endpoint: string, options: RequestInit = {}) => {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const url = `${API_BASE_URL}/api/${schoolId}${endpoint}`;
            const response = await fetch(url, { ...options, headers });
            const responseData = response.status === 204 ? null : await response.json();
            if (!response.ok) {
                 // Throw the entire JSON response on error to preserve extra data like 'conflict'
                 throw responseData;
            }
            return responseData;
        } catch (err: any) {
            console.error(`API call failed for ${endpoint} in school ${schoolId}:`, err);
            // This global error setter is removed to allow for local error handling (e.g., conflict modals)
            // without triggering a full-page error screen. The main fetchData function will handle setting
            // the error state for critical data loading.
            // setError(getApiError(err).message); 
            throw err;
        }
    }, [token, schoolId]);

    const fetchData = useCallback(async () => {
        if (!schoolId) return;
        setLoading(true);
        setError(null);
        // Reset state when changing schools to prevent showing stale data
        setSchoolInfo(null);
        setTeachers([]);
        setClassGroups([]);
        setSubjects([]);
        setLocations([]);
        setTimeSlots([]);
        setSchedule([]);
        setPublishingStatus([]);
        setAnnouncements([]);

        try {
            const [
                schoolInfoData, teachersData, classGroupsData, subjectsData,
                locationsData, timeSlotsData, scheduleData, publishingStatusData,
                announcementsData
            ] = await Promise.all([
                apiFetch('/school_info'),
                apiFetch('/teachers'),
                apiFetch('/class_groups'),
                apiFetch('/subjects'),
                apiFetch('/locations'),
                apiFetch('/time_slots'),
                apiFetch('/schedule'),
                apiFetch('/publishing'),
                apiFetch('/announcements/public'),
            ]);

            setSchoolInfo(schoolInfoData);
            // Ensure all list data is set as an array to prevent runtime errors
            setTeachers(Array.isArray(teachersData) ? teachersData : []);
            setClassGroups(Array.isArray(classGroupsData) ? classGroupsData : []);
            setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
            setLocations(Array.isArray(locationsData) ? locationsData : []);
            setTimeSlots((Array.isArray(timeSlotsData) ? timeSlotsData : []).sort((a: TimeSlot, b: TimeSlot) => a.period - b.period));
            setSchedule((Array.isArray(scheduleData) ? scheduleData : []).map(processScheduleEntry));
            setPublishingStatus(Array.isArray(publishingStatusData) ? publishingStatusData : []);
            setAnnouncements(Array.isArray(announcementsData) ? announcementsData : []);

        } catch (err: any) {
            // Set the global error state only if the main data fetch fails.
            const { message } = getApiError(err);
            setError(message || 'ไม่สามารถโหลดข้อมูลหลักได้ กรุณาตรวจสอบการเชื่อมต่อ API Server');
        } finally {
            setLoading(false);
        }
    }, [apiFetch, schoolId]);

    useEffect(() => {
        fetchData();
    }, [fetchData, schoolId]);
    
    const fetchUsers = useCallback(async () => {
        if (token) {
            try {
                const usersData = await apiFetch('/users');
                setUsers(Array.isArray(usersData) ? usersData : []);
            } catch (err) {
                console.error("Failed to fetch users", err);
                setUsers([]);
            }
        }
    }, [apiFetch, token]);
    
    const fetchArchivedData = useCallback(async (dataType: MasterDataType) => {
        // Convert dataType from camelCase (e.g., 'classGroups') to snake_case (e.g., 'class_groups') to match API endpoint.
        const snakeCaseDataType = dataType.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        const resetState = () => {
             switch(dataType) {
                case 'teachers': setArchivedTeachers([]); break;
                case 'classGroups': setArchivedClassGroups([]); break;
                case 'subjects': setArchivedSubjects([]); break;
                case 'locations': setArchivedLocations([]); break;
                case 'timeSlots': setArchivedTimeSlots([]); break;
            }
        }
        try {
            const data = await apiFetch(`/${snakeCaseDataType}/archived`);
            const safeData = Array.isArray(data) ? data : [];
            switch(dataType) {
                case 'teachers': setArchivedTeachers(safeData); break;
                case 'classGroups': setArchivedClassGroups(safeData); break;
                case 'subjects': setArchivedSubjects(safeData); break;
                case 'locations': setArchivedLocations(safeData); break;
                case 'timeSlots': setArchivedTimeSlots(safeData); break;
            }
        } catch (err) {
             console.error(`Failed to fetch archived ${dataType}`, err);
             resetState();
        }
    }, [apiFetch]);

    // Generic Add/Update handler to support Primary Key updates
    const createAddOrUpdateHandler = <T, U extends { [key: string]: any }>(endpoint: string, idField: keyof U, setData: React.Dispatch<React.SetStateAction<U[]>>) => {
        return async (item: T, originalId?: string | number): Promise<ApiResponse<U>> => {
            const isEdit = originalId !== undefined;
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `${endpoint}/${originalId}` : endpoint;
            try {
                const itemToSend = { ...item };
                // For POST requests for items using UUIDs, generate one if not present.
                if (method === 'POST' && idField === 'id' && !(itemToSend as any).id) {
                    (itemToSend as any).id = uuidv4();
                }

                const savedItem = await apiFetch(url, { method, body: JSON.stringify(itemToSend) });
                
                if (method === 'POST') {
                    setData(prev => [...prev, savedItem]);
                } else {
                    // When updating, replace the item with the originalId in the local state
                    setData(prev => prev.map(i => i[idField] === originalId ? savedItem : i));
                }
                return { success: true, item: savedItem };
            } catch (error: unknown) {
                const { message } = getApiError(error);
                return { success: false, message };
            }
        };
    };
    
    // Generic Soft Delete handler
    // FIX: Add generic constraints to satisfy the compiler and ensure type safety.
    const createDeleteHandler = <T extends { [key: string]: any }>(endpoint: string, idField: keyof T, setData: React.Dispatch<React.SetStateAction<T[]>>, setArchivedData: React.Dispatch<React.SetStateAction<T[]>>) => {
        return async (id: string | number): Promise<ApiResponse<T>> => {
            try {
                const deletedItem = await apiFetch(`${endpoint}/${id}`, { method: 'DELETE' });
                setData(prev => prev.filter(i => i[idField] !== id));
                setArchivedData(prev => [...prev, deletedItem]);
                return { success: true, item: deletedItem };
            } catch (error: unknown) { 
                const { message } = getApiError(error);
                return { success: false, message }; 
            }
        };
    };
    
    // Generic Restore handler
    // FIX: Add generic constraints to satisfy the compiler and ensure type safety.
    const createRestoreHandler = <T extends { [key: string]: any }>(endpoint: string, idField: keyof T, setData: React.Dispatch<React.SetStateAction<T[]>>, setArchivedData: React.Dispatch<React.SetStateAction<T[]>>) => {
         return async (id: string | number): Promise<ApiResponse<T>> => {
            try {
                const restoredItem = await apiFetch(`${endpoint}/${id}/restore`, { method: 'POST' });
                setArchivedData(prev => prev.filter(i => i[idField] !== id));
                setData(prev => [...prev, restoredItem]);
                return { success: true, item: restoredItem };
            } catch (error: unknown) { 
                const { message } = getApiError(error);
                return { success: false, message };
            }
        };
    };

    const addOrUpdateUser = createAddOrUpdateHandler<Omit<User, 'id' | 'id_school'> & { password?: string }, User>('/users', 'id', setUsers);
    const deleteUser = async (id: number): Promise<ApiResponse> => {
        try {
            await apiFetch(`/users/${id}`, { method: 'DELETE' });
            setUsers(prev => prev.filter(u => u.id !== id));
            return { success: true };
        } catch (error: unknown) { 
            const { message } = getApiError(error);
            return { success: false, message };
        }
    }


    // Specific Handlers
    const updateSchoolInfo = async (info: Partial<SchoolInfo>): Promise<ApiResponse<SchoolInfo>> => {
        try {
            const updatedInfo = await apiFetch('/school_info', { method: 'PUT', body: JSON.stringify(info) });
            setSchoolInfo(updatedInfo);
            return { success: true, item: updatedInfo };
        } catch (error: unknown) { 
            const { message } = getApiError(error);
            return { success: false, message };
        }
    };
    
    const addScheduleEntry = async (entry: Omit<ScheduleEntry, 'id' | 'id_school' | 'academicYear' | 'semester'>): Promise<ApiResponse<ScheduleEntry>> => {
        try {
            const result = await apiFetch('/schedule', { method: 'POST', body: JSON.stringify(entry) });
             if (result.success) {
                const processedItem = processScheduleEntry(result.item);
                setSchedule(prev => [...prev, processedItem]);
                return { ...result, item: processedItem };
            }
            return result;
        } catch (error: unknown) {
            const { message, conflict } = getApiError(error);
            // FIX: Ensure teacherIds in a conflicting entry are parsed correctly to prevent frontend errors.
            const processedConflict = conflict ? { ...conflict, conflictingEntry: processScheduleEntry(conflict.conflictingEntry) } : undefined;
            return {
                success: false,
                message,
                conflict: processedConflict,
            };
        }
    };

    const updateScheduleEntry = async (entry: Omit<ScheduleEntry, 'id_school' | 'academicYear' | 'semester'>): Promise<ApiResponse<ScheduleEntry>> => {
        try {
            const result = await apiFetch(`/schedule/${entry.id}`, { method: 'PUT', body: JSON.stringify(entry) });
            if (result.success) {
                const processedItem = processScheduleEntry(result.item);
                setSchedule(prev => prev.map(e => e.id === entry.id ? processedItem : e));
                return { ...result, item: processedItem };
            }
            return result;
        } catch (error: unknown) {
            const { message, conflict } = getApiError(error);
            // FIX: Ensure teacherIds in a conflicting entry are parsed correctly to prevent frontend errors.
            const processedConflict = conflict ? { ...conflict, conflictingEntry: processScheduleEntry(conflict.conflictingEntry) } : undefined;
            return {
                success: false,
                message,
                conflict: processedConflict,
            };
        }
    };

    const deleteScheduleEntry = async (id: string): Promise<ApiResponse> => {
        try {
            await apiFetch(`/schedule/${id}`, { method: 'DELETE' });
            setSchedule(prev => prev.filter(e => e.id !== id));
            return { success: true };
        } catch (error: unknown) {
            const { message } = getApiError(error);
            return { success: false, message };
        }
    };
    
    const deleteConflictingEntryAndSave = async (entryData: Omit<ScheduleEntry, 'id' | 'id_school' | 'academicYear' | 'semester'> | Omit<ScheduleEntry, 'id_school' | 'academicYear' | 'semester'>, conflictingEntryId: string): Promise<ApiResponse<ScheduleEntry>> => {
        try {
            const result = await apiFetch(`/schedule/resolve-conflict`, { method: 'POST', body: JSON.stringify({ entryToSave: entryData, conflictingEntryId }) });
            if (result.success) {
                // Refetch schedule to ensure consistency
                const scheduleData = await apiFetch('/schedule');
                setSchedule(scheduleData.map(processScheduleEntry));
                const processedItem = processScheduleEntry(result.item);
                return { ...result, item: processedItem };
            }
            return result;
        } catch (error: unknown) {
            const { message, conflict } = getApiError(error);
            // FIX: Ensure teacherIds in a conflicting entry are parsed correctly to prevent frontend errors.
            const processedConflict = conflict ? { ...conflict, conflictingEntry: processScheduleEntry(conflict.conflictingEntry) } : undefined;
            return {
                success: false,
                message,
                conflict: processedConflict,
            };
        }
    };

    // Bulk handlers
    const createBulkHandler = (endpoint: string) => async (items: any[]): Promise<ApiResponse<any>> => {
        try {
            const result = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(items) });
            await fetchData(); // Refresh all data after bulk import
            return { success: true, message: result.message };
        } catch (error: unknown) { 
            const { message } = getApiError(error);
            return { success: false, message };
        }
    };

    const addTeachersInBulk = createBulkHandler('/teachers/bulk');
    const addClassGroupsInBulk = createBulkHandler('/class_groups/bulk');
    const addSubjectsInBulk = createBulkHandler('/subjects/bulk');
    const addLocationsInBulk = createBulkHandler('/locations/bulk');
    
    // Publishing Status
    const fetchPublishingStatus = async () => {
        try {
            const statuses = await apiFetch('/publishing');
            setPublishingStatus(statuses);
        } catch (err: any) {
            console.error("Failed to fetch publishing status", err);
        }
    };
    
    const updatePublishingStatus = async (status: PublishingStatus): Promise<ApiResponse<PublishingStatus>> => {
        try {
            const updatedStatus = await apiFetch(`/publishing/${status.id}`, { method: 'PUT', body: JSON.stringify(status) });
            setPublishingStatus(prev => prev.map(s => s.id === status.id ? updatedStatus : s));
            return { success: true, item: updatedStatus };
        } catch (error: unknown) {
            const { message } = getApiError(error);
            return { success: false, message };
        }
    };

    const updateItemStatus = async (dataType: 'teachers' | 'classGroups' | 'subjects' | 'locations', id: string | number, isActive: boolean): Promise<ApiResponse<any>> => {
        const snakeCaseDataType = dataType.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        try {
            const updatedItem = await apiFetch(`/${snakeCaseDataType}/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ isActive }),
            });

            const idField = dataType === 'subjects' ? 'code' : 'id';

            const updateState = (setter: React.Dispatch<React.SetStateAction<any[]>>) => {
                setter(prev => prev.map(item => (item[idField] === id ? updatedItem : item)));
            };

            switch (dataType) {
                case 'teachers': updateState(setTeachers); break;
                case 'classGroups': updateState(setClassGroups); break;
                case 'subjects': updateState(setSubjects); break;
                case 'locations': updateState(setLocations); break;
            }

            return { success: true, item: updatedItem };
        } catch (error: unknown) {
            const { message } = getApiError(error);
            return { success: false, message };
        }
    };
    
    // Substitution Handlers
    const fetchSubstitutions = useCallback(async (date: string) => {
        try {
            const subsData = await apiFetch(`/substitutions?date=${date}`);
            setSubstitutions(subsData);
        } catch (error) {
            console.error("Failed to fetch substitutions", error);
            setSubstitutions([]); // Clear on error
        }
    }, [apiFetch]);
    
    const addSubstitution = async (sub: Omit<Substitution, 'id' | 'id_school'>, replaceId?: string): Promise<ApiResponse<DisplaySubstitution>> => {
        try {
            const payload = replaceId ? { ...sub, replaceId } : sub;
            const newSub = await apiFetch('/substitutions', { method: 'POST', body: JSON.stringify(payload) });

            setSubstitutions(prev => {
                const filtered = replaceId ? prev.filter(s => s.id !== replaceId) : prev;
                return [...filtered, newSub].sort((a, b) => a.timeSlotPeriod - b.timeSlotPeriod);
            });

            return { success: true, item: newSub };
        } catch (error: unknown) {
            const { message } = getApiError(error);
            return { success: false, message };
        }
    };

    const deleteSubstitution = async (id: string): Promise<ApiResponse> => {
        try {
            await apiFetch(`/substitutions/${id}`, { method: 'DELETE' });
            setSubstitutions(prev => prev.filter(s => s.id !== id));
            return { success: true };
        } catch (error: unknown) {
            const { message } = getApiError(error);
            return { success: false, message };
        }
    };

    // Class Group Subjects Handlers
    const fetchClassGroupSubjects = useCallback(async (classGroupId: string) => {
        if (!schoolInfo) return;
        try {
            const data = await apiFetch(`/class_groups/${classGroupId}/subjects?academicYear=${schoolInfo.academicYear}&semester=${schoolInfo.currentSemester}`);
            setClassGroupSubjects(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch class group subjects", err);
            setClassGroupSubjects([]); // Clear on error
        }
    }, [apiFetch, schoolInfo]);

    const updateClassGroupSubjects = async (classGroupId: string, subjectCodes: string[]): Promise<ApiResponse<any>> => {
        if (!schoolInfo) return { success: false, message: "School info not loaded." };
        try {
            const result = await apiFetch(`/class_groups/${classGroupId}/subjects`, {
                method: 'PUT',
                body: JSON.stringify({
                    subjectCodes,
                    academicYear: schoolInfo.academicYear,
                    semester: schoolInfo.currentSemester
                })
            });
            await fetchClassGroupSubjects(classGroupId); // Refetch after update
            return { success: true, message: result.message };
        } catch (error: unknown) {
            const { message } = getApiError(error);
            return { success: false, message };
        }
    };
    
    // --- New Attendance Feature Functions ---
    const fetchAttendanceLogs = useCallback(async (date: string) => {
        try {
            const data = await apiFetch(`/attendance?date=${date}`);
            setAttendanceLogs(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch attendance logs", error);
            setAttendanceLogs([]);
        }
    }, [apiFetch]);

    const saveAttendanceLogs = async (records: Omit<TeacherAttendance, 'id_school'>[]): Promise<ApiResponse> => {
        try {
            const result = await apiFetch('/attendance', { method: 'POST', body: JSON.stringify(records) });
            
            // On success, manually update the local state instead of re-fetching to preserve unsaved changes.
            if (records.length > 0) {
                // The records sent to the API have all the necessary fields for the state.
                const recordsToUpdate = records as TeacherAttendance[];

                setAttendanceLogs(prevLogs => {
                    const recordIdsToUpdate = new Set(recordsToUpdate.map(r => r.originalScheduleEntryId));
                    const attendanceDate = recordsToUpdate[0].attendanceDate;

                    const otherDateLogs = prevLogs.filter(log => log.attendanceDate !== attendanceDate);
                    const sameDateLogs = prevLogs.filter(log => log.attendanceDate === attendanceDate);

                    // From the logs of the same date, remove the ones we are about to update
                    const filteredSameDateLogs = sameDateLogs.filter(log => !recordIdsToUpdate.has(log.originalScheduleEntryId));
                    
                    // Combine the logs from other dates, the filtered logs from the same date, and the newly saved records
                    return [...otherDateLogs, ...filteredSameDateLogs, ...recordsToUpdate];
                });
            }
            
            return { success: true, message: result.message };
        } catch (error: unknown) {
            const { message } = getApiError(error);
            return { success: false, message };
        }
    };
    
    const resetAttendanceLogs = async (date: string, classGroupIds: string[]): Promise<ApiResponse> => {
        try {
            const result = await apiFetch('/attendance', {
                method: 'DELETE',
                body: JSON.stringify({ date, classGroupIds }),
            });

            // On success, manually remove the logs from local state to trigger a UI refresh
            setAttendanceLogs(prevLogs =>
                prevLogs.filter(log =>
                    !(log.attendanceDate === date && log.classGroupId && classGroupIds.includes(log.classGroupId))
                )
            );
            
            return { success: true, message: result.message };
        } catch (error: unknown) {
            const { message } = getApiError(error);
            return { success: false, message };
        }
    };

    // --- New Statistics Functions ---
    const fetchAttendanceStats = useCallback(async (startDate: string, endDate: string) => {
        try {
            const data = await apiFetch(`/statistics/attendance-summary?startDate=${startDate}&endDate=${endDate}`);
            setAttendanceStats(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch attendance stats", error);
            setAttendanceStats([]);
        }
    }, [apiFetch]);

    const fetchSubstitutionStats = useCallback(async (startDate: string, endDate: string) => {
        try {
            const data = await apiFetch(`/statistics/substitution-summary?startDate=${startDate}&endDate=${endDate}`);
            setSubstitutionStats(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch substitution stats", error);
            setSubstitutionStats([]);
        }
    }, [apiFetch]);
    
    // --- Announcement Functions ---
    const fetchAllAnnouncements = useCallback(async () => {
        try {
            const data = await apiFetch('/announcements/all');
            setAnnouncements(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch all announcements", err);
        }
    }, [apiFetch]);

    const addOrUpdateAnnouncement = async (
        announcement: Omit<Announcement, 'id' | 'id_school' | 'createdAt' | 'updatedAt'>, 
        id?: string
    ): Promise<ApiResponse<Announcement>> => {
        const isEdit = !!id;
        const method = isEdit ? 'PUT' : 'POST';
        const endpoint = isEdit ? `/announcements/${id}` : '/announcements';
        try {
            const savedItem = await apiFetch(endpoint, { method, body: JSON.stringify(announcement) });
            // Refresh all announcements after an update
            await fetchAllAnnouncements();
            return { success: true, item: savedItem };
        } catch (error: unknown) {
            const { message } = getApiError(error);
            return { success: false, message };
        }
    };

    const deleteAnnouncement = async (id: string): Promise<ApiResponse> => {
        try {
            await apiFetch(`/announcements/${id}`, { method: 'DELETE' });
            setAnnouncements(prev => prev.filter(a => a.id !== id));
            return { success: true };
        } catch (error: unknown) {
            const { message } = getApiError(error);
            return { success: false, message };
        }
    };

    const updateAnnouncementStatus = async (id: string, isActive: boolean): Promise<ApiResponse<Announcement>> => {
        try {
            const updatedItem = await apiFetch(`/announcements/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ isActive }),
            });
            setAnnouncements(prev => prev.map(item => (item.id === id ? updatedItem : item)));
            return { success: true, item: updatedItem };
        } catch (error: unknown) {
            const { message } = getApiError(error);
            return { success: false, message };
        }
    };

    return (
        <TimetableContext.Provider value={{
            schoolId, teachers, classGroups, subjects, locations, timeSlots, schedule, schoolInfo, loading, error, users, publishingStatus,
            substitutions, classGroupSubjects, announcements,
            activeTeachers, activeClassGroups, activeSubjects, activeLocations,
            archivedTeachers, archivedClassGroups, archivedSubjects, archivedLocations, archivedTimeSlots, fetchArchivedData,
            updateSchoolInfo,
            addOrUpdateTeacher: createAddOrUpdateHandler<Omit<Teacher, 'id' | 'id_school'>, Teacher>('/teachers', 'id', setTeachers),
            deleteTeacher: createDeleteHandler<Teacher>('/teachers', 'id', setTeachers, setArchivedTeachers),
            restoreTeacher: createRestoreHandler<Teacher>('/teachers', 'id', setTeachers, setArchivedTeachers),
            addOrUpdateSubject: createAddOrUpdateHandler<Omit<Subject, 'id_school'>, Subject>('/subjects', 'code', setSubjects),
            deleteSubject: createDeleteHandler<Subject>('/subjects', 'code', setSubjects, setArchivedSubjects),
            restoreSubject: createRestoreHandler<Subject>('/subjects', 'code', setSubjects, setArchivedSubjects),
            addOrUpdateClassGroup: createAddOrUpdateHandler<Omit<ClassGroup, 'id' | 'id_school'>, ClassGroup>('/class_groups', 'id', setClassGroups),
            deleteClassGroup: createDeleteHandler<ClassGroup>('/class_groups', 'id', setClassGroups, setArchivedClassGroups),
            restoreClassGroup: createRestoreHandler<ClassGroup>('/class_groups', 'id', setClassGroups, setArchivedClassGroups),
            addOrUpdateLocation: createAddOrUpdateHandler<Omit<Location, 'id' | 'id_school'>, Location>('/locations', 'id', setLocations),
            deleteLocation: createDeleteHandler<Location>('/locations', 'id', setLocations, setArchivedLocations),
            restoreLocation: createRestoreHandler<Location>('/locations', 'id', setLocations, setArchivedLocations),
            addOrUpdateTimeSlot: createAddOrUpdateHandler<Omit<TimeSlot, 'id_school'>, TimeSlot>('/time_slots', 'id', setTimeSlots),
            deleteTimeSlot: createDeleteHandler<TimeSlot>('/time_slots', 'id', setTimeSlots, setArchivedTimeSlots),
            restoreTimeSlot: createRestoreHandler<TimeSlot>('/time_slots', 'id', setTimeSlots, setArchivedTimeSlots),
            addOrUpdateUser,
            deleteUser,
            fetchUsers,
            fetchPublishingStatus,
            updatePublishingStatus,
            addScheduleEntry,
            updateScheduleEntry,
            deleteScheduleEntry,
            deleteConflictingEntryAndSave,
            addTeachersInBulk,
            addClassGroupsInBulk,
            addSubjectsInBulk,
            addLocationsInBulk,
            updateItemStatus,
            fetchSubstitutions,
            addSubstitution,
            deleteSubstitution,
            fetchClassGroupSubjects,
            updateClassGroupSubjects,
            attendanceLogs,
            fetchAttendanceLogs,
            saveAttendanceLogs,
            resetAttendanceLogs,
            attendanceStats,
            substitutionStats,
            fetchAttendanceStats,
            fetchSubstitutionStats,
            fetchAllAnnouncements,
            addOrUpdateAnnouncement,
            deleteAnnouncement,
            updateAnnouncementStatus
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