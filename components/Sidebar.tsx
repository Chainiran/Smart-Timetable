import React, { useState, useEffect } from 'react';
// FIX: Import 'useParams' from 'react-router-dom' to resolve the 'Cannot find name' error.
import { NavLink, useNavigate, useLocation, useParams } from 'react-router-dom';
import { BookOpen, Calendar, ChevronDown, ChevronRight, Home, Settings, Users, Building, Clock, Book, Building2, LogOut, Shield, Globe, TestTube2, X, BarChart3, ChevronsLeft, ChevronsRight, ClipboardEdit, ListChecks, HelpCircle, ArrowLeft, CheckSquare, Send, Megaphone } from 'lucide-react';
import { useTimetable } from '../context/TimetableContext';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
    isMobileNavOpen: boolean;
    setIsMobileNavOpen: (isOpen: boolean) => void;
    isDesktopNavCollapsed: boolean;
    setIsDesktopNavCollapsed: (isCollapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileNavOpen, setIsMobileNavOpen, isDesktopNavCollapsed, setIsDesktopNavCollapsed }) => {
    const { schoolInfo } = useTimetable();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { id_school } = useParams<{ id_school: string }>();

    const isSystemAdminViewingSchool = user && user.role === 'super' && !user.id_school;

    const [isTimetableViewOpen, setTimetableViewOpen] = useState(true);
    const [isSettingsOpen, setSettingsOpen] = useState(true);

    useEffect(() => {
        // Close mobile nav on route change
        if (isMobileNavOpen) {
            setIsMobileNavOpen(false);
        }
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate(`/${id_school}/login`);
    };

    if (location.pathname.endsWith('/login')) {
        return null;
    }
    
    const baseLinkStyle = "flex items-center p-3 my-1 rounded-lg text-gray-700 hover:bg-blue-100 transition-colors duration-200";
    const activeLinkStyle = "bg-blue-500 text-white hover:bg-blue-600";
    const subLinkStyle = "flex items-center p-3 pl-10 my-1 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors duration-200";
    const activeSubLinkStyle = "bg-gray-300 text-gray-900";

    const sidebarContent = (isMobile: boolean) => {
        const isCollapsed = !isMobile && isDesktopNavCollapsed;

        return (
            <div className="flex flex-col h-full">
                <div className="p-4 border-b flex items-center justify-between">
                     <div className={`flex items-center space-x-3 overflow-hidden transition-all duration-300 ${isCollapsed ? 'justify-center w-full' : ''}`}>
                        {schoolInfo?.logoUrl && <img src={schoolInfo.logoUrl} alt="School Logo" className="h-10 w-10 rounded-full object-cover flex-shrink-0" />}
                        {!isCollapsed && <h1 className="text-xl font-bold text-blue-600 truncate">{schoolInfo?.name || 'Smart Timetable'}</h1>}
                     </div>
                     {isMobile && (
                        <button onClick={() => setIsMobileNavOpen(false)} className="text-gray-500 hover:text-gray-800">
                            <X size={24} />
                        </button>
                     )}
                </div>
                <nav className={`p-4 flex-grow overflow-y-auto ${isCollapsed ? 'px-2' : ''}`}>
                    {isSystemAdminViewingSchool && (
                        <>
                            <NavLink to="/system-admin/dashboard" className={`${baseLinkStyle} bg-indigo-100 text-indigo-800 hover:bg-indigo-200 ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? 'กลับไปหน้าดูแลระบบ' : ''}>
                                <ArrowLeft className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                                {!isCollapsed && <span className="truncate">กลับไปหน้าดูแลระบบ</span>}
                            </NavLink>
                            <NavLink to="/" className={`${baseLinkStyle} bg-gray-100 text-gray-800 hover:bg-gray-200 ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? 'เปลี่ยนโรงเรียน' : ''}>
                                <Building className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                                {!isCollapsed && <span className="truncate">เปลี่ยนโรงเรียน</span>}
                            </NavLink>
                            <NavLink to={`/${id_school}/settings/api-test`} className={({ isActive }) => `${baseLinkStyle} ${isActive ? activeLinkStyle : ''} bg-yellow-50 text-yellow-800 hover:bg-yellow-100 ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? 'ทดสอบ API' : ''}>
                                <TestTube2 className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                                {!isCollapsed && <span className="truncate">ทดสอบ API</span>}
                            </NavLink>
                        </>
                    )}
                    
                    <NavLink to={`/${id_school}/dashboard`} className={({ isActive }) => `${baseLinkStyle} ${isActive ? activeLinkStyle : ''} ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? 'หน้าหลัก' : ''}>
                        <Home className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                        {!isCollapsed && <span className="truncate">หน้าหลัก</span>}
                    </NavLink>
                    
                    <NavLink to={`/${id_school}/help`} className={({ isActive }) => `${baseLinkStyle} ${isActive ? activeLinkStyle : ''} ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? 'คู่มือการใช้งาน' : ''}>
                        <HelpCircle className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                        {!isCollapsed && <span className="truncate">คู่มือการใช้งาน</span>}
                    </NavLink>
                    
                    <NavLink to={`/${id_school}/contact`} className={({ isActive }) => `${baseLinkStyle} ${isActive ? activeLinkStyle : ''} ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? 'ติดต่อผู้พัฒนา' : ''}>
                        <Send className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                        {!isCollapsed && <span className="truncate">ติดต่อผู้พัฒนา</span>}
                    </NavLink>

                    {user && (user.role === 'admin' || user.role === 'super') && (
                        <>
                            <NavLink to={`/${id_school}/arrange`} className={({ isActive }) => `${baseLinkStyle} ${isActive ? activeLinkStyle : ''} ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? 'จัดตารางสอน' : ''}>
                                <Calendar className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                                {!isCollapsed && <span className="truncate">จัดตารางสอน</span>}
                            </NavLink>
                            <NavLink to={`/${id_school}/announcements`} className={({ isActive }) => `${baseLinkStyle} ${isActive ? activeLinkStyle : ''} ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? 'ประชาสัมพันธ์' : ''}>
                                <Megaphone className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                                {!isCollapsed && <span className="truncate">ประชาสัมพันธ์</span>}
                            </NavLink>
                        </>
                    )}
                     {user && (user.role === 'admin' || user.role === 'super') && schoolInfo?.features?.Substitutions && (
                         <NavLink to={`/${id_school}/substitute`} className={({ isActive }) => `${baseLinkStyle} ${isActive ? activeLinkStyle : ''} ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? 'จัดสอนแทน' : ''}>
                            <ClipboardEdit className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                            {!isCollapsed && <span className="truncate">จัดสอนแทน</span>}
                        </NavLink>
                    )}
                    {user && (user.role === 'admin' || user.role === 'super') && schoolInfo?.features?.TeacherAttendance && (
                         <NavLink to={`/${id_school}/attendance`} className={({ isActive }) => `${baseLinkStyle} ${isActive ? activeLinkStyle : ''} ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? 'เช็คครูเข้าสอน' : ''}>
                            <CheckSquare className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                            {!isCollapsed && <span className="truncate">เช็คครูเข้าสอน</span>}
                        </NavLink>
                    )}

                    <button onClick={() => !isCollapsed && setTimetableViewOpen(!isTimetableViewOpen)} className={`${baseLinkStyle} w-full text-left ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? 'ตารางเรียน/สอน' : ''}>
                        <BookOpen className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                        {!isCollapsed && <span className="truncate">ตารางเรียน/สอน</span>}
                        {!isCollapsed && (isTimetableViewOpen ? <ChevronDown className="ml-auto h-5 w-5" /> : <ChevronRight className="ml-auto h-5 w-5" />)}
                    </button>
                    {isTimetableViewOpen && !isCollapsed && (
                        <div className="ml-4">
                            <NavLink to={`/${id_school}/view/class`} className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}>ตารางเรียน</NavLink>
                            <NavLink to={`/${id_school}/view/teacher`} className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}>ตารางสอน</NavLink>
                            <NavLink to={`/${id_school}/view/location`} className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}><Building className="mr-2 h-4 w-4"/>ตารางการใช้สถานที่</NavLink>
                            {schoolInfo?.features?.Substitutions && <NavLink to={`/${id_school}/view/substitutions`} className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}><ListChecks className="mr-2 h-4 w-4"/>รายการสอนแทน</NavLink>}
                            {user && (user.role === 'admin' || user.role === 'super') && (
                                <NavLink to={`/${id_school}/statistics`} className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}><BarChart3 className="mr-2 h-4 w-4"/>สถิติ</NavLink>
                            )}
                        </div>
                    )}
                    
                    {user && user.role === 'super' && (
                        <>
                            <button onClick={() => !isCollapsed && setSettingsOpen(!isSettingsOpen)} className={`${baseLinkStyle} w-full text-left ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? 'ตั้งค่าข้อมูล' : ''}>
                                <Settings className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                                {!isCollapsed && <span className="truncate">ตั้งค่าข้อมูล</span>}
                                {!isCollapsed && (isSettingsOpen ? <ChevronDown className="ml-auto h-5 w-5" /> : <ChevronRight className="ml-auto h-5 w-5" />)}
                            </button>
                            {isSettingsOpen && !isCollapsed && (
                                <div className="ml-4">
                                    <NavLink to={`/${id_school}/settings/general`} className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}><Building2 className="mr-2 h-4 w-4"/>ตั้งค่าทั่วไป</NavLink>
                                    <NavLink to={`/${id_school}/settings/users`} className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}><Users className="mr-2 h-4 w-4"/>จัดการผู้ใช้</NavLink>
                                    <NavLink to={`/${id_school}/settings/teachers`} className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}><Users className="mr-2 h-4 w-4"/>ครู</NavLink>
                                    <NavLink to={`/${id_school}/settings/classGroups`} className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}><Users className="mr-2 h-4 w-4"/>กลุ่มเรียน</NavLink>
                                    <NavLink to={`/${id_school}/settings/subjects`} className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}><Book className="mr-2 h-4 w-4"/>รายวิชา</NavLink>
                                    <NavLink to={`/${id_school}/settings/locations`} className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}><Building className="mr-2 h-4 w-4"/>สถานที่</NavLink>
                                    <NavLink to={`/${id_school}/settings/timeSlots`} className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}><Clock className="mr-2 h-4 w-4"/>คาบเรียน</NavLink>
                                    <NavLink to={`/${id_school}/settings/publishing`} className={({ isActive }) => `${subLinkStyle} ${isActive ? activeSubLinkStyle : ''}`}><Globe className="mr-2 h-4 w-4"/>ตั้งค่าการเผยแพร่</NavLink>
                                </div>
                            )}
                        </>
                    )}
                </nav>
                <div className="p-4 border-t mt-auto">
                    <div className="hidden md:block mb-4">
                        <button 
                            onClick={() => setIsDesktopNavCollapsed(!isDesktopNavCollapsed)} 
                            className="w-full flex items-center justify-center p-2 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
                            aria-label={isDesktopNavCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {isDesktopNavCollapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
                        </button>
                    </div>
                    {user ? (
                        <div className="space-y-3">
                            {!isCollapsed && (
                                <div className='text-center text-sm text-gray-600'>
                                    <p>ผู้ใช้: <span className='font-semibold'>{user.username}</span></p>
                                    <p>สิทธิ์: <span className='font-semibold'>{user.role}{!user.id_school && ' (System)'}</span></p>
                                </div>
                            )}
                             <button onClick={handleLogout} className={`w-full flex items-center p-2 rounded-lg text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-200 ${isCollapsed ? 'justify-center' : 'justify-center'}`} title={isCollapsed ? 'ออกจากระบบ' : ''}>
                                <LogOut className={`${isCollapsed ? '' : 'mr-2'} h-5 w-5`} />
                                {!isCollapsed && 'ออกจากระบบ'}
                            </button>
                        </div>
                    ) : (
                        <NavLink to={`/${id_school}/login`} className={`w-full flex items-center p-2 rounded-lg text-green-700 bg-green-100 hover:bg-green-200 transition-colors duration-200 ${isCollapsed ? 'justify-center' : 'justify-center'}`} title={isCollapsed ? 'สำหรับผู้ดูแล' : ''}>
                            <Shield className={`${isCollapsed ? '' : 'mr-2'} h-5 w-5`} />
                            {!isCollapsed && 'สำหรับผู้ดูแล'}
                        </NavLink>
                    )}
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Mobile Sidebar Overlay */}
            <div 
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity duration-300 ${isMobileNavOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMobileNavOpen(false)}
            ></div>
            
            {/* Mobile Sidebar */}
            <aside 
              className={`fixed top-0 left-0 h-full z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:hidden no-print ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
              {sidebarContent(true)}
            </aside>
            
            {/* Desktop Sidebar */}
            <aside className={`no-print bg-white shadow-md flex-shrink-0 h-full relative z-10 hidden md:flex flex-col transition-all duration-300 ${isDesktopNavCollapsed ? 'w-20' : 'w-64'}`}>
              {sidebarContent(false)}
            </aside>
        </>
    );
};

export default Sidebar;