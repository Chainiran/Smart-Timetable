import React, { useEffect, useRef } from 'react';
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
    layout: 1 | 2 | 4 | 6;
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


const PrintLayout: React.FC<PrintLayoutProps> = ({
    items,
    layout,
    displayOptions,
    viewType,
    colorBy,
    showCoteachers,
    schoolInfo,
    timeSlots,
    subjects,
    teachers,
    locations,
    classGroups,
    academicYear,
    semester,
}) => {
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
                            itemId={item.id}
                            title={item.name}
                            entries={item.entries}
                            viewType={viewType}
                            displayOptions={displayOptions}
                            colorBy={colorBy}
                            showCoteachers={showCoteachers}
                            timeSlots={timeSlots}
                            subjects={subjects}
                            teachers={teachers}
                            locations={locations}
                            classGroups={classGroups}
                            academicYear={academicYear}
                            semester={semester}
                            schoolInfo={schoolInfo}
                            layout={layout}
                        />
                    ))}
                </PageWithEqualRowHeights>
            ))}
        </div>
    );
};

export default PrintLayout;