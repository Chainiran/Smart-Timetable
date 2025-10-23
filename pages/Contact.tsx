import React from 'react';
import { Mail, Facebook, UserCircle, FileText } from 'lucide-react';

const Contact: React.FC = () => {
    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 md:p-8 bg-white rounded-lg shadow-md animate-fade-in-up">
            <header className="text-center border-b pb-6 mb-8">
                <UserCircle className="mx-auto h-16 w-16 text-blue-500 mb-4" />
                <h1 className="text-4xl font-extrabold text-gray-800">ติดต่อผู้พัฒนา</h1>
                <p className="mt-2 text-lg text-gray-600">
                    สำหรับแจ้งปัญหา, สอบถามการใช้งาน, หรือให้ข้อเสนอแนะ
                </p>
            </header>

            <div className="space-y-6">
                <div className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="bg-green-100 p-3 rounded-full flex-shrink-0">
                        <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800">คำร้องขอใช้โปรแกรมจัดตารางสอน</h3>
                        <a 
                            href="https://forms.gle/MA1qg4nE7FZKJeJ17" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-lg text-blue-600 hover:underline break-all"
                        >
                            https://forms.gle/MA1qg4nE7FZKJeJ17
                        </a>
                    </div>
                </div>

                <div className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="bg-red-100 p-3 rounded-full flex-shrink-0">
                        <Mail className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800">อีเมล</h3>
                        <a 
                            href="mailto:anuwat@nwp.ac.th" 
                            className="text-lg text-blue-600 hover:underline break-all"
                        >
                            anuwat@nwp.ac.th
                        </a>
                    </div>
                </div>

                <div className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="bg-blue-100 p-3 rounded-full flex-shrink-0">
                        <Facebook className="h-6 w-6 text-blue-700" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800">Facebook</h3>
                        <a 
                            href="https://www.facebook.com/Chainiran01" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-lg text-blue-600 hover:underline break-all"
                        >
                            https://www.facebook.com/Chainiran01
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;