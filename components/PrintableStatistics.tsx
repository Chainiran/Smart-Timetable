import React from 'react';
import { SchoolInfo } from '../types';

// Define types for stats as they are passed from the parent
interface SubjectLoadStat {
    details: { code: string; name: string };
    periods: number;
    coTaughtPeriods: number;
}
interface TeacherLoadStat {
    teacher: { name: string };
    totalPeriods: number;
    subjects: Map<string, SubjectLoadStat>;
}
interface AttendanceStat {
    teacherId: string;
    teacherName: string;
    subjectStats: {
        [subjectCodeOrActivity: string]: {
            subjectName: string;
            totalScheduled: number;
            taughtBySelf: number;
            taughtBySubstitute: number;
        }
    }
}
interface SubstitutionStat {
    id: string;
    name: string;
    taughtAsSubstitute: number;
    wasSubstitutedFor: number;
}


// FIX: Define a type for a single subject statistic entry to resolve 'unknown' type errors.
type SubjectStatValue = AttendanceStat['subjectStats'][string];

interface PrintableStatisticsProps {
    activeTab: 'load' | 'attendance' | 'substitution';
    schoolInfo: SchoolInfo | null;
    chartImage: string | null;
    loadStats: TeacherLoadStat[];
    attendanceStats: AttendanceStat[];
    substitutionStats: SubstitutionStat[];
    dateRange: { startDate: string; endDate: string };
}

const PrintableStatistics: React.FC<PrintableStatisticsProps> = ({
    activeTab,
    schoolInfo,
    chartImage,
    loadStats,
    attendanceStats,
    substitutionStats,
    dateRange,
}) => {

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getReportTitle = () => {
        switch (activeTab) {
            case 'load':
                return `สรุปภาระงานสอน ปีการศึกษา ${schoolInfo?.academicYear} ภาคเรียนที่ ${schoolInfo?.currentSemester}`;
            case 'attendance':
                return `สรุปสถิติการเข้าสอน วันที่ ${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`;
            case 'substitution':
                return `สรุปสถิติการสอนแทน วันที่ ${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`;
            default:
                return 'รายงานสถิติ';
        }
    };
    
    const renderLoadStats = () => (
        <div>
            {chartImage && (
                <div className="chart-container" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <img src={chartImage} alt="Chart of teaching load" style={{ maxWidth: '100%', height: 'auto' }} />
                </div>
            )}
            <h3 className="text-xl font-semibold text-gray-700 mb-4" style={{ fontSize: '14pt' }}>ตารางสรุปภาระงานสอน</h3>
            <table className="printable-table">
                <thead>
                    <tr>
                        <th>ลำดับ</th>
                        <th>ชื่อผู้สอน</th>
                        <th>รหัสวิชา/กิจกรรม</th>
                        <th>ชื่อวิชา/กิจกรรม</th>
                        <th>จำนวนคาบ</th>
                        <th>หมายเหตุ</th>
                        <th>รวมทั้งหมด</th>
                    </tr>
                </thead>
                <tbody>
                    {loadStats.map((stat, teacherIndex) => {
                        const subjects = [...stat.subjects.values()].sort((a, b) => a.details.name.localeCompare(b.details.name, 'th'));
                        const rowSpan = subjects.length || 1;
                        return (
                            <React.Fragment key={stat.teacher.name}>
                                {subjects.length > 0 ? subjects.map((subjectStat, subjectIndex) => (
                                    <tr key={subjectStat.details.code}>
                                        {subjectIndex === 0 && <td rowSpan={rowSpan} style={{ textAlign: 'center', verticalAlign: 'top' }}>{teacherIndex + 1}</td>}
                                        {subjectIndex === 0 && <td rowSpan={rowSpan} style={{ verticalAlign: 'top' }}>{stat.teacher.name}</td>}
                                        <td>{subjectStat.details.code.startsWith('activity_') ? 'กิจกรรม' : subjectStat.details.code}</td>
                                        <td>{subjectStat.details.name}</td>
                                        <td style={{ textAlign: 'center' }}>{subjectStat.periods}</td>
                                        <td>{subjectStat.coTaughtPeriods > 0 ? `สอนร่วม ${subjectStat.coTaughtPeriods} คาบ` : ''}</td>
                                        {subjectIndex === 0 && <td rowSpan={rowSpan} style={{ textAlign: 'center', verticalAlign: 'top', fontWeight: 'bold' }}>{stat.totalPeriods}</td>}
                                    </tr>
                                )) : (
                                    <tr>
                                        <td style={{ textAlign: 'center' }}>{teacherIndex + 1}</td>
                                        <td>{stat.teacher.name}</td>
                                        <td colSpan={4} style={{ color: '#666' }}>- ไม่มีข้อมูลการสอน -</td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{stat.totalPeriods}</td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    const renderAttendanceStats = () => (
        <div>
            <table className="printable-table">
                <thead>
                    <tr>
                        <th>ลำดับ</th>
                        <th>ชื่อผู้สอน</th>
                        <th>รายวิชา/กิจกรรม</th>
                        <th>คาบที่สอนตามตาราง</th>
                        <th>เข้าสอนเอง</th>
                        <th>มีครูสอนแทน</th>
                    </tr>
                </thead>
                <tbody>
                    {attendanceStats.map((teacherStat, index) => {
                        // FIX: Use type assertion to correctly type the values from teacherStat.subjectStats.
                        const subjects = (Object.values(teacherStat.subjectStats) as SubjectStatValue[]).sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'th'));
                        const rowSpan = subjects.length;
                        if (rowSpan === 0) return null;

                        return (
                            <React.Fragment key={teacherStat.teacherId}>
                                {subjects.map((subStat, subIndex) => (
                                    <tr key={subIndex}>
                                        {subIndex === 0 && <td rowSpan={rowSpan} style={{ textAlign: 'center', verticalAlign: 'top' }}>{index + 1}</td>}
                                        {subIndex === 0 && <td rowSpan={rowSpan} style={{ verticalAlign: 'top' }}>{teacherStat.teacherName}</td>}
                                        <td>{subStat.subjectName}</td>
                                        <td style={{ textAlign: 'center' }}>{subStat.totalScheduled}</td>
                                        <td style={{ textAlign: 'center' }}>{subStat.taughtBySelf}</td>
                                        <td style={{ textAlign: 'center' }}>{subStat.taughtBySubstitute}</td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    const renderSubstitutionStats = () => (
        <div>
            <table className="printable-table">
                <thead>
                    <tr>
                        <th>ลำดับ</th>
                        <th>ชื่อผู้สอน</th>
                        <th>จำนวนครั้งที่ไปสอนแทน</th>
                        <th>จำนวนครั้งที่ถูกสอนแทน</th>
                    </tr>
                </thead>
                <tbody>
                    {substitutionStats.map((stat, index) => (
                        <tr key={stat.id}>
                            <td style={{ textAlign: 'center' }}>{index + 1}</td>
                            <td>{stat.name}</td>
                            <td style={{ textAlign: 'center' }}>{stat.taughtAsSubstitute}</td>
                            <td style={{ textAlign: 'center' }}>{stat.wasSubstitutedFor}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
            <header style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #ccc', paddingBottom: '1rem' }}>
                <h1 style={{ fontSize: '18pt', fontWeight: 'bold', margin: 0 }}>{schoolInfo?.name || 'Smart Timetable'}</h1>
                <h2 style={{ fontSize: '14pt', margin: '0.25rem 0 0', color: '#333' }}>{getReportTitle()}</h2>
            </header>
            <main>
                {activeTab === 'load' && renderLoadStats()}
                {activeTab === 'attendance' && renderAttendanceStats()}
                {activeTab === 'substitution' && renderSubstitutionStats()}
            </main>
        </div>
    );
};

export default PrintableStatistics;