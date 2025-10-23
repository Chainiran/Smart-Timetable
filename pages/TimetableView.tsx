import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { useTimetable } from '../context/TimetableContext';
import TimetableGrid from '../components/TimetableGrid';
import PrintModal from '../components/PrintModal';
import PrintLayout from '../components/PrintLayout';
import { ScheduleEntry, Location, Teacher, ClassGroup, ColorBy, TimeSlot } from '../types';
import { Printer, Settings, ChevronDown, ChevronUp, Search, User, FileDown } from 'lucide-react';
import SearchableMultiSelect from '../components/SearchableMultiSelect';
import { SEMESTER_OPTIONS, DAYS_OF_WEEK, SUBJECT_GROUP_OPTIONS } from '../constants';
import { useAuth } from '../context/AuthContext';


interface TimetableViewProps {
    viewType: 'class' | 'teacher' | 'location' | 'substitution';
}

interface PrintData {
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
}

interface DisplayOptions {
    showSubjectName: boolean;
    showSubjectCode: boolean;

    showTeacher: boolean;
    showClassGroup: boolean;
    showLocation: boolean;
    useSubjectColors: boolean;
}

const SearchableLocationSelect: React.FC<{
    selectedId: string;
    onSelect: (id: string) => void;
    locations: Location[];
}> = ({ selectedId, onSelect, locations }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const selectedLocation = locations.find(l => l.id === selectedId);

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
        if (selectedLocation) {
            setSearchTerm(selectedLocation.name);
        } else {
            setSearchTerm('');
        }
    }, [selectedLocation]);

    const filteredLocations = locations.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative w-full md:w-1/2" ref={wrapperRef}>
             <label className="block text-lg font-medium text-gray-700 mb-2">เลือกสถานที่:</label>
            <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {setSearchTerm(e.target.value); setIsOpen(true);}}
                    onFocus={() => setIsOpen(true)}
                    placeholder="ค้นหาสถานที่..."
                    className="w-full p-2 pl-10 border border-gray-300 rounded-md shadow-sm"
                />
            </div>
            {isOpen && (
                <ul className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                    {filteredLocations.length > 0 ? filteredLocations.map(l => (
                        <li key={l.id}
                            onClick={() => {
                                onSelect(l.id);
                                setIsOpen(false);
                            }}
                            className="p-2 hover:bg-blue-100 cursor-pointer"
                        >
                            {l.name}
                        </li>
                    )) : <li className="p-2 text-gray-500">ไม่พบสถานที่</li>}
                </ul>
            )}
        </div>
    );
}

const FreeSlotsGrid: React.FC<{
    freeTeachersBySlot: { [day: string]: { [timeSlotId: string]: Teacher[] } };
    timeSlots: TimeSlot[];
}> = ({ freeTeachersBySlot, timeSlots }) => {

    return (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
            <h2 className="p-4 text-xl font-semibold text-gray-800 border-b">ตารางคาบว่างของครู</h2>
            <table className="w-full border-collapse min-w-max">
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
                                const freeTeachers = freeTeachersBySlot[day]?.[slot.id] || [];
                                return (
                                    <td key={slot.id} className="p-1.5 border border-gray-300 align-top text-xs" style={{ minHeight: '6rem' }}>
                                        {freeTeachers.length > 0 ? (
                                            <ul className="list-none p-0 m-0 space-y-0.5 max-h-36 overflow-y-auto">
                                                {freeTeachers.map(teacher => (
                                                    <li key={teacher.id} className="truncate p-0.5 rounded bg-green-100 text-green-800">
                                                        {teacher.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-400">
                                                -
                                            </div>
                                        )}
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

const TimetableView: React.FC<TimetableViewProps> = ({ viewType }) => {
    const { 
        classGroups, teachers, locations, schedule, schoolInfo, 
        timeSlots, subjects, publishingStatus, substitutions, fetchSubstitutions 
    } = useTimetable();
    const { user } = useAuth();
    
    // State for Class/Teacher/Location view
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedSemesterKey, setSelectedSemesterKey] = useState<string>('');
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [printData, setPrintData] = useState<PrintData | null>(null);
    const [showFreeSlots, setShowFreeSlots] = useState(false);
    const [displayOptions, setDisplayOptions] = useState({
        showSubjectName: false,
        showSubjectCode: true,
        showTeacher: viewType !== 'teacher',
        showClassGroup: viewType !== 'class',
        showLocation: viewType !== 'location',
        useSubjectColors: true,
    });
    const [colorBy, setColorBy] = useState<ColorBy>('subjectGroup');
    
    // State for Substitution view
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (viewType === 'substitution' && selectedDate) {
            fetchSubstitutions(selectedDate);
        }
    }, [viewType, selectedDate, fetchSubstitutions]);
    
    const dayOfWeek = useMemo(() => {
        if (!selectedDate) return '';
        const date = new Date(selectedDate);
        const dayIndex = date.getUTCDay();
        const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
        return thaiDays[dayIndex];
    }, [selectedDate]);


    // Create a list of available semesters based on publishing status and user role.
    const availableSemesters = useMemo(() => {
        const createOption = (semester: number, year: string) => {
            const baseOption = SEMESTER_OPTIONS.find(s => s.value === semester);
            return {
                key: `${year}_${semester}`,
                label: `${baseOption?.label || `ภาคเรียนที่ ${semester}`} ปีการศึกษา ${year}`,
                year,
                semester,
            };
        };

        if (!schoolInfo) return [];

        let allPossibleSemesters: { year: string, semester: number, isPublished: boolean }[] = [];

        if (publishingStatus && publishingStatus.length > 0) {
            allPossibleSemesters = publishingStatus.map(s => ({ 
                year: s.academicYear, 
                semester: s.semester,
                isPublished: s.isPublished 
            }));
        }

        const currentSemesterExists = allPossibleSemesters.some(
            s => s.year === schoolInfo.academicYear && s.semester === schoolInfo.currentSemester
        );
        if (!currentSemesterExists) {
            allPossibleSemesters.push({ 
                year: schoolInfo.academicYear, 
                semester: schoolInfo.currentSemester,
                isPublished: false 
            });
        }

        let visibleSemesters: { year: string, semester: number }[];

        if (user) {
            // Logged-in admin/super sees all semesters
            visibleSemesters = allPossibleSemesters;
        } else {
            // Guest sees only published semesters
            visibleSemesters = allPossibleSemesters.filter(s => s.isPublished);
            if(visibleSemesters.length === 0) return [];
        }

        const uniqueSemesters = Array.from(new Map(visibleSemesters.map(s => [`${s.year}_${s.semester}`, s])).values());
        
        const semesterOptions = uniqueSemesters.map(p => createOption(p.semester, p.year));

        // Sort by year descending, then semester descending to get the latest first
        semesterOptions.sort((a, b) => {
            if (a.year !== b.year) {
                return b.year.localeCompare(a.year, undefined, { numeric: true });
            }
            return b.semester - a.semester;
        });
        
        return semesterOptions;

    }, [publishingStatus, schoolInfo, user]);

    // Derive selected year and semester number from the unique key
    const { selectedYear, selectedSemesterNum } = useMemo(() => {
        if (!selectedSemesterKey) {
            return { 
                selectedYear: schoolInfo?.academicYear ?? '', 
                selectedSemesterNum: schoolInfo?.currentSemester ?? 0 
            };
        }
        const [year, semester] = selectedSemesterKey.split('_');
        return { selectedYear: year, selectedSemesterNum: Number(semester) };
    }, [selectedSemesterKey, schoolInfo]);

    // Set the default semester to the latest available one when the component loads or options change.
    useEffect(() => {
        if (availableSemesters.length > 0) {
            if (!selectedSemesterKey || !availableSemesters.find(s => s.key === selectedSemesterKey)) {
                setSelectedSemesterKey(availableSemesters[0].key);
            }
        } else {
            setSelectedSemesterKey('');
        }
    }, [availableSemesters, selectedSemesterKey]);
    
    useEffect(() => {
        if (viewType !== 'teacher') {
            setShowFreeSlots(false);
        }
    }, [viewType]);

    const handlePrint = (config: {
        ids: string[];
        layout: 1 | 2 | 4 | 6;
        displayOptions: DisplayOptions;
        colorBy: ColorBy;
        showCoteachers: boolean;
    }) => {
        if (viewType === 'substitution') {
            return;
        }
        const semesterSchedule = schedule.filter(e => e.academicYear === selectedYear && e.semester === selectedSemesterNum);
        
        const itemsToPrint = config.ids.map(id => {
            const item = (viewType === 'class' ? classGroups : viewType === 'teacher' ? teachers : locations).find(i => i.id === id);
            let itemEntries: ScheduleEntry[] = [];
            
            if (viewType === 'class') {
                const selectedGroup = classGroups.find(cg => cg.id === id);
                if (selectedGroup) {
                    let idsToInclude: string[] = [id];
    
                    if (selectedGroup.parentId) {
                        idsToInclude.push(selectedGroup.parentId);
                    } 
                    else {
                        const childIds = classGroups
                            .filter(cg => cg.parentId === id)
                            .map(cg => cg.id);
                        idsToInclude.push(...childIds);
                    }
                    
                    itemEntries = semesterSchedule.filter(e => e.classGroupId && idsToInclude.includes(e.classGroupId));
                }
            }
            else if (viewType === 'teacher') itemEntries = semesterSchedule.filter(e => e.teacherIds.includes(id));
            else if (viewType === 'location') itemEntries = semesterSchedule.filter(e => e.locationId === id);

            return { id, name: item?.name || 'N/A', entries: itemEntries };
        });

        setPrintData({
            items: itemsToPrint,
            layout: config.layout,
            displayOptions: config.displayOptions,
            viewType,
            colorBy: config.colorBy,
            showCoteachers: config.showCoteachers,
        });

        setTimeout(() => {
            const printContent = document.getElementById('printable-content');
            if (printContent) {
                const newWindow = window.open('', '_blank');
                if (newWindow) {
                    const printRootEl = newWindow.document.createElement('div');
                    newWindow.document.body.appendChild(printRootEl);
                    const root = createRoot(printRootEl);
                    
                    const stylesheets = Array.from(document.styleSheets).map(sheet => sheet.href ? `<link rel="stylesheet" href="${sheet.href}">` : '').join('');
                    
                    const orientationStyle = (config.layout === 1 || config.layout === 4)
                        ? `@page { size: A4 landscape; margin: 0.5in; }`
                        : `@page { size: A4 portrait; margin: 0.5in; }`;
                    
                    let zoomStyle = '';
                    if (config.layout === 4) {
                        zoomStyle = 'body { zoom: 0.8; }';
                    } else if (config.layout === 6) {
                        zoomStyle = 'body { zoom: 0.7; }';
                    }

                    newWindow.document.head.innerHTML = `
                        <title>พิมพ์ตาราง</title>
                        ${stylesheets}
                        <style>
                            ${orientationStyle}
                            ${zoomStyle}
                            @media print {
                                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                .print-page { page-break-after: always; }
                                .printable-table {
                                    border-collapse: collapse;
                                    width: 100%;
                                }
                                .printable-table th,
                                .printable-table td {
                                    border: 1px solid black;
                                }
                            }
                            .print-page {
                                display: grid;
                                gap: 1rem;
                                padding: 0.25rem;
                                height: 100%;
                                width: 100%;
                                box-sizing: border-box;
                            }
                            .grid-1-per-page { grid-template-rows: 1fr; }
                            .grid-2-per-page { grid-template-rows: repeat(2, 1fr); }
                            .grid-4-per-page { grid-template-columns: 1fr 1fr; grid-template-rows: repeat(2, 1fr); }
                            .grid-6-per-page { grid-template-columns: 1fr 1fr; grid-template-rows: repeat(3, 1fr); }
                        </style>
                    `;
                    root.render(
                        <React.StrictMode>
                            <PrintLayout
                                items={itemsToPrint}
                                layout={config.layout}
                                displayOptions={config.displayOptions}
                                viewType={viewType}
                                colorBy={config.colorBy}
                                showCoteachers={config.showCoteachers}
                                schoolInfo={schoolInfo}
                                timeSlots={timeSlots}
                                subjects={subjects}
                                teachers={teachers}
                                locations={locations}
                                classGroups={classGroups}
                                academicYear={selectedYear}
                                semester={selectedSemesterNum}
                            />
                        </React.StrictMode>
                    );

                    setTimeout(() => {
                        newWindow.print();
                        newWindow.close();
                        setPrintData(null); // Clean up
                    }, 500);
                }
            }
        }, 100);
    };
    
    const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setDisplayOptions(prev => ({ ...prev, [name]: checked }));
    };

    const handleColorByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setColorBy(e.target.value as ColorBy);
    };

    const handleSemesterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSemesterKey(e.target.value);
        setSelectedIds([]);
    };
    
    const handleExportToCsv = () => {
        if (viewType === 'substitution' || selectedIds.length === 0) {
            alert('กรุณาเลือกอย่างน้อย 1 รายการเพื่อส่งออก');
            return;
        }
    
        const headers = ["item_name", "day", "period", "start_time", "end_time", "subject_code", "subject_name", "activity", "teacher_names", "location_name", "class_group_name"];
        const csvRows: string[][] = [];
    
        const semesterSchedule = schedule.filter(e => e.academicYear === selectedYear && e.semester === selectedSemesterNum);
        const currentViewItems = viewType === 'class' ? classGroups : viewType === 'teacher' ? teachers : locations;
    
        selectedIds.forEach(id => {
            const item = currentViewItems.find(i => i.id === id);
            if (!item) return;
    
            let itemEntries: ScheduleEntry[] = [];
            if (viewType === 'class') {
                const selectedGroup = classGroups.find(cg => cg.id === id);
                if (selectedGroup) {
                    let idsToInclude: string[] = [id];
                    if (selectedGroup.parentId) {
                        idsToInclude.push(selectedGroup.parentId);
                    } else {
                        const childIds = classGroups.filter(cg => cg.parentId === id).map(cg => cg.id);
                        idsToInclude.push(...childIds);
                    }
                    itemEntries = semesterSchedule.filter(e => e.classGroupId && idsToInclude.includes(e.classGroupId));
                }
            } else if (viewType === 'teacher') {
                itemEntries = semesterSchedule.filter(e => e.teacherIds.includes(id));
            } else if (viewType === 'location') {
                itemEntries = semesterSchedule.filter(e => e.locationId === id);
            }
    
            itemEntries.forEach(entry => {
                const timeSlot = timeSlots.find(ts => ts.id === entry.timeSlotId);
                const subject = subjects.find(s => s.code === entry.subjectCode);
                const entryTeachers = teachers.filter(t => entry.teacherIds.includes(t.id));
                const location = locations.find(l => l.id === entry.locationId);
                const classGroup = classGroups.find(cg => cg.id === entry.classGroupId);
    
                const row = [
                    item.name,
                    entry.day,
                    String(timeSlot?.period || ''),
                    String(timeSlot?.startTime || ''),
                    String(timeSlot?.endTime || ''),
                    String(subject?.code || ''),
                    String(subject?.name || ''),
                    String(entry.customActivity || ''),
                    entryTeachers.map(t => t.name).join(' | '),
                    String(location?.name || ''),
                    String(classGroup?.name || '')
                ];
                csvRows.push(row);
            });
        });
    
        if (csvRows.length === 0) {
            alert('ไม่พบข้อมูลตารางสอนสำหรับรายการที่เลือกในภาคเรียนนี้');
            return;
        }
    
        const escapeCsvCell = (cell: string): string => {
            const str = cell ?? '';
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
    
        const csvContent = [
            headers.join(','),
            ...csvRows.map(row => row.map(escapeCsvCell).join(','))
        ].join('\r\n');
        
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `timetable_${viewType}_${selectedYear}-${selectedSemesterNum}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };
    
    const handleSubstitutionExportToCsv = () => {
        if (substitutions.length === 0) {
            alert('ไม่มีข้อมูลสำหรับส่งออก');
            return;
        }
        const headers = ["คาบที่", "เวลา", "ครูที่ไม่มา", "เหตุผล", "ครูที่สอนแทน", "รหัสวิชา", "วิชา/กิจกรรม", "กลุ่มเรียน", "สถานที่", "หมายเหตุ"];
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += headers.join(',') + '\r\n';
        substitutions.forEach(sub => {
            const row = [
                sub.timeSlotPeriod,
                `${sub.startTime.slice(0,5)}-${sub.endTime.slice(0,5)}`,
                sub.absentTeacherName,
                sub.reason,
                sub.substituteTeacherName,
                sub.subjectCode || '',
                sub.subjectName,
                sub.classGroupName,
                sub.locationName,
                sub.notes || ''
            ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
            csvContent += row + '\r\n';
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `substitutions_${selectedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSubstitutionPrintPdf = () => {
        if (substitutions.length === 0) {
            alert('ไม่มีข้อมูลสำหรับพิมพ์');
            return;
        }
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write('<html><head><title>รายการสอนแทน</title>');
            printWindow.document.write(`<style> body { font-family: sans-serif; margin: 1in; } @page { size: A4 landscape; } h1, h2 { text-align: center; } table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10pt; } th, td { border: 1px solid #333; padding: 8px; text-align: left; word-break: break-word; } th { background-color: #e5e7eb; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } } </style>`);
            printWindow.document.write('</head><body>');
            printWindow.document.write(`<h1>${schoolInfo?.name || 'รายการสอนแทน'}</h1>`);
            printWindow.document.write(`<h2>รายการจัดสอนแทน วันที่ ${new Date(selectedDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })} (${dayOfWeek})</h2>`);
            let tableHtml = '<table><thead><tr>';
            const headers = ["ลำดับ", "คาบ", "ครูที่ไม่มา", "เหตุผล", "ครูที่สอนแทน", "รหัสวิชา", "วิชา/กิจกรรม", "กลุ่มเรียน", "สถานที่", "หมายเหตุ"];
            headers.forEach(h => tableHtml += `<th>${h}</th>`);
            tableHtml += '</tr></thead><tbody>';
            substitutions.forEach((sub, index) => {
                tableHtml += `<tr><td>${index + 1}</td><td>${sub.timeSlotPeriod} (${sub.startTime.slice(0,5)}-${sub.endTime.slice(0,5)})</td><td>${sub.absentTeacherName}</td><td>${sub.reason}</td><td>${sub.substituteTeacherName}</td><td>${sub.subjectCode || ''}</td><td>${sub.subjectName}</td><td>${sub.classGroupName}</td><td>${sub.locationName}</td><td>${sub.notes || ''}</td></tr>`;
            });
            tableHtml += '</tbody></table>';
            printWindow.document.write(tableHtml);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };

    const title = viewType === 'class' ? 'ตารางเรียน' : viewType === 'teacher' ? 'ตารางสอน' : viewType === 'location' ? 'ตารางการใช้สถานที่' : 'รายการสอนแทน';

    const currentViewItems = useMemo(() => {
        if (viewType === 'class') return classGroups;
        if (viewType === 'teacher') return teachers;
        return locations;
    }, [viewType, classGroups, teachers, locations]);

    const sortedItems = useMemo(() =>
        [...currentViewItems].sort((a, b) => a.name.localeCompare(b.name, 'th')),
    [currentViewItems]);


    const filteredSchedule = useMemo(() => {
        if (selectedIds.length === 0) return [];
        
        const semesterSchedule = schedule.filter(e => e.academicYear === selectedYear && e.semester === selectedSemesterNum);

        if (viewType === 'class') {
            return semesterSchedule.filter(e => selectedIds.includes(e.classGroupId || ''));
        }
        if (viewType === 'teacher') {
            return semesterSchedule.filter(e => e.teacherIds.some(tid => selectedIds.includes(tid)));
        }
        // viewType === 'location'
        return semesterSchedule.filter(e => selectedIds.includes(e.locationId || ''));

    }, [selectedIds, schedule, viewType, selectedYear, selectedSemesterNum]);

    const freeTeachersBySlot = useMemo(() => {
        const result: { [day: string]: { [timeSlotId: string]: Teacher[] } } = {};
        if (!showFreeSlots || viewType !== 'teacher' || selectedIds.length === 0) {
            return result;
        }

        const semesterSchedule = schedule.filter(e => e.academicYear === selectedYear && e.semester === selectedSemesterNum);

        const teachersToCheck = teachers.filter(t => selectedIds.includes(t.id));
        if (teachersToCheck.length === 0) return result;

        DAYS_OF_WEEK.slice(0, 5).forEach(day => {
            result[day] = {};
            timeSlots.forEach(slot => {
                const busyTeacherIds = new Set(
                    semesterSchedule
                        .filter(e => e.day === day && e.timeSlotId === slot.id)
                        .flatMap(e => e.teacherIds)
                );
                const freeTeachersInSlot = teachersToCheck.filter(t => !busyTeacherIds.has(t.id));
                result[day][slot.id] = freeTeachersInSlot;
            });
        });

        return result;
    }, [showFreeSlots, viewType, selectedIds, schedule, selectedYear, selectedSemesterNum, teachers, timeSlots]);
    
    if (viewType === 'substitution') {
        return (
            <div>
                <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-gray-800">รายการสอนแทน</h1>
                    <div className="flex items-center gap-2">
                        <button onClick={handleSubstitutionPrintPdf} className="flex items-center bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm">
                            <Printer size={18} className="mr-2"/> พิมพ์ PDF
                        </button>
                        <button onClick={handleSubstitutionExportToCsv} className="flex items-center bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm">
                            <FileDown size={18} className="mr-2"/> ส่งออก CSV
                        </button>
                    </div>
                </div>

                <div className="mb-6 p-4 bg-white rounded-lg shadow">
                    <div className="flex items-center gap-3">
                        <label htmlFor="sub-date" className="text-lg font-medium text-gray-700">เลือกวันที่:</label>
                        <input type="date" id="sub-date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="p-2 border border-gray-300 rounded-md shadow-sm"/>
                        {dayOfWeek && <span className="text-lg font-semibold text-blue-600">{dayOfWeek}</span>}
                    </div>
                </div>

                <div className="p-4 bg-white rounded-lg shadow">
                     <h2 className="text-2xl font-semibold text-gray-700 mb-4">รายการสอนแทนวันที่ {new Date(selectedDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</h2>
                     <div className="overflow-x-auto">
                        <table className="w-full min-w-max">
                            <thead className="bg-gray-100">
                                 <tr>
                                    {['คาบ', 'ครูที่ไม่มา', 'เหตุผล', 'ครูที่สอนแทน', 'รหัสวิชา', 'วิชา/กิจกรรม', 'กลุ่มเรียน', 'สถานที่', 'หมายเหตุ'].map(h => 
                                        <th key={h} className="p-3 text-left font-semibold text-gray-600">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {substitutions.length > 0 ? substitutions.sort((a,b) => a.timeSlotPeriod - b.timeSlotPeriod).map(sub => (
                                    <tr key={sub.id} className="border-t hover:bg-gray-50">
                                        <td className="p-3">{sub.timeSlotPeriod} ({sub.startTime.slice(0,5)}-{sub.endTime.slice(0,5)})</td>
                                        <td className="p-3">{sub.absentTeacherName}</td>
                                        <td className="p-3">{sub.reason}</td>
                                        <td className="p-3 font-medium text-green-700">{sub.substituteTeacherName}</td>
                                        <td className="p-3">{sub.subjectCode || '-'}</td>
                                        <td className="p-3">{sub.subjectName}</td>
                                        <td className="p-3">{sub.classGroupName}</td>
                                        <td className="p-3">{sub.locationName}</td>
                                        <td className="p-3">{sub.notes || '-'}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={9} className="text-center p-4 text-gray-500">ไม่มีรายการสอนแทนในวันที่เลือก</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div>
            {/* Print Layout Rendering */}
            {printData && (
                <div style={{ display: 'none' }}>
                    <div id="printable-content">
                        <PrintLayout
                            items={printData.items}
                            layout={printData.layout}
                            displayOptions={printData.displayOptions}
                            viewType={printData.viewType}
                            colorBy={printData.colorBy}
                            showCoteachers={printData.showCoteachers}
                            schoolInfo={schoolInfo}
                            timeSlots={timeSlots}
                            subjects={subjects}
                            teachers={teachers}
                            locations={locations}
                            classGroups={classGroups}
                            academicYear={selectedYear}
                            semester={selectedSemesterNum}
                        />
                    </div>
                </div>
            )}

            <PrintModal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                onSubmit={handlePrint}
                viewType={viewType}
                options={sortedItems}
                initialDisplayOptions={displayOptions}
                initialColorBy={colorBy}
            />

            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4 no-print">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
                    <p className="text-md text-gray-600 mt-1">
                        {availableSemesters.find(s => s.key === selectedSemesterKey)?.label || 'กรุณาเลือกภาคเรียน'}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setIsPrintModalOpen(true)} className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                        <Printer size={20} className="mr-2" /> พิมพ์ / ส่งออก PDF
                    </button>
                     <button onClick={handleExportToCsv} className="flex items-center bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                        <FileDown size={20} className="mr-2" /> ส่งออก CSV
                    </button>
                    <button onClick={() => setIsOptionsOpen(!isOptionsOpen)} className="flex items-center bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                        <Settings size={20} className="mr-2" /> ตัวเลือก
                        {isOptionsOpen ? <ChevronUp size={20} className="ml-1" /> : <ChevronDown size={20} className="ml-1" />}
                    </button>
                </div>
            </div>

            {isOptionsOpen && (
                 <div className="mb-6 p-4 bg-white rounded-lg shadow-md border animate-fade-in-down no-print">
                    <h3 className="text-lg font-semibold mb-3 text-gray-700">ตั้งค่าการแสดงผลตาราง</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showSubjectName" checked={displayOptions.showSubjectName} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>ชื่อวิชา/กิจกรรม</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showSubjectCode" checked={displayOptions.showSubjectCode} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>รหัสวิชา</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showTeacher" checked={displayOptions.showTeacher} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>ครูผู้สอน</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showClassGroup" checked={displayOptions.showClassGroup} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>กลุ่มเรียน</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showLocation" checked={displayOptions.showLocation} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>สถานที่</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="useSubjectColors" checked={displayOptions.useSubjectColors} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>ใช้สีพื้นหลัง</span></label>
                    </div>
                     <div className="flex items-center gap-2 max-w-xs">
                        <label htmlFor="color-scheme-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">จำแนกสีตาม:</label>
                        <select
                            id="color-scheme-select"
                            value={colorBy}
                            onChange={handleColorByChange}
                            className="block w-full pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                            <option value="subjectGroup">กลุ่มสาระวิชา</option>
                            <option value="teacher">ครูผู้สอน</option>
                            <option value="classGroup">กลุ่มเรียน</option>
                            <option value="subject">รายวิชา</option>
                        </select>
                    </div>
                </div>
            )}

            <div className="relative z-30 mb-6 p-4 bg-white rounded-lg shadow no-print">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    {viewType === 'class' && (
                        <SearchableMultiSelect
                            label="เลือกกลุ่มเรียน (สามารถเลือกได้หลายกลุ่ม):"
                            options={sortedItems as ClassGroup[]}
                            selectedIds={selectedIds}
                            onChange={setSelectedIds}
                            placeholder="ค้นหากลุ่มเรียน..."
                            viewType='class'
                        />
                    )}
                    {viewType === 'teacher' && (
                        <SearchableMultiSelect
                            label="เลือกครู (สามารถเลือกได้หลายคน):"
                            options={sortedItems as Teacher[]}
                            selectedIds={selectedIds}
                            onChange={setSelectedIds}
                            placeholder="ค้นหาครู..."
                            viewType='teacher'
                            allTeachers={teachers}
                        />
                    )}
                    {viewType === 'location' && (
                         <SearchableLocationSelect
                            locations={sortedItems as Location[]}
                            selectedId={selectedIds[0] || ''}
                            onSelect={(id) => setSelectedIds(id ? [id] : [])}
                        />
                    )}
                     <div className="w-full md:w-auto">
                        <label htmlFor="semester-select" className="block text-lg font-medium text-gray-700 mb-2">เลือกภาคเรียน:</label>
                        <select
                            id="semester-select"
                            value={selectedSemesterKey}
                            onChange={handleSemesterChange}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                            {availableSemesters.length === 0 && <option>ไม่มีภาคเรียนที่เผยแพร่</option>}
                            {availableSemesters.map(opt => (
                                <option key={opt.key} value={opt.key}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                 {viewType === 'teacher' && selectedIds.length > 0 && (
                     <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 flex items-start">
                        <User size={20} className="mr-3 mt-1 flex-shrink-0" />
                        <div>
                            <p className="font-semibold">ข้อมูลครูที่เลือก:</p>
                            <ul className="list-disc list-inside text-sm">
                               {teachers.filter(t => selectedIds.includes(t.id)).map(t => (
                                   <li key={t.id}>{t.name} (กลุ่มสาระ: {t.subjectGroup})</li>
                               ))}
                           </ul>
                       </div>
                    </div>
                )}
                 {viewType === 'teacher' && (
                    <div className="mt-4 pt-4 border-t">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input type="checkbox" checked={showFreeSlots} onChange={e => setShowFreeSlots(e.target.checked)} className="form-checkbox h-5 w-5 text-purple-600 rounded" />
                            <span className="text-lg font-medium text-gray-700">แสดงตารางคาบว่างของครูที่เลือก</span>
                        </label>
                    </div>
                )}
            </div>

            <div className="print-container">
                {selectedIds.length === 0 ? (
                    <div className="text-center p-8 bg-white rounded-lg shadow">
                        <h2 className="text-xl font-semibold text-gray-700">กรุณาเลือก{title.replace('ตาราง', '')}เพื่อแสดงตาราง</h2>
                    </div>
                ) : showFreeSlots && viewType === 'teacher' ? (
                    <FreeSlotsGrid
                        freeTeachersBySlot={freeTeachersBySlot}
                        timeSlots={timeSlots}
                    />
                ) : (
                    <TimetableGrid 
                        entries={filteredSchedule} 
                        isEditable={false} 
                        viewContext={viewType}
                        colorBy={colorBy}
                        displayOptions={displayOptions}
                        selectedItemCount={selectedIds.length}
                    />
                )}
            </div>
        </div>
    );
};

export default TimetableView;