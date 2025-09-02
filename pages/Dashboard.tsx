
import React from 'react';
import { Calendar, Settings, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
    return (
        <div className="animate-fade-in-up">
            <header className="mb-8">
                <h1 className="text-4xl font-bold text-gray-800">ยินดีต้อนรับสู่ Smart Timetable</h1>
                <p className="text-lg text-gray-600 mt-2">ระบบจัดการตารางเรียน/ตารางสอนอัจฉริยะ</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link to="/arrange" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1">
                    <div className="flex items-center text-blue-500 mb-4">
                        <Calendar size={32} />
                        <h2 className="text-2xl font-semibold ml-4">จัดตารางสอน</h2>
                    </div>
                    <p className="text-gray-600">สร้างและแก้ไขตารางสอนสำหรับกลุ่มเรียนต่างๆ ได้อย่างง่ายดาย</p>
                </Link>

                <Link to="/view/class" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1">
                    <div className="flex items-center text-green-500 mb-4">
                        <BookOpen size={32} />
                        <h2 className="text-2xl font-semibold ml-4">ดูตารางสอน</h2>
                    </div>
                    <p className="text-gray-600">แสดงผลตารางสอนรายกลุ่มเรียนและรายครูในรูปแบบที่ชัดเจน</p>
                </Link>

                <Link to="/settings" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1">
                    <div className="flex items-center text-purple-500 mb-4">
                        <Settings size={32} />
                        <h2 className="text-2xl font-semibold ml-4">ตั้งค่าข้อมูลพื้นฐาน</h2>
                    </div>
                    <p className="text-gray-600">จัดการข้อมูลครู, รายวิชา, สถานที่ และข้อมูลสำคัญอื่นๆ</p>
                </Link>
            </div>
        </div>
    );
};

export default Dashboard;
