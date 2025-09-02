import React from 'react';
import { ScheduleEntry } from '../types';
import { DAYS_OF_WEEK } from '../constants';
import { useTimetable } from '../context/TimetableContext';
import { Book, User, MapPin, Edit, Trash2, AlertTriangle, Users } from 'lucide-react';

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
    displayOptions?: DisplayOptions;
    onCellClick?: (day: string, timeSlotId: string) => void;
    onEditEntry?: (entry: ScheduleEntry) => void;
    onDeleteEntry?: (id: string) => void;
    selectedItemCount?: number;
}

const TimetableGrid: React.FC<TimetableGridProps> = ({ 
    entries, 
    isEditable, 
    viewContext,
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
    selectedItemCount = 1
}) => {
    const { timeSlots, subjects, teachers, locations, classGroups } = useTimetable();

    const getEntriesForCell = (day: string, timeSlotId: string) => {
        return entries.filter(e => e.day === day && e.timeSlotId === timeSlotId);
    };

    const defaultCellContent = (entry: ScheduleEntry) => {
        const subject = entry.subjectCode ? subjects.find(s => s.code === entry.subjectCode) : null;
        const entryTeachers = teachers.filter(t => entry.teacherIds.includes(t.id));
        const location = locations.find(l => l.id === entry.locationId);
        const classGroup = classGroups.find(cg => cg.id === entry.classGroupId);
        
        const isComplete = entry.customActivity ? !!entry.customActivity : (!!entry.subjectCode && (entry.teacherIds?.length ?? 0) > 0 && !!entry.locationId);

        const bgColor = displayOptions.useSubjectColors && subject 
            ? subject.color 
            : (isComplete ? (isEditable ? 'bg-blue-100' : 'bg-gray-200') : 'bg-yellow-200');

        const subjectNameContent = entry.customActivity || subject?.name;
        const subjectCodeContent = subject?.code;

        let mainDisplay: string | undefined = undefined;
        let subDisplay: string | undefined = undefined;

        if (displayOptions.showSubjectName && subjectNameContent) {
            mainDisplay = subjectNameContent;
            if (displayOptions.showSubjectCode && subjectCodeContent) {
                subDisplay = subjectCodeContent;
            }
        } else if (displayOptions.showSubjectCode && subjectCodeContent) {
            mainDisplay = subjectCodeContent;
        }


        return (
             <div className={`${bgColor} rounded-lg p-2 text-gray-800 h-full flex flex-col justify-between text-sm relative overflow-hidden`}>
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
                    
                    {viewContext === 'teacher' && displayOptions.showClassGroup && <div className="mb-1 flex items-center font-semibold text-fuchsia-800"><Users size={16} className="mr-1.5 flex-shrink-0"/><span className="truncate">{classGroup?.name || 'N/A'}</span></div>}
                    {viewContext === 'teacher' && selectedItemCount > 1 && displayOptions.showTeacher && <div className="mb-1 flex items-center"><User size={16} className="mr-1.5 flex-shrink-0"/><span className="truncate">{entryTeachers.map(t => t.name).join(', ') || ''}</span></div>}

                    {viewContext === 'location' && (
                        <>
                            {displayOptions.showClassGroup && <div className="mb-1 flex items-center font-semibold text-fuchsia-800"><Users size={16} className="mr-1.5 flex-shrink-0"/><span className="truncate">{classGroup?.name || 'N/A'}</span></div>}
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
                        <button onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }} className="p-1 rounded-full bg-white bg-opacity-50 hover:bg-opacity-100 text-red-600 hover:text-red-800">
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full border-collapse table-fixed">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="p-3 text-sm font-semibold text-left text-gray-700 border border-gray-300 w-28">วัน/คาบ</th>
                        {timeSlots.map(slot => (
                            <th key={slot.id} className="p-2 text-sm font-semibold text-center text-gray-700 border border-gray-300">
                                <div>คาบที่ {slot.period}</div>
                                <div className="font-normal text-xs text-gray-500">{slot.startTime}-{slot.endTime}</div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {DAYS_OF_WEEK.slice(0, 5).map(day => (
                        <tr key={day} className="even:bg-gray-50">
                            <td className="p-3 border border-gray-300 font-bold text-gray-700 text-center">
                                {day}
                            </td>
                            {timeSlots.map(slot => {
                                const cellEntries = getEntriesForCell(day, slot.id);
                                
                                return (
                                    <td key={slot.id} 
                                        className={`p-1 border border-gray-300 align-top relative ${isEditable && cellEntries.length === 0 ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''}`}
                                        onClick={() => isEditable && onCellClick && cellEntries.length === 0 && onCellClick(day, slot.id)}>
                                        
                                        <div style={{minHeight: '6rem'}}>
                                            {cellEntries.length > 0 && (
                                                <div className="flex flex-col space-y-1 h-full overflow-y-auto">
                                                    {cellEntries.map(entry => (
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