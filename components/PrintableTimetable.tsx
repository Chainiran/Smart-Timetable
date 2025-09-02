import React from 'react';
import { ScheduleEntry, TimeSlot, Subject, Teacher, Location, ClassGroup } from '../types';
import { DAYS_OF_WEEK } from '../constants';
import { Book, User, MapPin } from 'lucide-react';

interface DisplayOptions {
    showSubjectName: boolean;
    showSubjectCode: boolean;
    showTeacher: boolean;
    showClassGroup: boolean;
    showLocation: boolean;
    useSubjectColors: boolean;
}

interface PrintableTimetableProps {
    title: string;
    entries: ScheduleEntry[];
    viewType: 'class' | 'teacher' | 'location';
    displayOptions: DisplayOptions;
    timeSlots: TimeSlot[];
    subjects: Subject[];
    teachers: Teacher[];
    locations: Location[];
    classGroups: ClassGroup[];
}

const PrintableTimetable: React.FC<PrintableTimetableProps> = ({
    title,
    entries,
    viewType,
    displayOptions,
    timeSlots,
    subjects,
    teachers,
    locations,
    classGroups
}) => {
    
    const getEntryForCell = (day: string, timeSlotId: string) => {
        return entries.find(e => e.day === day && e.timeSlotId === timeSlotId);
    };

    const renderCellContent = (entry: ScheduleEntry) => {
        const subject = entry.subjectCode ? subjects.find(s => s.code === entry.subjectCode) : null;
        const entryTeachers = teachers.filter(t => entry.teacherIds.includes(t.id));
        const location = locations.find(l => l.id === entry.locationId);
        const classGroup = classGroups.find(cg => cg.id === entry.classGroupId);

        const bgColor = displayOptions.useSubjectColors && subject ? subject.color : 'bg-gray-100';

        const subjectName = entry.customActivity || subject?.name;
        const teacherName = entryTeachers.map(t => t.name).join(', ');

        return (
            <div className={`${bgColor} text-gray-800 h-full flex flex-col justify-center text-[8px] leading-tight p-1`}>
                {displayOptions.showSubjectName && subjectName && <div className="font-bold truncate flex items-center"><Book size={8} className="mr-1 flex-shrink-0"/>{subjectName}</div>}
                {displayOptions.showSubjectCode && subject?.code && <div className="text-gray-600 truncate">{subject.code}</div>}
                
                {viewType !== 'teacher' && displayOptions.showTeacher && teacherName && <div className="truncate flex items-center"><User size={8} className="mr-1 flex-shrink-0"/>{teacherName}</div>}
                {viewType !== 'class' && displayOptions.showClassGroup && classGroup?.name && <div className="truncate font-semibold">{classGroup.name}</div>}
                
                {displayOptions.showLocation && location?.name && <div className="truncate flex items-center"><MapPin size={8} className="mr-1 flex-shrink-0"/>{location.name}</div>}
            </div>
        );
    };

    return (
        <div className="border border-gray-400 p-2 h-full flex flex-col">
            <h3 className="text-sm font-bold text-center mb-1">{title}</h3>
            <table className="w-full border-collapse table-fixed flex-grow">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="p-1 text-[9px] font-semibold text-gray-700 border border-gray-300 w-10">คาบ</th>
                        {timeSlots.map(slot => (
                            <th key={slot.id} className="p-0.5 text-[8px] font-semibold text-center text-gray-700 border border-gray-300">
                                <div>{slot.period}</div>
                                <div className="font-normal">{slot.startTime}</div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {DAYS_OF_WEEK.slice(0, 5).map(day => (
                        <tr key={day}>
                            <td className="p-1 border border-gray-300 font-bold text-gray-700 text-center text-[9px]">
                                {day.substring(0,3)}
                            </td>
                            {timeSlots.map(slot => {
                                const entry = getEntryForCell(day, slot.id);
                                return (
                                    <td key={slot.id} className="border border-gray-300 align-top">
                                        {entry ? renderCellContent(entry) : <div />}
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

export default PrintableTimetable;
