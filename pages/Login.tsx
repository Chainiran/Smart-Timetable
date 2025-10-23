
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { LogIn, ArrowLeftCircle } from 'lucide-react';
import { useTimetable } from '../context/TimetableContext';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const auth = useAuth();
    const { schoolInfo, loading: schoolInfoLoading } = useTimetable();
    const navigate = useNavigate();
    const { id_school } = useParams<{ id_school: string }>();

    const from = `/${id_school}/dashboard`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id_school) {
            setError("ไม่พบรหัสโรงเรียน ไม่สามารถเข้าสู่ระบบได้");
            return;
        }
        setError('');
        setLoginLoading(true);

        const result = await auth.login(username, password, id_school);

        setLoginLoading(false);
        if (result.success) {
            navigate(from, { replace: true });
        } else {
            setError(result.message);
        }
    };
    
    if (schoolInfoLoading) {
        return (
             <div className="flex items-center justify-center h-screen w-screen bg-gray-100">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin mx-auto"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl">
                <div className="text-center space-y-4">
                     {schoolInfo?.logoUrl && (
                        <img 
                            src={schoolInfo.logoUrl} 
                            alt="School Logo" 
                            className="mx-auto h-24 w-24 rounded-full object-cover" 
                        />
                    )}
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">เข้าสู่ระบบ</h1>
                        <p className="text-gray-600">สำหรับจัดการตารางสอน {schoolInfo?.name}</p>
                    </div>
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                        <span className="font-medium">ผิดพลาด!</span> {error}
                    </div>
                )}

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label
                            htmlFor="username"
                            className="block mb-2 text-sm font-medium text-gray-700"
                        >
                            ชื่อผู้ใช้
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                            required
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="password"
                            className="block mb-2 text-sm font-medium text-gray-700"
                        >
                            รหัสผ่าน
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full flex justify-center items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium disabled:bg-blue-300"
                    >
                        <LogIn className="mr-2 h-5 w-5" />
                        {loginLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                    </button>
                </form>

                <div className="pt-4 border-t">
                     <Link
                        to={`/${id_school}/dashboard`}
                        className="w-full flex justify-center items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium"
                    >
                        <ArrowLeftCircle className="mr-2 h-5 w-5" />
                        กลับไปหน้าแดชบอร์ดของโรงเรียน
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
