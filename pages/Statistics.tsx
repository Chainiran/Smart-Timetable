import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { useTimetable } from '../context/TimetableContext';
import { Teacher, Subject, ScheduleEntry, AttendanceStat, SubstitutionStat } from '../types';
import { SUBJECT_GROUP_OPTIONS } from '../constants';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Printer, BarChart2, CheckCheck, Repeat, Search, FileDown } from 'lucide-react';
import SearchableMultiSelect from '../components/SearchableMultiSelect';
import PrintableStatistics from '../components/PrintableStatistics';


ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// FIX: Define a type for a single subject statistic entry to avoid 'unknown' type errors.
type SubjectStatValue = AttendanceStat['subjectStats'][string];

interface SubjectLoadStat {
    details: { code: string; name: string };
    periods: number;
    coTaughtPeriods: number;
}

interface TeacherLoadStat {
    teacher: Teacher;
    totalPeriods: number;
    coTeachingPeriods: number;
    subjects: Map<string, SubjectLoadStat>;
}

const getThaiDateString = (): string => {
    try {
        // Use 'sv-SE' locale for its YYYY-MM-DD format, and specify the Bangkok timezone.
        const dateString = new Date().toLocaleDateString('sv-SE', {
            timeZone: 'Asia/Bangkok',
        });
        return dateString;
    } catch (e) {
        console.error("Could not format date for Thai timezone, falling back to local date.", e);
        // Fallback for older environments
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
};

const getFirstDayOfMonthThai = (): string => {
    const todayString = getThaiDateString(); // e.g., "2024-07-25"
    return todayString.substring(0, 8) + '01'; // "2024-07-01"
};


// --- Teaching Load Component ---
const TeachingLoadStats: React.FC<{
    selectedSubjectGroup: string;
    onSubjectGroupChange: (group: string) => void;
    displayedStats: TeacherLoadStat[];
    chartRef: React.RefObject<ChartJS<'bar'>>;
}> = ({ selectedSubjectGroup, onSubjectGroupChange, displayedStats, chartRef }) => {
    const { schoolInfo } = useTimetable();

    const chartData = useMemo(() => ({
        labels: displayedStats.map(s => s.teacher.name),
        datasets: [{
            label: 'จำนวนคาบสอนทั้งหมด',
            data: displayedStats.map(s => s.totalPeriods),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
        }],
    }), [displayedStats]);
    
    return (
        <div className="space-y-6">
            <div className="p-4 bg-white rounded-lg shadow no-print">
                 <label htmlFor="subject-group-filter" className="block text-lg font-medium text-gray-700 mb-2">
                    เลือกกลุ่มสาระฯ:
                </label>
                <select 
                    id="subject-group-filter"
                    value={selectedSubjectGroup}
                    onChange={(e) => onSubjectGroupChange(e.target.value)}
                    className="w-full md:w-1/3 p-2 border border-gray-300 rounded-md shadow-sm"
                >
                    <option value="all">ทั้งหมด</option>
                    {SUBJECT_GROUP_OPTIONS.map(group => (
                        <option key={group} value={group}>{group}</option>
                    ))}
                </select>
            </div>
            <div className="p-4 bg-white rounded-lg shadow h-[400px]">
                <Bar ref={chartRef} options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' as const }, title: { display: true, text: `สถิติจำนวนคาบสอนของครู (ปีการศึกษา ${schoolInfo?.academicYear} ภาคเรียนที่ ${schoolInfo?.currentSemester})`, font: { size: 16 }}},
                    scales: { y: { beginAtZero: true, title: { display: true, text: 'จำนวนคาบ' }}}
                }} data={chartData} />
            </div>
             <div className="p-4 bg-white rounded-lg shadow overflow-x-auto">
                 <h3 className="text-xl font-semibold text-gray-700 mb-4">ตารางสรุปภาระงานสอน</h3>
                 <table id="stats-table" className="w-full min-w-max">
                     <thead className="bg-gray-100">
                         <tr>
                             <th className="p-3 text-left font-semibold text-gray-600">ลำดับ</th>
                             <th className="p-3 text-left font-semibold text-gray-600">ชื่อผู้สอน</th>
                             <th className="p-3 text-left font-semibold text-gray-600">รหัสวิชา/กิจกรรม</th>
                             <th className="p-3 text-left font-semibold text-gray-600">ชื่อวิชา/กิจกรรม</th>
                             <th className="p-3 text-center font-semibold text-gray-600">จำนวนคาบ</th>
                             <th className="p-3 text-left font-semibold text-gray-600">หมายเหตุ</th>
                             <th className="p-3 text-center font-semibold text-gray-600">รวมทั้งหมด</th>
                         </tr>
                     </thead>
                     <tbody>
                        {displayedStats.map((stat, teacherIndex) => {
                            const subjects: SubjectLoadStat[] = [...stat.subjects.values()].sort((a: SubjectLoadStat, b: SubjectLoadStat) => a.details.name.localeCompare(b.details.name, 'th'));
                            const rowSpan = subjects.length || 1;
                            return (
                                <React.Fragment key={stat.teacher.id}>
                                    {subjects.length > 0 ? subjects.map((subjectStat, subjectIndex) => (
                                        <tr key={subjectStat.details.code} className="border-t hover:bg-gray-50">
                                            {subjectIndex === 0 && (
                                                <>
                                                    <td rowSpan={rowSpan} className="p-3 align-top text-center">{teacherIndex + 1}</td>
                                                    <td rowSpan={rowSpan} className="p-3 align-top font-medium">{stat.teacher.name}</td>
                                                </>
                                            )}
                                            <td className="p-3">{subjectStat.details.code.startsWith('activity_') ? 'กิจกรรม' : subjectStat.details.code}</td>
                                            <td className="p-3">{subjectStat.details.name}</td>
                                            <td className="p-3 text-center">{subjectStat.periods}</td>
                                            <td className="p-3">{subjectStat.coTaughtPeriods > 0 ? `สอนร่วม ${subjectStat.coTaughtPeriods} คาบ` : ''}</td>
                                            {subjectIndex === 0 && (
                                                <td rowSpan={rowSpan} className="p-3 text-center font-bold align-top">{stat.totalPeriods}</td>
                                            )}
                                        </tr>
                                    )) : (
                                        <tr className="border-t hover:bg-gray-50">
                                            <td className="p-3 text-center">{teacherIndex + 1}</td>
                                            <td className="p-3 font-medium">{stat.teacher.name}</td>
                                            <td className="p-3 text-gray-500" colSpan={4}>- ไม่มีข้อมูลการสอน -</td>
                                            <td className="p-3 text-center font-bold">{stat.totalPeriods}</td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                     </tbody>
                 </table>
             </div>
        </div>
    );
};

// --- Attendance Stats Component ---
const AttendanceStats: React.FC<{
    dateRange: { startDate: string; endDate: string };
    onDateRangeChange: (range: { startDate: string, endDate: string }) => void;
    displayedStats: AttendanceStat[];
    onFetch: () => void;
    loading: boolean;
    allActivities: string[];
    excludedActivities: string[];
    onExcludedActivitiesChange: (activities: string[]) => void;
}> = ({ dateRange, onDateRangeChange, displayedStats, onFetch, loading, allActivities, excludedActivities, onExcludedActivitiesChange }) => {
    return (
      <div className="space-y-4 p-4 bg-white rounded-lg shadow">
        <div className="flex flex-col gap-4 no-print">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700">วันที่เริ่มต้น</label>
                <input type="date" value={dateRange.startDate} onChange={e => onDateRangeChange({ ...dateRange, startDate: e.target.value })} className="mt-1 p-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">วันที่สิ้นสุด</label>
                <input type="date" value={dateRange.endDate} onChange={e => onDateRangeChange({ ...dateRange, endDate: e.target.value })} className="mt-1 p-2 border rounded-md" />
              </div>
              <button onClick={onFetch} disabled={loading} className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300">
                <Search size={18} className="mr-2"/> {loading ? 'กำลังโหลด...' : 'แสดงข้อมูล'}
              </button>
            </div>
            {allActivities.length > 0 && (
                <div className="w-full md:w-2/3 lg:w-1/2">
                    <SearchableMultiSelect
                        label="กิจกรรมพิเศษที่ไม่ต้องแสดงผล:"
                        options={allActivities.map(act => ({ id: act, name: act }))}
                        selectedIds={excludedActivities}
                        onChange={onExcludedActivitiesChange}
                        placeholder="เลือกกิจกรรมเพื่อซ่อน..."
                        widthClass="w-full"
                    />
                </div>
            )}
        </div>
        {loading ? <p className="text-center p-4">กำลังโหลดข้อมูล...</p> : (
            <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-left font-semibold text-gray-600">ลำดับ</th>
                            <th className="p-3 text-left font-semibold text-gray-600">ชื่อผู้สอน</th>
                            <th className="p-3 text-left font-semibold text-gray-600">รายวิชา/กิจกรรม</th>
                            <th className="p-3 text-center font-semibold text-gray-600">คาบที่สอนตามตาราง</th>
                            <th className="p-3 text-center font-semibold text-gray-600">เข้าสอนเอง</th>
                            <th className="p-3 text-center font-semibold text-gray-600">มีครูสอนแทน</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedStats.map((teacherStat, index) => {
                            // FIX: Use type assertion on Object.values to ensure `subjects` are correctly typed.
                            const subjects = (Object.values(teacherStat.subjectStats) as SubjectStatValue[]).sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'th'));
                            const rowSpan = subjects.length || 1;
                            return (
                                <React.Fragment key={teacherStat.teacherId}>
                                    {subjects.map((subStat, subIndex) => (
                                        <tr key={subIndex} className="border-t">
                                            {subIndex === 0 && <td rowSpan={rowSpan} className="p-3 align-top text-center">{index + 1}</td>}
                                            {subIndex === 0 && <td rowSpan={rowSpan} className="p-3 align-top font-medium">{teacherStat.teacherName}</td>}
                                            <td className="p-3">{subStat.subjectName}</td>
                                            <td className="p-3 text-center">{subStat.totalScheduled}</td>
                                            <td className="p-3 text-center">{subStat.taughtBySelf}</td>
                                            <td className="p-3 text-center">{subStat.taughtBySubstitute}</td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
                 {displayedStats.length === 0 && (
                    <div className="text-center p-4 text-gray-500">
                        ไม่พบข้อมูลสถิติในช่วงวันที่ที่เลือก หรือข้อมูลทั้งหมดถูกกรองออก
                    </div>
                )}
            </div>
        )}
      </div>
    );
};

// --- Substitution Stats Component ---
const SubstitutionStats: React.FC<{
    dateRange: { startDate: string; endDate: string };
    onDateRangeChange: (range: { startDate: string, endDate: string }) => void;
    displayedStats: SubstitutionStat[];
    onFetch: () => void;
    loading: boolean;
}> = ({ dateRange, onDateRangeChange, displayedStats, onFetch, loading }) => {
  
    return (
      <div className="space-y-4 p-4 bg-white rounded-lg shadow">
        <div className="flex flex-wrap gap-4 items-end no-print">
          <div>
            <label className="block text-sm font-medium text-gray-700">วันที่เริ่มต้น</label>
            <input type="date" value={dateRange.startDate} onChange={e => onDateRangeChange({ ...dateRange, startDate: e.target.value })} className="mt-1 p-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">วันที่สิ้นสุด</label>
            <input type="date" value={dateRange.endDate} onChange={e => onDateRangeChange({ ...dateRange, endDate: e.target.value })} className="mt-1 p-2 border rounded-md" />
          </div>
          <button onClick={onFetch} disabled={loading} className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300">
            <Search size={18} className="mr-2"/> {loading ? 'กำลังโหลด...' : 'แสดงข้อมูล'}
          </button>
        </div>
        {loading ? <p className="text-center p-4">กำลังโหลดข้อมูล...</p> : (
            <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-left font-semibold text-gray-600">ลำดับ</th>
                            <th className="p-3 text-left font-semibold text-gray-600">ชื่อผู้สอน</th>
                            <th className="p-3 text-center font-semibold text-gray-600">จำนวนครั้งที่ไปสอนแทน</th>
                            <th className="p-3 text-center font-semibold text-gray-600">จำนวนครั้งที่ถูกสอนแทน</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedStats.map((stat, index) => (
                            <tr key={stat.id} className="border-t hover:bg-gray-50">
                                <td className="p-3">{index + 1}</td>
                                <td className="p-3">{stat.name}</td>
                                <td className="p-3 text-center">{stat.taughtAsSubstitute}</td>
                                <td className="p-3 text-center">{stat.wasSubstitutedFor}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    );
};


// --- Main Statistics Page ---
const Statistics: React.FC = () => {
    const { schoolInfo, schedule, teachers, subjects, fetchAttendanceStats, attendanceStats, fetchSubstitutionStats, substitutionStats } = useTimetable();
    const [activeTab, setActiveTab] = useState<'load' | 'attendance' | 'substitution'>('load');
    const [selectedSubjectGroup, setSelectedSubjectGroup] = useState('all');
    const [dateRange, setDateRange] = useState({
      startDate: getFirstDayOfMonthThai(),
      endDate: getThaiDateString()
    });
    const [loading, setLoading] = useState(false);
    const [excludedActivities, setExcludedActivities] = useState<string[]>([]);
    const chartRef = useRef<ChartJS<'bar'>>(null);


    const handleFetchStats = useCallback(() => {
        setLoading(true);
        if (activeTab === 'attendance') {
            fetchAttendanceStats(dateRange.startDate, dateRange.endDate).finally(() => setLoading(false));
        } else if (activeTab === 'substitution') {
            fetchSubstitutionStats(dateRange.startDate, dateRange.endDate).finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [activeTab, dateRange, fetchAttendanceStats, fetchSubstitutionStats]);

    useEffect(() => {
        if (activeTab !== 'load') {
            handleFetchStats();
        }
    }, [activeTab, handleFetchStats]);


    // --- Data processing for Teaching Load ---
    const processedLoadStats: TeacherLoadStat[] = useMemo(() => {
        if (!schoolInfo || schedule.length === 0) return [];
        const teacherStatsMap = new Map<string, TeacherLoadStat>();
        const currentSchedule = schedule.filter(e =>
            e.academicYear === schoolInfo.academicYear &&
            e.semester === schoolInfo.currentSemester &&
            e.customActivity?.trim() !== 'พักเที่ยง'
        );
        for (const entry of currentSchedule) {
            if (entry.teacherIds.length === 0 || (!entry.subjectCode && !entry.customActivity)) continue;
            const isCoTaught = entry.teacherIds.length > 1;
            for (const teacherId of entry.teacherIds) {
                const teacher = teachers.find(t => t.id === teacherId);
                if (!teacher) continue;
                if (!teacherStatsMap.has(teacherId)) {
                    teacherStatsMap.set(teacherId, { teacher, totalPeriods: 0, coTeachingPeriods: 0, subjects: new Map() });
                }
                const stats = teacherStatsMap.get(teacherId)!;
                stats.totalPeriods += 1;
                if (isCoTaught) stats.coTeachingPeriods += 1;
                let statDetails: { code: string; name: string };
                let mapKey: string;
                if (entry.subjectCode) {
                    const subject = subjects.find(s => s.code === entry.subjectCode);
                    if (!subject) continue;
                    statDetails = { code: subject.code, name: subject.name };
                    mapKey = subject.code;
                } else {
                    const activityName = entry.customActivity!;
                    statDetails = { code: activityName, name: activityName };
                    mapKey = `activity_${activityName}`;
                }
                if (!stats.subjects.has(mapKey)) {
                    stats.subjects.set(mapKey, { details: statDetails, periods: 0, coTaughtPeriods: 0 });
                }
                const subjectStat = stats.subjects.get(mapKey)!;
                subjectStat.periods += 1;
                if (isCoTaught) subjectStat.coTaughtPeriods += 1;
            }
        }
        return Array.from(teacherStatsMap.values());
    }, [schedule, teachers, subjects, schoolInfo]);

    const displayedLoadStats = useMemo(() => {
        const filtered = selectedSubjectGroup === 'all'
            ? processedLoadStats
            : processedLoadStats.filter(stat => stat.teacher.subjectGroup === selectedSubjectGroup);
        return filtered.sort((a, b) => a.teacher.name.localeCompare(b.teacher.name, 'th'));
    }, [processedLoadStats, selectedSubjectGroup]);

    const displayedAttendanceStats = useMemo(() => 
        [...attendanceStats].sort((a,b) => a.teacherName.localeCompare(b.teacherName, 'th')), 
    [attendanceStats]);

    const allActivities = useMemo(() => {
        const activitySet = new Set<string>();
        attendanceStats.forEach(teacherStat => {
            Object.entries(teacherStat.subjectStats).forEach(([key, stat]) => {
                if (key.startsWith('activity_')) {
                    activitySet.add(stat.subjectName);
                }
            });
        });
        return Array.from(activitySet).sort((a,b) => a.localeCompare(b, 'th'));
    }, [attendanceStats]);
    
    const downloadCsv = (filename: string, headers: string[], data: (string|number)[][]) => {
        const escapeCsvCell = (cell: any): string => {
            const str = String(cell ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
    
        const csvContent = [
            headers.join(','),
            ...data.map(row => row.map(escapeCsvCell).join(','))
        ].join('\r\n');
        
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    const handleExportCsv = () => {
        let headers: string[] = [];
        let data: (string|number)[][] = [];
        const filename = `statistics_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;

        switch (activeTab) {
            case 'load':
                headers = ['ลำดับ', 'ชื่อผู้สอน', 'รหัสวิชา/กิจกรรม', 'ชื่อวิชา/กิจกรรม', 'จำนวนคาบ', 'หมายเหตุ', 'รวมทั้งหมด'];
                displayedLoadStats.forEach((stat, teacherIndex) => {
                    const subjects = [...stat.subjects.values()].sort((a, b) => a.details.name.localeCompare(b.details.name, 'th'));
                    if (subjects.length > 0) {
                        subjects.forEach((subjectStat, subjectIndex) => {
                            const row = [
                                subjectIndex === 0 ? teacherIndex + 1 : '',
                                subjectIndex === 0 ? stat.teacher.name : '',
                                subjectStat.details.code.startsWith('activity_') ? 'กิจกรรม' : subjectStat.details.code,
                                subjectStat.details.name,
                                subjectStat.periods,
                                subjectStat.coTaughtPeriods > 0 ? `สอนร่วม ${subjectStat.coTaughtPeriods} คาบ` : '',
                                subjectIndex === 0 ? stat.totalPeriods : ''
                            ];
                            data.push(row);
                        });
                    } else {
                        const row = [ teacherIndex + 1, stat.teacher.name, '-', 'ไม่มีข้อมูลการสอน', 0, '', stat.totalPeriods ];
                        data.push(row);
                    }
                });
                break;
            case 'attendance':
                headers = ['ลำดับ', 'ชื่อผู้สอน', 'รายวิชา/กิจกรรม', 'คาบที่สอนตามตาราง', 'เข้าสอนเอง', 'มีครูสอนแทน'];
                filteredAttendanceStats.forEach((teacherStat, index) => {
                    // FIX: Use type assertion on Object.values to ensure `subjects` are correctly typed.
                    const subjects = (Object.values(teacherStat.subjectStats) as SubjectStatValue[]).sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'th'));
                    if (subjects.length > 0) {
                        subjects.forEach((subStat, subIndex) => {
                            const row = [
                                subIndex === 0 ? index + 1 : '',
                                subIndex === 0 ? teacherStat.teacherName : '',
                                subStat.subjectName,
                                subStat.totalScheduled,
                                subStat.taughtBySelf,
                                subStat.taughtBySubstitute
                            ];
                            data.push(row);
                        });
                    }
                });
                break;
            case 'substitution':
                headers = ['ลำดับ', 'ชื่อผู้สอน', 'จำนวนครั้งที่ไปสอนแทน', 'จำนวนครั้งที่ถูกสอนแทน'];
                displayedSubstitutionStats.forEach((stat, index) => {
                    const row = [ index + 1, stat.name, stat.taughtAsSubstitute, stat.wasSubstitutedFor ];
                    data.push(row);
                });
                break;
        }

        if (data.length === 0) {
            alert('ไม่มีข้อมูลสำหรับส่งออก');
            return;
        }
        downloadCsv(filename, headers, data);
    };

    const handlePrint = () => {
        const chartImage = activeTab === 'load' && chartRef.current ? chartRef.current.toBase64Image() : null;
        
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const printRootEl = printWindow.document.createElement('div');
            printWindow.document.body.appendChild(printRootEl);
            const root = createRoot(printRootEl);

            const stylesheets = Array.from(document.styleSheets)
                .map(sheet => sheet.href ? `<link rel="stylesheet" href="${sheet.href}">` : '')
                .join('');

            printWindow.document.head.innerHTML = `
                <title>พิมพ์สถิติ</title>
                ${stylesheets}
                <style>
                    @page { size: A4; margin: 0.75in; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #fff; }
                    .no-print { display: none !important; }
                    .printable-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
                    .printable-table th, .printable-table td { border: 1px solid #ccc; padding: 6px; }
                    .printable-table th { background-color: #f2f2f2; }
                    .chart-container img { max-width: 100%; height: auto; }
                </style>
            `;
            
            root.render(
                <React.StrictMode>
                    <PrintableStatistics
                        activeTab={activeTab}
                        schoolInfo={schoolInfo}
                        chartImage={chartImage}
                        loadStats={displayedLoadStats}
                        attendanceStats={filteredAttendanceStats}
                        substitutionStats={displayedSubstitutionStats}
                        dateRange={dateRange}
                    />
                </React.StrictMode>
            );

            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };
    
    const filteredAttendanceStats = useMemo(() => {
        return displayedAttendanceStats
            .map(teacherStat => {
                // FIX: Use type assertion on Object.entries to ensure `stat` is correctly typed.
                const filteredSubjectEntries = (Object.entries(teacherStat.subjectStats) as [string, SubjectStatValue][]).filter(([key, stat]) => {
                    const isActivity = key.startsWith('activity_');
                    if (isActivity) {
                        return !excludedActivities.includes(stat.subjectName);
                    }
                    return true;
                });
                if (filteredSubjectEntries.length === 0) return null;
                const newSubjectStats = Object.fromEntries(filteredSubjectEntries);
                return { ...teacherStat, subjectStats: newSubjectStats };
            }).filter(Boolean) as AttendanceStat[];
    }, [displayedAttendanceStats, excludedActivities]);
    
    const displayedSubstitutionStats = useMemo(() =>
        [...substitutionStats].sort((a, b) => a.name.localeCompare(b.name, 'th')),
    [substitutionStats]);
    const renderTabContent = () => {
        switch (activeTab) {
            case 'attendance': 
                return <AttendanceStats dateRange={dateRange} onDateRangeChange={setDateRange} displayedStats={filteredAttendanceStats} onFetch={handleFetchStats} loading={loading} allActivities={allActivities} excludedActivities={excludedActivities} onExcludedActivitiesChange={setExcludedActivities} />;
            case 'substitution': 
                return <SubstitutionStats dateRange={dateRange} onDateRangeChange={setDateRange} displayedStats={displayedSubstitutionStats} onFetch={handleFetchStats} loading={loading} />;
            case 'load':
            default: 
                return <TeachingLoadStats selectedSubjectGroup={selectedSubjectGroup} onSubjectGroupChange={setSelectedSubjectGroup} displayedStats={displayedLoadStats} chartRef={chartRef} />;
        }
    };

    const TabButton: React.FC<{ tabName: 'load' | 'attendance' | 'substitution', icon: React.ElementType, label: string }> = ({ tabName, icon: Icon, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tabName
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
            <Icon size={18} />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 no-print">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">สถิติ</h1>
                     <p className="text-md text-gray-600 mt-1">
                       รายงานสรุปข้อมูล ปีการศึกษา {schoolInfo?.academicYear} ภาคเรียนที่ {schoolInfo?.currentSemester}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={handleExportCsv} className="flex items-center bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                        <FileDown size={20} className="mr-2" /> ส่งออก CSV
                    </button>
                    <button onClick={handlePrint} className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                        <Printer size={20} className="mr-2" /> พิมพ์ / ส่งออก PDF
                    </button>
                </div>
            </div>

            <div className="border-b border-gray-200 no-print">
                <nav className="flex -mb-px">
                    <TabButton tabName="load" icon={BarChart2} label="ภาระงานสอน" />
                    {schoolInfo?.features.TeacherAttendance && <TabButton tabName="attendance" icon={CheckCheck} label="สถิติการเข้าสอน" />}
                    {schoolInfo?.features.Substitutions && <TabButton tabName="substitution" icon={Repeat} label="สถิติการสอนแทน" />}
                </nav>
            </div>
            
            <div className="print-container">
                {renderTabContent()}
            </div>
        </div>
    );
};
export default Statistics;