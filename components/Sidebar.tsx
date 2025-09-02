
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, Calendar, ChevronDown, ChevronRight, Home, Settings, Users, Building, Clock, Book, Building2 } from 'lucide-react';
import { useTimetable } from '../context/TimetableContext';

const Sidebar: React.FC = () => {
    const { schoolInfo } = useTimetable();
    const [isTimetableViewOpen, setTimetableViewOpen] = useState(false);
    const [isSettingsOpen, setSettingsOpen] = useState(true); // Default open

    const baseLinkStyle = "flex items-center p-3 my-1 rounded-lg text-gray-700 hover:bg-blue-100 transition-colors duration-200";
    const activeLinkStyle = "bg-blue-500 text-white hover:bg-blue-600";
    const subLinkStyle = "flex items-center p-3 pl-10 my-1 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors duration-200";
    const activeSubLinkStyle = "bg-gray-300 text-gray-900";


    return (
        <aside className="no-print w-64 bg-white shadow-md flex-shrink-0 h-full overflow-y-auto relative z-10">
            <div className="p-4 border-b flex items-center space-x-3">
                {schoolInfo.logoUrl && <img src={schoolInfo.logoUrl} alt="School Logo" className="h-10 w-10 rounded-full object-cover" />}
                <h1 className="text-xl font-bold text-blue-600">{schoolInfo.name}</h1>
            </div>
            <nav className="p-4">
                <NavLink to="/dashboard" className={({ isActive }) => `${baseLinkStyle} ${isActive ? activeLinkStyle : ''}`}>
                    <Home className="mr-3 h-5 w-5" />
                    หน้าหลัก
                </NavLink>
                <NavLink to="/arrange" className={({ isActive }) => `${baseLinkStyle} ${isActive ? activeLinkStyle : ''}`}>
                    <Calendar className="mr-3 h-5 w-5" />
                    จัดตารางสอน
                </NavLink>

                <button onClick={() => setTimetableViewOpen(!isTimetableViewOpen)} className={`${baseLinkStyle} w-full text-left`}>
                    <BookOpen className="mr-3 h-5 w-5" />
                    ตารางเรียน/สอน
                    {isTimetableViewOpen ? <ChevronDown className="ml-auto h-5 w-5" /> : <ChevronRight className="ml-auto h-5 w-5" />}
                </button>
                {isTimetableViewOpen && (
                    <div className="ml-4">
                        <NavLink to="/view/class" className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}>ตารางเรียน</NavLink>
                        <NavLink to="/view/teacher" className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}>ตารางสอน</NavLink>
                        <NavLink to="/view/location" className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}><Building className="mr-2 h-4 w-4"/>ตารางการใช้สถานที่</NavLink>
                    </div>
                )}
                
                <button onClick={() => setSettingsOpen(!isSettingsOpen)} className={`${baseLinkStyle} w-full text-left`}>
                    <Settings className="mr-3 h-5 w-5" />
                    ตั้งค่าข้อมูล
                    {isSettingsOpen ? <ChevronDown className="ml-auto h-5 w-5" /> : <ChevronRight className="ml-auto h-s w-5" />}
                </button>
                {isSettingsOpen && (
                    <div className="ml-4">
                        <NavLink to="/settings/general" className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}><Building2 className="mr-2 h-4 w-4"/>ตั้งค่าทั่วไป</NavLink>
                        <NavLink to="/settings/teachers" className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}><Users className="mr-2 h-4 w-4"/>ครู</NavLink>
                        <NavLink to="/settings/classGroups" className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}><Users className="mr-2 h-4 w-4"/>กลุ่มเรียน</NavLink>
                        <NavLink to="/settings/subjects" className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}><Book className="mr-2 h-4 w-4"/>รายวิชา</NavLink>
                        <NavLink to="/settings/locations" className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}><Building className="mr-2 h-4 w-4"/>สถานที่</NavLink>
                        <NavLink to="/settings/timeSlots" className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}><Clock className="mr-2 h-4 w-4"/>คาบเรียน</NavLink>
                    </div>
                )}
            </nav>
        </aside>
    );
}

export default Sidebar;
