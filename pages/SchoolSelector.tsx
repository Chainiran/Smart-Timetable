import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { School } from '../types';
import { Building2, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'https://time.anuwat.in.th';

const SchoolSelector: React.FC = () => {
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    const isSystemAdmin = user?.role === 'super' && !user.id_school;

    useEffect(() => {
        const fetchSchools = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE_URL}/api/schools`);
                if (!response.ok) {
                    throw new Error('Failed to fetch schools');
                }
                const data = await response.json();
                setSchools(data);
            } catch (err: any) {
                setError(err.message || 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchSchools();
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <div className="text-center mb-10">
                <h1 className="text-5xl font-extrabold text-gray-800">Smart Timetable</h1>
                <p className="text-xl text-gray-600 mt-2">ระบบจัดการตารางเรียน/ตารางสอนอัจฉริยะ</p>
            </div>

            <div className="w-full max-w-4xl">
                {isSystemAdmin && (
                    <div className="text-center mb-8">
                        <Link 
                            to="/system-admin/dashboard"
                            className="inline-block bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-indigo-700 transition-transform transform hover:-translate-y-1"
                        >
                            ไปหน้าแดชบอร์ดผู้ดูแลระบบสูงสุด
                        </Link>
                    </div>
                )}
                <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">กรุณาเลือกโรงเรียน</h2>
                {loading && <p className="text-center text-gray-500">กำลังโหลดข้อมูลโรงเรียน...</p>}
                {error && <p className="text-center text-red-500">เกิดข้อผิดพลาด: {error}</p>}
                
                {!loading && !error && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {schools.map(school => (
                            <Link 
                                key={school.id_school} 
                                to={`/${school.id_school}/dashboard`}
                                className="group block bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                            >
                                <div className="flex flex-col items-center text-center">
                                    {school.logoUrl ? (
                                        <img 
                                            src={school.logoUrl} 
                                            alt={`${school.name} Logo`}
                                            className="h-24 w-24 rounded-full object-cover mb-4 border-2 border-gray-200 group-hover:border-blue-500 transition-colors"
                                        />
                                    ) : (
                                        <div className="h-24 w-24 rounded-full bg-gray-200 mb-4 flex items-center justify-center border-2 border-gray-300 group-hover:border-blue-500 transition-colors">
                                            <Building2 className="w-12 h-12 text-gray-400" />
                                        </div>
                                    )}
                                    <h3 className="text-lg font-semibold text-gray-800">{school.name}</h3>
                                    <p className="text-sm text-gray-500 mt-1">({school.id_school})</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
            
            {!isSystemAdmin && (
                <div className="mt-12 text-center">
                    <Link to="/system-admin/login" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
                        <KeyRound size={18} />
                        <span>สำหรับผู้ดูแลระบบสูงสุด</span>
                    </Link>
                </div>
            )}
        </div>
    );
};

export default SchoolSelector;