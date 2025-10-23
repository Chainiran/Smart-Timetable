import React, { useState } from 'react';
// FIX: Import 'Link' from 'react-router-dom' to resolve 'Cannot find name' errors.
import { HashRouter, Routes, Route, Navigate, useParams, useLocation, Link } from 'react-router-dom';
import { TimetableProvider, useTimetable } from './context/TimetableContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import MasterData from './pages/MasterData';
import TimetableArrangement from './pages/TimetableArrangement';
import SubstituteArrangement from './pages/SubstituteArrangement';
import TimetableView from './pages/TimetableView';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import PublishingSettings from './pages/PublishingSettings';
import ApiTest from './pages/ApiTest';
import Statistics from './pages/Statistics';
import { Menu } from 'lucide-react';
import SchoolSelector from './pages/SchoolSelector';
import Help from './pages/Help';
import SystemAdminLogin from './pages/SystemAdminLogin';
import SystemAdminDashboard from './pages/SystemAdminDashboard';
import AttendanceCheck from './pages/AttendanceCheck';
import Contact from './pages/Contact';
import Announcements from './pages/Announcements';


// This new component will wrap all pages that are specific to a school
const SchoolLayout: React.FC = () => {
    const { id_school } = useParams<{ id_school: string }>();
    
    if (!id_school) {
        // This can happen momentarily. A loading state or redirect could be useful.
        return <Navigate to="/" replace />;
    }
    
    // The TimetableProvider is placed here so it has access to `id_school`
    // and can re-fetch data when the school changes.
    return (
        <TimetableProvider schoolId={id_school}>
            <AppContent />
        </TimetableProvider>
    );
};


const AppContent: React.FC = () => {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [isDesktopNavCollapsed, setIsDesktopNavCollapsed] = useState(false);
    const { schoolInfo, loading, error, schoolId } = useTimetable();
    const { user } = useAuth();
    const location = useLocation();

    // If data is loading for a new school, show a loading indicator
    // to prevent showing stale data from the previous school.
    if (loading && !schoolInfo) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-gray-100">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-lg text-gray-600">กำลังโหลดข้อมูลโรงเรียน...</p>
                </div>
            </div>
        );
    }
    
    // Explicitly handle errors during data fetch
    if (error) {
        return (
             <div className="flex items-center justify-center h-screen w-screen bg-gray-100 text-center">
                <div>
                    <h1 className="text-3xl font-bold text-red-600">เกิดข้อผิดพลาด</h1>
                    <p className="mt-2 text-gray-700">ไม่สามารถโหลดข้อมูลสำหรับโรงเรียนนี้ได้</p>
                    <p className="mt-1 text-sm text-gray-500 bg-red-50 p-2 rounded">{error}</p>
                    <Link to="/" className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                        กลับไปหน้าเลือกโรงเรียน
                    </Link>
                </div>
            </div>
        )
    }
    
    // Security Check: If a user is logged in, ensure they are accessing their own school's pages.
    // This prevents a logged-in user from one school viewing public pages of another school.
    // System admins (user.id_school is null) are exempt from this check.
    if (user && user.id_school && user.id_school !== schoolId) {
        // Redirect to their own school's dashboard to prevent cross-school data access.
        return <Navigate to={`/${user.id_school}/dashboard`} replace />;
    }


    // If after loading, there's no school info, it's likely an invalid school ID.
    if (!loading && !schoolInfo) {
         return (
             <div className="flex items-center justify-center h-screen w-screen bg-gray-100 text-center">
                <div>
                    <h1 className="text-3xl font-bold text-red-600">ไม่พบโรงเรียน</h1>
                    <p className="mt-2 text-gray-700">ไม่พบข้อมูลสำหรับรหัสโรงเรียนนี้</p>
                    <Link to="/" className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                        กลับไปหน้าเลือกโรงเรียน
                    </Link>
                </div>
            </div>
         )
    }
    
    // Hide sidebar and header for the login page of a specific school
    const isLoginPage = location.pathname.endsWith('/login');

    if (isLoginPage) {
        return (
            <main className="flex-1">
                 <Routes>
                    <Route path="login" element={<Login />} />
                 </Routes>
            </main>
        )
    }

    return (
        <div id="app-container" className="flex h-screen bg-gray-50">
            <Sidebar
                isMobileNavOpen={isMobileNavOpen}
                setIsMobileNavOpen={setIsMobileNavOpen}
                isDesktopNavCollapsed={isDesktopNavCollapsed}
                setIsDesktopNavCollapsed={setIsDesktopNavCollapsed}
            />
            <div id="app-content-wrapper" className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 border-b bg-white sticky top-0 z-20 no-print">
                    <h1 className="text-lg font-bold text-blue-600 truncate">{schoolInfo?.name || 'Menu'}</h1>
                    <button
                        onClick={() => setIsMobileNavOpen(true)}
                        className="p-2 text-gray-600 hover:text-gray-900"
                        aria-label="Open navigation"
                    >
                        <Menu size={24} />
                    </button>
                </header>

                <main id="main-content" className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
                    <Routes>
                        {/* Public Routes */}
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="view/class" element={<TimetableView viewType="class" />} />
                        <Route path="view/teacher" element={<TimetableView viewType="teacher" />} />
                        <Route path="view/location" element={<TimetableView viewType="location" />} />
                        <Route path="view/substitutions" element={<TimetableView viewType="substitution" />} />
                        <Route path="/" element={<Navigate to="dashboard" replace />} />

                        {/* Protected Routes */}
                        <Route path="arrange" element={<ProtectedRoute roles={['admin', 'super']}><TimetableArrangement /></ProtectedRoute>} />
                        <Route path="substitute" element={<ProtectedRoute roles={['admin', 'super']}><SubstituteArrangement /></ProtectedRoute>} />
                        <Route path="attendance" element={<ProtectedRoute roles={['admin', 'super']}><AttendanceCheck /></ProtectedRoute>} />
                        <Route path="announcements" element={<ProtectedRoute roles={['admin', 'super']}><Announcements /></ProtectedRoute>} />
                        <Route path="statistics" element={<ProtectedRoute roles={['admin', 'super']}><Statistics /></ProtectedRoute>} />
                        <Route path="help" element={<Help />} />
                        <Route path="contact" element={<Contact />} />
                        
                        {/* Super Admin Only Routes */}
                        <Route path="settings/general" element={<ProtectedRoute roles={['super']}><MasterData /></ProtectedRoute>} />
                        <Route path="settings/publishing" element={<ProtectedRoute roles={['super']}><PublishingSettings /></ProtectedRoute>} />
                        <Route path="settings/users" element={<ProtectedRoute roles={['super']}><MasterData /></ProtectedRoute>} />
                        <Route path="settings/api-test" element={<ProtectedRoute roles={['super']} requireSystemAdminForSchoolPage={true}><ApiTest /></ProtectedRoute>} />
                        <Route path="settings/:dataType" element={<ProtectedRoute roles={['super']}><MasterData /></ProtectedRoute>} />
                        <Route path="settings" element={<ProtectedRoute roles={['super']}><Navigate to="settings/general" replace /></ProtectedRoute>} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};


const App: React.FC = () => {
  return (
    <AuthProvider>
        <HashRouter>
            <Routes>
                <Route path="/" element={<SchoolSelector />} />
                <Route path="/system-admin/login" element={<SystemAdminLogin />} />
                <Route path="/system-admin/dashboard" element={
                    <ProtectedRoute roles={['super']} systemAdminOnly={true}>
                        <SystemAdminDashboard />
                    </ProtectedRoute>
                } />
                <Route path="/:id_school/*" element={<SchoolLayout />} />
            </Routes>
        </HashRouter>
    </AuthProvider>
  );
};

export default App;