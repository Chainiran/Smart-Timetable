import React, { useEffect, useRef, useMemo } from 'react';
import PrintableTimetable from './PrintableTimetable';
// FIX: Import the centralized 'ColorBy' type to ensure consistency across components.
import { ScheduleEntry, SchoolInfo, TimeSlot, Subject, Teacher, Location, ClassGroup, ColorBy } from '../types';

// FIX: Removed local, incorrect type definition to use the centralized one from 'types.ts'.
// This was causing errors because it was missing the 'subject' option.
// type ColorBy = 'subjectGroup' | 'teacher' | 'classGroup';

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
    layout: 1 | 2 | 4 | 6 | 10;
    displayOptions: DisplayOptions;
    viewType: 'class' | 'teacher' | 'location';
    colorBy: ColorBy;
    showCoteachers: boolean;
    schoolInfo: SchoolInfo | null;
    timeSlots: TimeSlot[];
    subjects: Subject[];
    teachers: Teacher[];
    locations: Location[];
    classGroups: ClassGroup[];
    academicYear: string;
    semester: number;
    // FIX: Add 'schedule' prop to the interface to be passed down to child components.
    schedule: ScheduleEntry[];
}

// FIX: Refactored to a standard function declaration to avoid TSX parsing ambiguity with generic arrow functions.
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunkedArr: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunkedArr.push(array.slice(i, i + size));
    }
    return chunkedArr;
};

// This component wraps each print page and contains the logic to equalize row heights.
const PageWithEqualRowHeights: React.FC<{ children: React.ReactNode; className: string }> = ({ children, className }) => {
    const pageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Defer execution to allow the browser to render and calculate initial heights
        const timerId = setTimeout(() => {
            if (!pageRef.current) return;

            // FIX: Avoided using generics with querySelectorAll and used type assertions to resolve compiler errors.
            const tables = pageRef.current.querySelectorAll('.printable-table');

            tables.forEach(table => {
                const rows = Array.from(table.querySelectorAll('tbody > tr'));
                if (rows.length === 0) return;

                // 1. Reset heights to 'auto' to measure the natural height of each row based on its content
                // FIX: Casted row to HTMLTableRowElement to access properties like 'style' and 'offsetHeight'.
                rows.forEach(row => { (row as HTMLTableRowElement).style.height = 'auto'; });

                // 2. Find the maximum height among all rows in the current table
                const maxHeight = Math.max(...rows.map(row => (row as HTMLTableRowElement).offsetHeight));

                // 3. Apply the max height to all rows to make them uniform
                if (maxHeight > 0) {
                    rows.forEach(row => {
                        (row as HTMLTableRowElement).style.height = `${maxHeight}px`;
                    });
                }
            });
        }, 100); // A small delay is safer to account for rendering timing variations

        return () => clearTimeout(timerId);
    }, [children]); // Re-run if the content of the page changes

    return <div ref={pageRef} className={className}>{children}</div>;
};

const IndividualTeacherPrintPage: React.FC<Omit<PrintLayoutProps, 'items' | 'layout'> & { item: PrintLayoutProps['items'][0] }> = ({
    item, schoolInfo, academicYear, semester, schedule, subjects, ...props
}) => {

    const stats = useMemo(() => {
        const teacherSchedule = schedule.filter(e =>
            e.teacherIds.includes(item.id) &&
            e.academicYear === academicYear &&
            e.semester === semester
        );

        const subjectMap = new Map<string, { name: string; code: string; periods: number }>();
        let totalPeriods = 0;

        teacherSchedule.forEach(entry => {
            // Exclude "พักเที่ยง" (Lunch break) from statistics
            if (entry.customActivity === 'พักเที่ยง') {
                return;
            }

            let key: string;
            let subjectDetails: { name: string; code: string };

            if (entry.subjectCode) {
                const subject = subjects.find(s => s.code === entry.subjectCode);
                // If subject is not found, it might be from another school year, skip it.
                if (!subject) return;
                key = subject.code;
                subjectDetails = { name: subject.name, code: subject.code };
            } else if (entry.customActivity) {
                key = `activity_${entry.customActivity}`;
                subjectDetails = { name: entry.customActivity, code: 'กิจกรรม' };
            } else {
                return; // Skip entries with no subject or activity
            }

            // Increment total periods only for valid, counted entries
            totalPeriods++;

            if (!subjectMap.has(key)) {
                subjectMap.set(key, { ...subjectDetails, periods: 0 });
            }
            // Increment the count for this subject/activity
            subjectMap.get(key)!.periods++;
        });

        const subjectList = Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'));
        return { subjectList, totalPeriods };
    }, [item.id, schedule, subjects, academicYear, semester]);
    
    return (
<div 
  className="print-page flex items-center justify-center min-h-screen"
  style={{ display: 'flex', flexDirection: 'column', textAlign: 'center' }}
>
  <div className="flex flex-col items-center justify-start p-4 text-center leading-tight" style={{ lineHeight: 1.1 }}>
    {schoolInfo?.logoUrl && (
      <img 
        src={schoolInfo.logoUrl} 
        alt="School Logo" 
        className="object-contain mb-1"
        style={{ height: '1in' }}
      />
    )}
    {schoolInfo?.name && (
      <h3 className="text-xl font-bold mt-1 mb-0">{schoolInfo.name}</h3>
    )}
    <h3 className="text-xl font-bold mt-0 mb-0">ภาคเรียนที่ {semester}/{academicYear}</h3>
    <h3 className="text-xl font-bold mt-0 mb-2">ตารางสอนของ {item.name}</h3>
    
    <div className="w-full max-w-4xl text-left mt-2">
      <PrintableTimetable
        {...props}
        itemId={item.id}
        title={""}
        entries={item.entries}
        academicYear={academicYear}
        semester={semester}
        subjects={subjects}
        schoolInfo={schoolInfo}
        layout={1}
      />
    </div>
                
                <div className="w-full max-w-4xl mt-6 text-left">
                    <h3 className="text-md font-bold text-center">สถิติภาระงานสอน</h3>
                    <table className="w-full mt-2 text-sm printable-table">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="p-1 border border-black w-16">ลำดับ</th>
                                <th className="p-1 border border-black text-left w-40">รหัสวิชา/กิจกรรม</th>
                                <th className="p-1 border border-black text-left">ชื่อวิชา/กิจกรรม</th>
                                <th className="p-1 border border-black w-48">จำนวนคาบ/สัปดาห์</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.subjectList.map((subject, index) => (
                                <tr key={subject.code + index}>
                                    <td className="p-1 border border-black text-center">{index + 1}</td>
                                    <td className="p-1 border border-black">{subject.code}</td>
                                    <td className="p-1 border border-black">{subject.name}</td>
                                    <td className="p-1 border border-black text-center">{subject.periods}</td>
                                </tr>
                            ))}
                            <tr className="font-bold bg-gray-100">
                                <td colSpan={3} className="p-1 border border-black text-right">รวมจำนวนคาบสอนทั้งสิ้น</td>
                                <td className="p-1 border border-black text-center">{stats.totalPeriods} คาบ/สัปดาห์</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


const PrintLayout: React.FC<PrintLayoutProps> = (props) => {
    const {
        items,
        layout,
    } = props;
    
     if (layout === 10) {
        return (
            <div>
                {items.map(item => (
                    <IndividualTeacherPrintPage
                        key={item.id}
                        item={item}
                        {...props}
                    />
                ))}
            </div>
        );
    }


    // FIX: Explicitly provide the generic type to the `chunkArray` function. This corrects a type inference failure where the `item` in the downstream `.map()` was being inferred as `unknown`, causing compiler errors.
    const pages = chunkArray<PrintLayoutProps['items'][number]>(items, layout);

    const gridClassName = layout === 1 ? 'grid-1-per-page' : layout === 2 ? 'grid-2-per-page' : layout === 4 ? 'grid-4-per-page' : 'grid-6-per-page';


    return (
        <div>
            {pages.map((pageItems, pageIndex) => (
                <PageWithEqualRowHeights key={pageIndex} className={`print-page ${gridClassName}`}>
                    
                    {pageItems.map(item => (
                        <PrintableTimetable
                            key={item.id}
                            {...props}
                            // FIX: Override the 'layout' prop with the narrowed type to satisfy PrintableTimetableProps.
                            layout={layout}
                            itemId={item.id}
                            title={item.name}
                            entries={item.entries}
                        />
                    ))}
                </PageWithEqualRowHeights>
            ))}
        </div>
    );
};

export default PrintLayout;