import React from 'react';
import PrintableTimetable from './PrintableTimetable';
import { ScheduleEntry, SchoolInfo, TimeSlot, Subject, Teacher, Location, ClassGroup } from '../types';

interface DisplayOptions {
    showSubjectName: boolean;
    showSubjectCode: boolean;
    showTeacher: boolean;
    showClassGroup: boolean;
    showLocation: boolean;
    useSubjectColors: boolean;
}

interface PrintLayoutProps {
    items: {
        id: string;
        name: string;
        entries: ScheduleEntry[];
    }[];
    layout: 2 | 4 | 8;
    displayOptions: DisplayOptions;
    viewType: 'class' | 'teacher' | 'location';
    schoolInfo: SchoolInfo | null;
    timeSlots: TimeSlot[];
    subjects: Subject[];
    teachers: Teacher[];
    locations: Location[];
    classGroups: ClassGroup[];
}

const chunkArray = <T,>(array: T[], size: number): T[][] => {
    const chunkedArr: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunkedArr.push(array.slice(i, i + size));
    }
    return chunkedArr;
};

const PrintLayout: React.FC<PrintLayoutProps> = ({
    items,
    layout,
    displayOptions,
    viewType,
    schoolInfo,
    timeSlots,
    subjects,
    teachers,
    locations,
    classGroups
}) => {
    const pages = chunkArray(items, layout);

    const title = viewType === 'class' ? 'ตารางเรียน' : viewType === 'teacher' ? 'ตารางสอน' : 'ตารางการใช้สถานที่';

    return (
        <div>
            {pages.map((pageItems, pageIndex) => (
                <div key={pageIndex} className={`print-page grid-${layout}-per-page`}>
                    {pageIndex === 0 && (
                        <div className={`col-span-full text-center mb-4 ${layout === 8 ? 'hidden' : ''}`}>
                             <h1 className="text-xl font-bold">{schoolInfo?.name}</h1>
                             <p>ปีการศึกษา {schoolInfo?.academicYear} ภาคเรียนที่ {schoolInfo?.currentSemester}</p>
                             <h2 className="text-lg font-semibold">{title}</h2>
                        </div>
                    )}
                    {pageItems.map(item => (
                        <PrintableTimetable
                            key={item.id}
                            title={item.name}
                            entries={item.entries}
                            viewType={viewType}
                            displayOptions={displayOptions}
                            timeSlots={timeSlots}
                            subjects={subjects}
                            teachers={teachers}
                            locations={locations}
                            classGroups={classGroups}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};

export default PrintLayout;