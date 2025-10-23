import React, { useState } from 'react';
import { useTimetable } from '../context/TimetableContext';
import { useAuth } from '../context/AuthContext';

type DataType =
  | 'schoolInfo'
  | 'teachers'
  | 'classGroups'
  | 'subjects'
  | 'locations'
  | 'timeSlots'
  | 'schedule'
  | 'users'
  | 'publishingStatus'
  | 'currentUser';

const ApiTest: React.FC = () => {
  const timetable = useTimetable();
  const { user: currentUser } = useAuth();
  const [selectedData, setSelectedData] = useState<DataType>('schoolInfo');
  const API_URL = 'https://time.anuwat.in.th';

  const dataMap = {
    schoolInfo: timetable.schoolInfo,
    teachers: timetable.teachers,
    classGroups: timetable.classGroups,
    subjects: timetable.subjects,
    locations: timetable.locations,
    timeSlots: timetable.timeSlots,
    schedule: timetable.schedule,
    users: timetable.users,
    publishingStatus: timetable.publishingStatus,
    currentUser: currentUser,
  };

  const dataLabels: Record<DataType, string> = {
    schoolInfo: 'ข้อมูลโรงเรียน (School Info)',
    teachers: 'ข้อมูลครู (Teachers)',
    classGroups: 'กลุ่มเรียน (Class Groups)',
    subjects: 'รายวิชา (Subjects)',
    locations: 'สถานที่ (Locations)',
    timeSlots: 'คาบเรียน (Time Slots)',
    schedule: 'ตารางสอน (Schedule)',
    users: 'ผู้ใช้งาน (Users)',
    publishingStatus: 'สถานะการเผยแพร่ (Publishing Status)',
    currentUser: 'ข้อมูลผู้ใช้ปัจจุบัน (Auth Context)',
  };

  const selectedJsonData = JSON.stringify(dataMap[selectedData], null, 2);

  const baseButtonClass = "px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors";
  const activeButtonClass = "bg-blue-600 text-white";
  const inactiveButtonClass = "bg-white text-gray-700 hover:bg-gray-100";

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">ทดสอบ API</h1>
      <p className="text-gray-600 mb-2">
        หน้านี้แสดงข้อมูลดิบ (JSON) ที่ Frontend ได้รับมาจาก API Server
        เพื่อใช้ในการตรวจสอบความถูกต้องของข้อมูล
      </p>
      <p className="text-sm text-gray-500 mb-6">
        เชื่อมต่อกับ: <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded">{API_URL}</code>
      </p>

      <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
        {Object.keys(dataLabels).map((key) => (
          <button
            key={key}
            onClick={() => setSelectedData(key as DataType)}
            className={`${baseButtonClass} ${selectedData === key ? activeButtonClass : inactiveButtonClass}`}
          >
            {dataLabels[key as DataType]}
          </button>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">
          แสดงข้อมูล: {dataLabels[selectedData]}
        </h2>
        {timetable.loading ? (
           <div className="text-center p-8">
             <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
           </div>
        ) : (
            <div className="bg-gray-900 text-white p-4 rounded-lg max-h-[60vh] overflow-auto">
                <pre>
                    <code>
                        {selectedJsonData}
                    </code>
                </pre>
            </div>
        )}
      </div>
    </div>
  );
};

export default ApiTest;