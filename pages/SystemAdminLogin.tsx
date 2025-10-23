import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Shield, ArrowLeft } from 'lucide-react';

const SystemAdminLogin: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const auth = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoginLoading(true);

        const result = await auth.systemLogin(username, password);

        setLoginLoading(false);
        if (result.success) {
            navigate('/system-admin/dashboard', { replace: true });
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl">
                <div className="text-center space-y-4">
                    <Shield className="mx-auto h-16 w-16 text-indigo-600" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">ผู้ดูแลระบบสูงสุด</h1>
                        <p className="text-gray-600">เข้าสู่ระบบเพื่อจัดการโรงเรียนและผู้ใช้ทั้งหมด</p>
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
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
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
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full flex justify-center items-center px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium disabled:bg-indigo-300"
                    >
                        <LogIn className="mr-2 h-5 w-5" />
                        {loginLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                    </button>
                </form>

                <div className="pt-4 border-t">
                     <Link
                        to={`/`}
                        className="w-full flex justify-center items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium"
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        กลับไปหน้าเลือกโรงเรียน
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SystemAdminLogin;