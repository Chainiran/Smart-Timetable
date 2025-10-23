import React, { useMemo } from 'react';
// FIX: Import the centralized 'ColorBy' type to ensure consistency across components.
import { ScheduleEntry, TimeSlot, Subject, Teacher, Location, ClassGroup, ColorBy, SchoolInfo } from '../types';
import { DAYS_OF_WEEK, SUBJECT_GROUP_COLORS, DYNAMIC_COLOR_PALETTE } from '../constants';

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

interface PrintableTimetableProps {
    itemId: string;
    title: string;
    entries: ScheduleEntry[];
    viewType: 'class' | 'teacher' | 'location';
    colorBy: ColorBy;
    displayOptions: DisplayOptions;
    showCoteachers: boolean;
    timeSlots: TimeSlot[];
    subjects: Subject[];
    teachers: Teacher[];
    locations: Location[];
    classGroups: ClassGroup[];
    academicYear: string;
    semester: number;
    layout: 1 | 2 | 4 | 6;
    schoolInfo: SchoolInfo | null;
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

const DAY_ABBREVIATIONS: { [key: string]: string } = {
    'จันทร์': 'จ.',
    'อังคาร': 'อ.',
    'พุธ': 'พ.',
    'พฤหัสบดี': 'พฤ.',
    'ศุกร์': 'ศ.',
    'เสาร์': 'ส.',
    'อาทิตย์': 'อา.'
};


const PrintableTimetable: React.FC<PrintableTimetableProps> = ({
    itemId,
    title,
    entries,
    viewType,
    colorBy,
    displayOptions,
    showCoteachers,
    timeSlots,
    subjects,
    teachers,
    locations,
    classGroups,
    academicYear,
    semester,
    layout,
    schoolInfo,
}) => {
    
    const finalTitle = useMemo(() => {
        const schoolName = viewType !== 'location' && schoolInfo?.name ? ` ${schoolInfo.name}` : '';
        let titlePrefix = title;

        if (viewType === 'location') {
            const location = locations.find(l => l.id === itemId);
            if (location && location.responsibleTeacherId) {
                const teacher = teachers.find(t => t.id === location.responsibleTeacherId);
                if (teacher) {
                    const firstName = teacher.name.split(' ')[0];
                    titlePrefix = `${title} (${firstName})`;
                }
            }
        }
        
        return `${titlePrefix} ภาคเรียนที่ ${semester}/${academicYear}${schoolName}`;
    }, [title, semester, academicYear, viewType, itemId, locations, teachers, schoolInfo]);

    const getEntriesForCell = (day: string, timeSlotId: string) => {
        return entries.filter(e => e.day === day && e.timeSlotId === timeSlotId);
    };

    const getDynamicBgColor = (entry: ScheduleEntry): string => {
        if (!displayOptions.useSubjectColors) return '#ffffff'; // white

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

    // Define all size-related classes based on layout
    const {
        headerFontSize,
        tableHeaderPeriodSize,
        tableHeaderTimeSize,
        dayFontSize,
        cellPadding,
        cellContentClass,
        cellContentPaddingClass
    } = useMemo(() => {
        let sizes = {
            headerFontSize: 'text-sm',
            tableHeaderPeriodSize: 'text-[9px]',
            tableHeaderTimeSize: 'text-[8px]',
            dayFontSize: 'text-[9px]',
            cellPadding: 'p-0',
            cellContentClass: 'text-[8px]',
            cellContentPaddingClass: 'p-1',
        };

        if (layout === 4) {
            sizes = {
                headerFontSize: 'text-[10px]',
                tableHeaderPeriodSize: 'text-[7px]',
                tableHeaderTimeSize: 'text-[6px]',
                dayFontSize: 'text-[7px]',
                cellPadding: 'p-0',
                cellContentClass: 'text-[6px]', // Reduced from 7px to ~80%
                cellContentPaddingClass: 'p-0.5',
            };
        } else if (layout === 6) {
            sizes = {
                headerFontSize: 'text-[9px]',
                tableHeaderPeriodSize: 'text-[6px]',
                tableHeaderTimeSize: 'text-[5px]',
                dayFontSize: 'text-[6px]',
                cellPadding: 'p-0',
                cellContentClass: 'text-[5px]',
                cellContentPaddingClass: 'p-px',
            };
        }
        return sizes;
    }, [layout]);

    const renderCellContent = (entry: ScheduleEntry) => {
        const subject = entry.subjectCode ? subjects.find(s => s.code === entry.subjectCode) : null;
        const entryTeachers = teachers.filter(t => entry.teacherIds.includes(t.id));
        const location = locations.find(l => l.id === entry.locationId);
        const classGroup = classGroups.find(cg => cg.id === entry.classGroupId);

        const bgColorStyle = { backgroundColor: getDynamicBgColor(entry) };

        const isCustomActivity = !!entry.customActivity;
        const nameToShow = isCustomActivity ? entry.customActivity : subject?.name;
        const codeToShow = isCustomActivity ? entry.customActivity : subject?.code;
        
        const getFirstName = (fullName?: string) => (fullName || '').split(' ')[0];

        const teacherName = showCoteachers
            ? entryTeachers.map(t => getFirstName(t.name)).join(', ')
            : getFirstName(entryTeachers[0]?.name);

        return (
            <div style={bgColorStyle} className={`text-gray-800 h-full ${cellContentClass} leading-tight ${cellContentPaddingClass} overflow-hidden`}>
                <div className="font-bold truncate">
                    {displayOptions.showSubjectName && nameToShow ? nameToShow : (displayOptions.showSubjectCode && codeToShow ? codeToShow : '')}
                </div>
                
                {viewType !== 'teacher' && displayOptions.showTeacher && teacherName && <div className="truncate">{teacherName}</div>}
                {viewType !== 'class' && displayOptions.showClassGroup && classGroup?.name && <div className="font-semibold truncate">{classGroup.name}</div>}
                
                {displayOptions.showLocation && location?.name && <div className="truncate">{location.name}</div>}
            </div>
        );
    };

    return (
        <div className="p-2 h-full flex flex-col">
             <div className="text-center mb-1">
                <h3 className={`${headerFontSize} font-bold`}>
                    {finalTitle}
                </h3>
            </div>
            <table className="w-full table-fixed flex-grow-1 h-full printable-table">
                <thead>
                    <tr className="bg-gray-200">
                        <th className={`p-1 ${dayFontSize} font-semibold text-gray-700`}>วัน</th>
                        {timeSlots.map(slot => (
                            <th key={slot.id} className="p-0.5 font-semibold text-center text-gray-700">
                                <div className={tableHeaderPeriodSize}>{slot.period}</div>
                                <div className={`font-normal ${tableHeaderTimeSize}`}>{`${slot.startTime.slice(0, 5)}-${slot.endTime.slice(0, 5)}`}</div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="h-full grid grid-rows-5">
                    {DAYS_OF_WEEK.slice(0, 5).map(day => (
                        <tr key={day} className="flex">
                            <td className={`p-1 font-bold text-gray-700 text-center ${dayFontSize} w-10 flex items-center justify-center`}>
                                {DAY_ABBREVIATIONS[day] || day}
                            </td>
                            {timeSlots.map(slot => {
                                const cellEntries = getEntriesForCell(day, slot.id);
                                return (
                                    <td key={slot.id} className={`align-top ${cellPadding} flex-1`}>
                                         <div className="flex flex-col space-y-px h-full">
                                            {cellEntries.map(entry => (
                                                <div key={entry.id}>
                                                    {renderCellContent(entry)}
                                                </div>
                                            ))}
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

export default PrintableTimetable;