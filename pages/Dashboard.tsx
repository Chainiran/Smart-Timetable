import React from 'react';
import { BookOpen, MapPin, Users, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTimetable } from '../context/TimetableContext';


const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const { schoolInfo, announcements } = useTimetable();
    
    const activeAnnouncements = announcements.filter(a => a.isActive)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return (
        <div className="animate-fade-in-up">
            <header className="mb-8 text-center">
                 {schoolInfo?.logoUrl && (
                    <img 
                        src={schoolInfo.logoUrl} 
                        alt="School Logo" 
                        className="mx-auto h-24 w-24 rounded-full object-cover mb-4" 
                    />
                )}
                {schoolInfo?.name && (
                     <h1 className="text-4xl font-bold text-gray-800">{schoolInfo.name}</h1>
                )}
                <p className="text-lg text-gray-600 mt-2">ระบบจัดการตารางเรียน/ตารางสอนอัจฉริยะ</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                <Link to="../view/class" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1">
                    <div className="flex items-center text-blue-500 mb-4">
                        <Users size={32} />
                        <h2 className="text-2xl font-semibold ml-4">ดูตารางเรียน</h2>
                    </div>
                    <p className="text-gray-600">ค้นหาและแสดงตารางเรียนตามกลุ่มเรียนและระดับชั้น</p>
                </Link>

                <Link to="../view/teacher" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1">
                    <div className="flex items-center text-green-500 mb-4">
                        <BookOpen size={32} />
                        <h2 className="text-2xl font-semibold ml-4">ดูตารางสอน</h2>
                    </div>
                    <p className="text-gray-600">ค้นหาและแสดงตารางสอนของครูแต่ละท่าน</p>
                </Link>

                <Link to="../view/location" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1">
                    <div className="flex items-center text-purple-500 mb-4">
                        <MapPin size={32} />
                        <h2 className="text-2xl font-semibold ml-4">ดูตารางการใช้สถานที่</h2>
                    </div>
                    <p className="text-gray-600">ตรวจสอบการใช้งานห้องเรียนและสถานที่ต่างๆ</p>
                </Link>
                
                {!user && (
                    <Link to="../login" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1 border-2 border-orange-400">
                        <div className="flex items-center text-orange-500 mb-4">
                            <LogIn size={32} />
                            <h2 className="text-2xl font-semibold ml-4">เข้าสู่ระบบผู้ดูแล</h2>
                        </div>
                        <p className="text-gray-600">สำหรับเจ้าหน้าที่วิชาการและผู้ดูแลระบบเพื่อจัดการข้อมูล</p>
                    </Link>
                )}
            </div>

            {activeAnnouncements.length > 0 && (
                <div className="mt-8 space-y-6">
                    {activeAnnouncements.map(announcement => (
                        <div key={announcement.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                            <h2 className="text-2xl font-bold text-gray-800 mb-3">{announcement.title}</h2>
                            <div 
                                className="prose max-w-none prose-lg text-gray-700" 
                                dangerouslySetInnerHTML={{ __html: announcement.content }} 
                            />
                            <p className="text-right text-xs text-gray-400 mt-4">
                               อัปเดตล่าสุด: {new Date(announcement.updatedAt).toLocaleString('th-TH')}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;