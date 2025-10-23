import React, { useState } from 'react';
// FIX: Import the centralized 'ColorBy' type to ensure consistency across components.
import { ScheduleEntry, ColorBy } from '../types';
import { DAYS_OF_WEEK, SUBJECT_GROUP_COLORS, DYNAMIC_COLOR_PALETTE } from '../constants';
import { useTimetable } from '../context/TimetableContext';
import { Book, User, MapPin, Edit, Trash2, AlertTriangle, Users } from 'lucide-react';

// FIX: Removed local type definition to use the centralized one from 'types.ts'.
// type ColorBy = 'subjectGroup' | 'teacher' | 'classGroup' | 'subject';

interface DisplayOptions {
    showSubjectName: boolean;
    showSubjectCode: boolean;
    showTeacher: boolean;
    showClassGroup: boolean;
    showLocation: boolean;
    useSubjectColors: boolean;
}

interface TimetableGridProps {
    entries: ScheduleEntry[];
    isEditable: boolean;
    viewContext: 'class' | 'teacher' | 'location';
    colorBy: ColorBy;
    displayOptions?: DisplayOptions;
    onCellClick?: (day: string, timeSlotId: string) => void;
    onEditEntry?: (entry: ScheduleEntry) => void;
    onDeleteEntry?: (entry: ScheduleEntry) => void;
    onDropOnCell?: (event: React.DragEvent<HTMLTableCellElement>, day: string, timeSlotId: string) => void;
    onDragStartEntry?: (event: React.DragEvent<HTMLDivElement>, entry: ScheduleEntry) => void;
    onDragEndEntry?: (event: React.DragEvent<HTMLDivElement>) => void;
    selectedItemCount?: number;
}

// Simple hash function to get a consistent number from a string for color variation
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

const TimetableGrid: React.FC<TimetableGridProps> = ({ 
    entries, 
    isEditable, 
    viewContext,
    colorBy,
    displayOptions = {
        showSubjectName: true,
        showSubjectCode: false,
        showTeacher: true,
        showClassGroup: true,
        showLocation: true,
        useSubjectColors: true,
    },
    onCellClick, 
    onEditEntry, 
    onDeleteEntry,
    onDropOnCell,
    onDragStartEntry,
    onDragEndEntry,
    selectedItemCount = 1
}) => {
    const { timeSlots, subjects, teachers, locations, classGroups } = useTimetable();
    const [dragOverCell, setDragOverCell] = useState<{ day: string, timeSlotId: string } | null>(null);

    const getEntriesForCell = (day: string, timeSlotId: string) => {
        return entries.filter(e => e.day === day && e.timeSlotId === timeSlotId);
    };

    const getDynamicBgColor = (entry: ScheduleEntry): string => {
        if (!displayOptions.useSubjectColors) return isEditable ? '#e0f2fe' : '#e5e7eb'; // Tailwind blue-100 or gray-200

        const lightness = 85; // Fixed lightness for consistent color as requested.

        switch (colorBy) {
            case 'teacher': {
                const firstTeacherId = entry.teacherIds[0];
                if (!firstTeacherId) return '#f3f4f6'; // gray-100
                const teacherHash = stringToHash(firstTeacherId);
                const baseColor = DYNAMIC_COLOR_PALETTE[Math.abs(teacherHash) % DYNAMIC_COLOR_PALETTE.length];
                return `hsl(${baseColor.h}, ${baseColor.s}%, ${lightness}%)`;
            }
            case 'classGroup': {
                if (!entry.classGroupId) return '#f3f4f6'; // gray-100
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
                if (!subject) return '#fefce8'; // yellow-50 for custom activity
                const baseColor = SUBJECT_GROUP_COLORS[subject.subjectGroup] || SUBJECT_GROUP_COLORS.default;
                return `hsl(${baseColor.h}, ${baseColor.s}%, ${lightness}%)`;
            }
        }
    };


    const defaultCellContent = (entry: ScheduleEntry) => {
        const subject = entry.subjectCode ? subjects.find(s => s.code === entry.subjectCode) : null;
        const entryTeachers = teachers.filter(t => entry.teacherIds.includes(t.id));
        const location = locations.find(l => l.id === entry.locationId);
        const classGroup = classGroups.find(cg => cg.id === entry.classGroupId);
        const classGroupDisplayName = classGroup?.name || entry.classGroupId;
        
        const isComplete = entry.customActivity ? !!entry.customActivity : (!!entry.subjectCode && (entry.teacherIds?.length ?? 0) > 0 && !!entry.locationId);

        const bgColorStyle = { backgroundColor: getDynamicBgColor(entry) };

        const isCustomActivity = !!entry.customActivity;
        const displayName = isCustomActivity ? entry.customActivity : subject?.name;
        const displayCode = subject?.code; // Real code only

        let mainDisplay: string | undefined = undefined;
        let subDisplay: string | undefined = undefined;

        if (displayOptions.showSubjectName && displayName) {
            mainDisplay = displayName;
            // Add code as sub-display only for normal subjects
            if (displayOptions.showSubjectCode && displayCode) {
                subDisplay = displayCode;
            }
        } else if (displayOptions.showSubjectCode) {
            // If only showing "code", use name for custom activities, and code for normal subjects.
            mainDisplay = isCustomActivity ? displayName : displayCode;
        }


        return (
             <div 
                draggable={isEditable && !!onDragStartEntry}
                onDragStart={(e) => {
                    if (isEditable && onDragStartEntry) {
                        e.stopPropagation();
                        onDragStartEntry(e, entry);
                    }
                }}
                onDragEnd={(e) => {
                    if (isEditable && onDragEndEntry) { onDragEndEntry(e); }
                }}
                style={bgColorStyle} 
                className={`rounded-lg p-2 text-gray-800 h-full flex flex-col justify-between text-sm relative overflow-hidden ${isEditable && onDragStartEntry ? 'cursor-move' : ''}`}
            >
                {!isComplete && (
                    <div className="absolute top-1 right-1 text-yellow-600" title="ข้อมูลไม่สมบูรณ์">
                        <AlertTriangle size={16} />
                    </div>
                )}
                <div className="min-w-0">
                    {mainDisplay && <div className="font-bold mb-1 flex items-center text-base"><Book size={16} className="mr-1.5 flex-shrink-0"/><span className="truncate">{mainDisplay}</span></div>}
                    {subDisplay && <div className="text-xs text-gray-600 mb-1 pl-6 truncate">{subDisplay}</div>}
                    
                    {viewContext === 'class' && displayOptions.showTeacher && <div className="mb-1 flex items-center"><User size={16} className="mr-1.5 flex-shrink-0"/><span className="truncate">{entryTeachers.map(t => t.name).join(', ') || ''}</span></div>}
                    {viewContext === 'class' && selectedItemCount > 1 && displayOptions.showClassGroup && <div className="mb-1 flex items-center font-semibold text-fuchsia-800"><Users size={16} className="mr-1.5 flex-shrink-0"/><span className="truncate">{classGroup?.name || 'N/A'}</span></div>}
                    
                    {viewContext === 'teacher' && displayOptions.showClassGroup && <div className="mb-1 flex items-center font-semibold text-fuchsia-800"><Users size={16} className="mr-1.5 flex-shrink-0"/><span className="truncate">{classGroupDisplayName || 'N/A'}</span></div>}
                    {viewContext === 'teacher' && selectedItemCount > 1 && displayOptions.showTeacher && <div className="mb-1 flex items-center"><User size={16} className="mr-1.5 flex-shrink-0"/><span className="truncate">{entryTeachers.map(t => t.name).join(', ') || ''}</span></div>}

                    {viewContext === 'location' && (
                        <>
                            {displayOptions.showClassGroup && <div className="mb-1 flex items-center font-semibold text-fuchsia-800"><Users size={16} className="mr-1.5 flex-shrink-0"/><span className="truncate">{classGroupDisplayName || 'N/A'}</span></div>}
                            {displayOptions.showTeacher && <div className="mb-1 flex items-center"><User size={16} className="mr-1.5 flex-shrink-0"/><span className="truncate">{entryTeachers.map(t => t.name).join(', ') || ''}</span></div>}
                        </>
                    )}
                    
                    {displayOptions.showLocation && <div className="flex items-center"><MapPin size={16} className="mr-1.5 flex-shrink-0"/><span className="truncate">{location?.name || ''}</span></div>}
                </div>
                {isEditable && onEditEntry && onDeleteEntry && (
                    <div className="flex justify-end items-end space-x-1 mt-1 flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); onEditEntry(entry); }} className="p-1 rounded-full bg-white bg-opacity-50 hover:bg-opacity-100 text-blue-600 hover:text-blue-800">
                            <Edit size={16} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry); }} className="p-1 rounded-full bg-white bg-opacity-50 hover:bg-opacity-100 text-red-600 hover:text-red-800">
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table 
                className="w-full border-collapse min-w-max"
                onDragLeave={() => setDragOverCell(null)}
            >
                <thead>
                    <tr className="bg-gray-200">
                        <th className="sticky top-0 left-0 z-20 p-3 text-sm font-semibold text-left text-gray-700 bg-gray-200 border border-gray-300 w-28">วัน/คาบ</th>
                        {timeSlots.map(slot => (
                            <th key={slot.id} className="sticky top-0 z-10 p-2 text-sm font-semibold text-center text-gray-700 bg-gray-200 border border-gray-300">
                                <div>คาบที่ {slot.period}</div>
                                <div className="font-normal text-xs text-gray-500">{slot.startTime}-{slot.endTime}</div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {DAYS_OF_WEEK.slice(0, 5).map(day => (
                        <tr key={day} className="group even:bg-gray-50">
                            <td className="sticky left-0 z-10 p-3 font-bold text-gray-700 text-center bg-white border border-gray-300 group-even:bg-gray-50">
                                {day}
                            </td>
                            {timeSlots.map(slot => {
                                const cellEntries = getEntriesForCell(day, slot.id);
                                
                                const sortedCellEntries = [...cellEntries].sort((a, b) => {
                                    const getName = (entry: ScheduleEntry, colorByType: ColorBy): string => {
                                        switch (colorByType) {
                                            case 'teacher':
                                                const teacher = teachers.find(t => t.id === entry.teacherIds[0]);
                                                return teacher?.name || '';
                                            case 'classGroup':
                                                const classGroup = classGroups.find(cg => cg.id === entry.classGroupId);
                                                return classGroup?.name || '';
                                            case 'subject':
                                                const subject = subjects.find(s => s.code === entry.subjectCode);
                                                return subject?.name || '';
                                            case 'subjectGroup':
                                                const subjectForGroup = subjects.find(s => s.code === entry.subjectCode);
                                                return subjectForGroup?.subjectGroup || '';
                                            default:
                                                return '';
                                        }
                                    };

                                    const nameA = getName(a, colorBy);
                                    const nameB = getName(b, colorBy);

                                    return nameA.localeCompare(nameB, 'th');
                                });

                                return (
                                    <td key={slot.id} 
                                        className={`p-1 border border-gray-300 align-top relative transition-colors ${isEditable && cellEntries.length === 0 ? 'cursor-pointer hover:bg-blue-50' : ''} ${dragOverCell && dragOverCell.day === day && dragOverCell.timeSlotId === slot.id ? 'bg-sky-100 ring-2 ring-sky-500' : ''}`}
                                        onClick={() => isEditable && onCellClick && cellEntries.length === 0 && onCellClick(day, slot.id)}
                                        onDragOver={(e) => {
                                            if (isEditable && cellEntries.length === 0 && onDropOnCell) {
                                                e.preventDefault();
                                                setDragOverCell({ day, timeSlotId: slot.id });
                                            }
                                        }}
                                        onDrop={(e) => {
                                            if (isEditable && cellEntries.length === 0 && onDropOnCell) {
                                                e.preventDefault();
                                                onDropOnCell(e, day, slot.id);
                                            }
                                            setDragOverCell(null);
                                        }}
                                    >
                                        
                                        <div style={{minHeight: '6rem'}}>
                                            {sortedCellEntries.length > 0 && (
                                                <div className="flex flex-col space-y-1 h-full overflow-y-auto">
                                                    {sortedCellEntries.map(entry => (
                                                        <div key={entry.id}>
                                                            {defaultCellContent(entry)}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TimetableGrid;