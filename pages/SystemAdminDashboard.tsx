import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { SchoolInfo, User } from '../types';
import Modal from '../components/Modal';
import { Building, Users, ToggleRight, LogOut, PlusCircle, Edit, Trash2, Eye, Menu, X } from 'lucide-react';

const API_BASE_URL = 'https://time.anuwat.in.th';

const KNOWN_FEATURES: { [key: string]: string } = {
    'AIChatbot': 'AI Chatbot',
    'Substitutions': 'จัดสอนแทน (Substitutions)',
    'TeacherAttendance': 'เช็คครูเข้าสอน (Teacher Attendance)'
};

const SystemAdminDashboard: React.FC = () => {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'schools' | 'users' | 'features'>('schools');
    
    const [schools, setSchools] = useState<SchoolInfo[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [selectedSchool, setSelectedSchool] = useState<SchoolInfo | null>(null);
    const [schoolFeatures, setSchoolFeatures] = useState<{ [key: string]: boolean }>({});

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    
    // State management for the school add/edit modal
    const [modalSchoolData, setModalSchoolData] = useState<Partial<SchoolInfo>>({});
    const [isEditMode, setIsEditMode] = useState(false);

    const [currentUser, setCurrentUser] = useState<Partial<User> & { password?: string } | null>(null);

    const [isAddingFeature, setIsAddingFeature] = useState(false);
    const [newFeatureName, setNewFeatureName] = useState('');

    const apiFetch = useCallback(async (endpoint: string, options: RequestInit = {}) => {
        const headers: HeadersInit = { 'Content-Type': 'application/json', ...options.headers };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const response = await fetch(`${API_BASE_URL}/api/system${endpoint}`, { ...options, headers });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'API request failed');
        }
        return response.status === 204 ? null : response.json();
    }, [token]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [schoolsData, usersData] = await Promise.all([
                apiFetch('/schools'),
                apiFetch('/users')
            ]);
            setSchools(schoolsData);
            setAllUsers(usersData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (selectedSchool) {
            setIsAddingFeature(false);
            setNewFeatureName('');
            const fetchFeatures = async () => {
                try {
                    const features = await apiFetch(`/schools/${selectedSchool.id_school}/features`);
                    setSchoolFeatures(features);
                } catch (err) {
                    console.error("Failed to fetch features", err);
                }
            };
            fetchFeatures();
        }
    }, [selectedSchool, apiFetch]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const openSchoolModal = (school: SchoolInfo | null) => {
        if (school) { // Editing existing school
            setIsEditMode(true);
            setModalSchoolData(school);
        } else { // Adding new school
            setIsEditMode(false);
            // FIX: Convert calculated `academicYear` to a string to match the `SchoolInfo` type.
            setModalSchoolData({ id_school: '', name: '', currentSemester: 1, academicYear: String(new Date().getFullYear() + 543) });
        }
        setIsSchoolModalOpen(true);
    };
    
    const handleSaveSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        const endpoint = isEditMode ? `/schools/${modalSchoolData.id_school}` : '/schools';
        const method = isEditMode ? 'PUT' : 'POST';
        try {
            await apiFetch(endpoint, { method, body: JSON.stringify(modalSchoolData) });
            setIsSchoolModalOpen(false);
            fetchData();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        const isEdit = !!currentUser.id;
        const endpoint = isEdit ? `/users/${currentUser.id}` : '/users';
        const method = isEdit ? 'PUT' : 'POST';
        
        const payload = { ...currentUser };
        if (payload.password === '') delete payload.password;

        try {
            await apiFetch(endpoint, { method, body: JSON.stringify(payload) });
            setIsUserModalOpen(false);
            fetchData();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await apiFetch(`/users/${userId}`, { method: 'DELETE' });
                fetchData();
            } catch (err: any) {
                 alert(`Error: ${err.message}`);
            }
        }
    };

    const handleFeatureToggle = async (featureName: string, isEnabled: boolean) => {
        if (!selectedSchool) return;
        const updatedFeatures = { ...schoolFeatures, [featureName]: isEnabled };
        setSchoolFeatures(updatedFeatures);
        try {
            await apiFetch(`/schools/${selectedSchool.id_school}/features`, {
                method: 'PUT',
                body: JSON.stringify(updatedFeatures)
            });
        } catch (err: any) {
            alert(`Error updating features: ${err.message}`);
            setSchoolFeatures(prev => ({...prev, [featureName]: !isEnabled}));
        }
    };

    const handleAddNewFeature = async () => {
        const trimmedName = newFeatureName.trim();
        if (!trimmedName) {
            alert("Feature name cannot be empty.");
            return;
        }
        if (schoolFeatures.hasOwnProperty(trimmedName)) {
            alert("This feature already exists.");
            return;
        }
        await handleFeatureToggle(trimmedName, true);
        setNewFeatureName('');
        setIsAddingFeature(false);
    };
    
    const renderContent = () => {
        if (loading) return <div className="text-center p-8">Loading data...</div>;
        if (error) return <p className="text-red-500 p-4">Error: {error}</p>;

        switch (activeTab) {
            case 'schools':
                return (
                    <div>
                        <button onClick={() => openSchoolModal(null)} className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 mb-4 transition-colors">
                            <PlusCircle size={20} className="mr-2" /> เพิ่มโรงเรียน
                        </button>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-max">
                                <thead><tr className="bg-gray-100 text-left">
                                    <th className="p-3 font-semibold">ID</th><th className="p-3 font-semibold">Name</th><th className="p-3 font-semibold">Actions</th>
                                </tr></thead>
                                <tbody>
                                    {schools.map(s => (
                                    <tr key={s.id_school} className="border-t hover:bg-gray-50">
                                        <td className="p-3">{s.id_school}</td><td className="p-3">{s.name}</td>
                                        <td className="p-3 flex items-center gap-3">
                                            <button onClick={() => openSchoolModal(s)} className="text-blue-600 hover:text-blue-800" title="Edit School"><Edit size={18} /></button>
                                            <Link to={`/${s.id_school}/dashboard`} target="_blank" className="text-green-600 hover:text-green-800" title="View School Dashboard"><Eye size={18} /></Link>
                                        </td>
                                    </tr>))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'users':
                const sortedUsers = [...allUsers].sort((a, b) => {
                    if (a.id_school === null && b.id_school !== null) return -1;
                    if (a.id_school !== null && b.id_school === null) return 1;

                    if (a.id_school === b.id_school) { // Both are system or from the same school
                        return a.username.localeCompare(b.username);
                    }
                    
                    // Both are from different schools (guaranteed non-null)
                    return a.id_school!.localeCompare(b.id_school!);
                });

                return (
                    <div>
                        <button onClick={() => { setCurrentUser({ role: 'admin' }); setIsUserModalOpen(true); }} className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 mb-4 transition-colors">
                            <PlusCircle size={20} className="mr-2" /> เพิ่มผู้ใช้
                        </button>
                         <div className="overflow-x-auto">
                            <table className="w-full min-w-max">
                               <thead><tr className="bg-gray-100 text-left">
                                    <th className="p-3 font-semibold">Username</th><th className="p-3 font-semibold">School ID</th><th className="p-3 font-semibold">Role</th><th className="p-3 font-semibold">Actions</th>
                                </tr></thead>
                                <tbody>
                                    {sortedUsers.map(u => (
                                    <tr key={u.id} className="border-t hover:bg-gray-50">
                                        <td className="p-3">{u.username}</td><td className="p-3">{u.id_school || 'N/A (System)'}</td><td className="p-3">{u.role}</td>
                                        <td className="p-3 flex items-center gap-3">
                                            <button onClick={() => { setCurrentUser(u); setIsUserModalOpen(true); }} className="text-blue-600 hover:text-blue-800" title="Edit User"><Edit size={18} /></button>
                                            <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-800" title="Delete User"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'features':
                const otherFeatures = Object.keys(schoolFeatures).filter(key => !KNOWN_FEATURES[key]);
                return (
                    <div>
                        <label className="block text-lg font-medium text-gray-700 mb-2">เลือกโรงเรียน:</label>
                        <select onChange={e => setSelectedSchool(schools.find(s => s.id_school === e.target.value) || null)} className="w-full md:w-1/2 p-2 border rounded-md mb-6 shadow-sm">
                            <option value="">-- กรุณาเลือก --</option>
                            {schools.map(s => <option key={s.id_school} value={s.id_school}>{s.name}</option>)}
                        </select>
                        {selectedSchool && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold">Features for {selectedSchool.name}</h3>
                            {Object.entries(KNOWN_FEATURES).map(([key, name]) => (
                                <div key={key} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                    <span className="font-medium text-gray-700">{name}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                      <input type="checkbox" checked={schoolFeatures[key] ?? false} onChange={e => handleFeatureToggle(key, e.target.checked)} className="sr-only peer" />
                                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            ))}
                            {otherFeatures.map(key => (
                                <div key={key} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 bg-gray-50">
                                    <span className="font-medium text-gray-600 italic">{key} (Custom)</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                      <input type="checkbox" checked={schoolFeatures[key] ?? false} onChange={e => handleFeatureToggle(key, e.target.checked)} className="sr-only peer" />
                                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            ))}

                            <div className="pt-4 mt-4 border-t">
                                {!isAddingFeature ? (
                                    <button onClick={() => setIsAddingFeature(true)} className="flex items-center bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                                        <PlusCircle size={20} className="mr-2"/> เพิ่มฟีเจอร์ใหม่
                                    </button>
                                ) : (
                                    <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
                                        <label className="block font-medium">ชื่อฟีเจอร์ใหม่ (ภาษาอังกฤษเท่านั้น)</label>
                                        <input 
                                            value={newFeatureName}
                                            onChange={e => setNewFeatureName(e.target.value)}
                                            placeholder="e.g., NewAwesomeFeature"
                                            className="w-full p-2 border rounded-md"
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={handleAddNewFeature} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">บันทึก</button>
                                            <button onClick={() => setIsAddingFeature(false)} className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">ยกเลิก</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        )}
                    </div>
                );
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow-md p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-800">System Administration</h1>
                <div className="flex items-center gap-4">
                    <span className="text-gray-700">Welcome, <span className="font-semibold">{user?.username}</span></span>
                    <button onClick={handleLogout} className="flex items-center text-red-600 hover:text-red-800 font-medium p-2 rounded-md hover:bg-red-50 transition-colors">
                        <LogOut size={20} className="mr-1" /> Logout
                    </button>
                </div>
            </header>
            <main className="p-4 sm:p-6 md:p-8">
                <div className="bg-white rounded-lg shadow-lg">
                    <div className="border-b border-gray-200">
                        <nav className="flex flex-wrap -mb-px px-4 sm:px-6">
                            <button onClick={() => setActiveTab('schools')} className={`py-3 px-4 flex items-center gap-2 font-medium ${activeTab === 'schools' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><Building size={18}/> Schools</button>
                            <button onClick={() => setActiveTab('users')} className={`py-3 px-4 flex items-center gap-2 font-medium ${activeTab === 'users' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><Users size={18}/> Users</button>
                            <button onClick={() => setActiveTab('features')} className={`py-3 px-4 flex items-center gap-2 font-medium ${activeTab === 'features' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><ToggleRight size={18}/> Features</button>
                        </nav>
                    </div>
                    <div className="p-4 sm:p-6">
                        {renderContent()}
                    </div>
                </div>
            </main>

            <Modal isOpen={isSchoolModalOpen} onClose={() => setIsSchoolModalOpen(false)} title={isEditMode ? 'Edit School' : 'Add School'}>
                <form onSubmit={handleSaveSchool} className="space-y-4">
                    <div>
                        <label>School ID</label>
                        <input type="text" required maxLength={20} value={modalSchoolData.id_school || ''} onChange={e => setModalSchoolData(p => ({...p, id_school: e.target.value}))} disabled={isEditMode} className="w-full p-2 border rounded disabled:bg-gray-100" />
                    </div>
                    <div><label>Name</label><input required value={modalSchoolData.name || ''} onChange={e => setModalSchoolData(p => ({...p, name: e.target.value}))} className="w-full p-2 border rounded" /></div>
                    <div><label>Address</label><input value={modalSchoolData.address || ''} onChange={e => setModalSchoolData(p => ({...p, address: e.target.value}))} className="w-full p-2 border rounded" /></div>
                    <div><label>Phone</label><input value={modalSchoolData.phone || ''} onChange={e => setModalSchoolData(p => ({...p, phone: e.target.value}))} className="w-full p-2 border rounded" /></div>
                    <div><label>Logo URL</label><input value={modalSchoolData.logoUrl || ''} onChange={e => setModalSchoolData(p => ({...p, logoUrl: e.target.value}))} className="w-full p-2 border rounded" /></div>
                    <div><label>Academic Year</label><input required value={modalSchoolData.academicYear || ''} onChange={e => setModalSchoolData(p => ({...p, academicYear: e.target.value}))} className="w-full p-2 border rounded" /></div>
                    <div><label>Current Semester</label><input required type="number" value={modalSchoolData.currentSemester || ''} onChange={e => setModalSchoolData(p => ({...p, currentSemester: Number(e.target.value)}))} className="w-full p-2 border rounded" /></div>
                    <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={() => setIsSchoolModalOpen(false)} className="bg-gray-200 px-4 py-2 rounded">Cancel</button><button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Save</button></div>
                </form>
            </Modal>
            
            <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={currentUser?.id ? 'Edit User' : 'Add User'}>
                <form onSubmit={handleSaveUser} className="space-y-4">
                    <div><label>Username</label><input required value={currentUser?.username || ''} onChange={e => setCurrentUser(p => ({...p, username: e.target.value}))} disabled={!!currentUser?.id} className="w-full p-2 border rounded disabled:bg-gray-100" /></div>
                    <div><label>Password</label><input type="password" placeholder={currentUser?.id ? 'Leave blank to keep unchanged' : ''} required={!currentUser?.id} value={currentUser?.password || ''} onChange={e => setCurrentUser(p => ({...p, password: e.target.value}))} className="w-full p-2 border rounded" /></div>
                    <div><label>Role</label><select required value={currentUser?.role || 'admin'} onChange={e => setCurrentUser(p => ({...p, role: e.target.value as 'admin'|'super'}))} className="w-full p-2 border rounded"><option value="admin">Admin</option><option value="super">Super</option></select></div>
                    <div><label>School ID</label><select value={currentUser?.id_school || ''} onChange={e => setCurrentUser(p => ({...p, id_school: e.target.value || null}))} className="w-full p-2 border rounded"><option value="">N/A (System Admin)</option>{schools.map(s => <option key={s.id_school} value={s.id_school}>{s.name} ({s.id_school})</option>)}</select></div>
                    <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={() => setIsUserModalOpen(false)} className="bg-gray-200 px-4 py-2 rounded">Cancel</button><button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Save</button></div>
                </form>
            </Modal>
        </div>
    );
};

export default SystemAdminDashboard;