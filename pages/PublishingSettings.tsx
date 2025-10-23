
import React, { useEffect, useMemo, useState } from 'react';
import { useTimetable } from '../context/TimetableContext';
import { PublishingStatus } from '../types';
import { Eye, EyeOff } from 'lucide-react';
import { SEMESTER_OPTIONS } from '../constants';

const PublishingSettings: React.FC = () => {
    const { publishingStatus, fetchPublishingStatus, loading, updatePublishingStatus } = useTimetable();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchPublishingStatus();
    }, []);

    const sortedStatus = useMemo(() => {
        return [...publishingStatus].sort((a, b) => {
            if (a.academicYear !== b.academicYear) {
                return b.academicYear.localeCompare(a.academicYear, undefined, { numeric: true });
            }
            return b.semester - a.semester;
        });
    }, [publishingStatus]);

    const totalPages = Math.ceil(sortedStatus.length / itemsPerPage);
    const paginatedStatus = sortedStatus.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleToggle = (status: PublishingStatus) => {
        const newStatus = { ...status, isPublished: !status.isPublished };
        updatePublishingStatus(newStatus);
    };

    if (loading && publishingStatus.length === 0) {
        return <div>Loading publishing settings...</div>;
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">ตั้งค่าการเผยแพร่ตารางสอน</h1>
            <p className="text-gray-600 mb-6">
                กำหนดว่าผู้ใช้ทั่วไป (ที่ไม่ได้ล็อกอิน) สามารถมองเห็นตารางสอนของปีการศึกษาและภาคเรียนใดได้บ้าง
            </p>

            <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-left font-semibold text-gray-600">ปีการศึกษา</th>
                            <th className="p-3 text-left font-semibold text-gray-600">ภาคเรียน</th>
                            <th className="p-3 text-center font-semibold text-gray-600">สถานะ</th>
                            <th className="p-3 text-center font-semibold text-gray-600">การดำเนินการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedStatus.map((status) => (
                            <tr key={status.id} className="border-t hover:bg-gray-50">
                                <td className="p-3 font-medium">{status.academicYear}</td>
                                <td className="p-3">
                                    {SEMESTER_OPTIONS.find(s => s.value === status.semester)?.label || `ภาคเรียนที่ ${status.semester}`}
                                </td>
                                <td className="p-3 text-center">
                                    {status.isPublished ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                            <Eye size={16} className="mr-1" /> เผยแพร่
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                            <EyeOff size={16} className="mr-1" /> ไม่เผยแพร่
                                        </span>
                                    )}
                                </td>
                                <td className="p-3 text-center">
                                    <button
                                        onClick={() => handleToggle(status)}
                                        className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium ${
                                            status.isPublished
                                                ? 'bg-red-500 hover:bg-red-600'
                                                : 'bg-green-500 hover:bg-green-600'
                                        }`}
                                    >
                                        {status.isPublished ? 'ซ่อน' : 'เผยแพร่'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {sortedStatus.length === 0 && !loading && (
                    <p className="text-center p-4 text-gray-500">ไม่พบข้อมูลการตั้งค่าการเผยแพร่</p>
                )}
            </div>
             {totalPages > 1 && (
                <div className="flex justify-between items-center py-3 px-3 bg-white border-t rounded-b-lg">
                    <div className="text-sm text-gray-700">
                        แสดง <span className="font-medium">{paginatedStatus.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}</span>
                        {' - '}
                        <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedStatus.length)}</span>
                        {' จาก '}
                        <span className="font-medium">{sortedStatus.length}</span> รายการ
                    </div>
                    <div className="inline-flex -space-x-px rounded-md shadow-sm">
                        <button
                            onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-l-md px-3 py-2 text-sm font-medium text-gray-600 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ก่อนหน้า
                        </button>
                        <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                            หน้า {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                            disabled={currentPage >= totalPages}
                            className="relative inline-flex items-center rounded-r-md px-3 py-2 text-sm font-medium text-gray-600 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ถัดไป
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublishingSettings;
