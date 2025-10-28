import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useTimetable } from '../context/TimetableContext';
import Modal from '../components/Modal';
import { DATA_CONFIG, SEMESTER_OPTIONS, TEMPLATE_EXAMPLES, SUBJECT_GROUP_OPTIONS } from '../constants';
import { PlusCircle, Edit, Trash2, Save, Trash, Plus, Upload, Download, Archive, ArchiveRestore, Search, ArrowUp, ArrowDown, XCircle, FileDown } from 'lucide-react';
import { SchoolInfo, MasterDataType, TimeSlot } from '../types';

const GeneralSettingsPanel: React.FC = () => {
    const { schoolInfo, updateSchoolInfo, fetchPublishingStatus } = useTimetable();
    const [localInfo, setLocalInfo] = useState<SchoolInfo | null>(schoolInfo);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (schoolInfo) {
            setLocalInfo(schoolInfo);
        }
    }, [schoolInfo]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLocalInfo(prev => prev ? ({ ...prev, [name]: name === 'currentSemester' ? Number(value) : value }) : null);
    };

    const handleSave = async () => {
        if (localInfo) {
            const result = await updateSchoolInfo(localInfo);
            if (result.success) {
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000); // Hide after 3 seconds
                await fetchPublishingStatus(); // Refetch to get the potentially new status
            } else {
                alert(`เกิดข้อผิดพลาด: ${result.message}`);
            }
        }
    };
    
    if (!localInfo) {
        return <div>Loading school info...</div>;
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow relative">
             {showSuccess && (
                <div className="fixed top-5 right-5 z-50 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg animate-bounce">
                    บันทึกข้อมูลสำเร็จ!
                </div>
            )}
            <h1 className="text-3xl font-bold text-gray-800 mb-6">ตั้งค่าทั่วไป</h1>
            <div className="space-y-4">
                 <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">ชื่อโรงเรียน</label>
                    <input type="text" id="name" name="name" value={localInfo.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                 <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">ที่อยู่</label>
                    <input type="text" id="address" name="address" value={localInfo.address} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                 <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">เบอร์โทร</label>
                    <input type="text" id="phone" name="phone" value={localInfo.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                <div>
                    <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700">ลิงก์โลโก้</label>
                    <input type="text" id="logoUrl" name="logoUrl" value={localInfo.logoUrl} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700">ปีการศึกษา</label>
                        <input type="text" id="academicYear" name="academicYear" value={localInfo.academicYear} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                    <div>
                        <label htmlFor="currentSemester" className="block text-sm font-medium text-gray-700">ภาคเรียนปัจจุบัน</label>
                        <select id="currentSemester" name="currentSemester" value={localInfo.currentSemester} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                            {SEMESTER_OPTIONS.filter(opt => opt.value !== 0).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                </div>
                 <div className="flex justify-end pt-4">
                    <button onClick={handleSave} className="flex items-center justify-center bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                        <Save size={20} className="mr-2"/> บันทึกข้อมูล
                    </button>
                </div>
            </div>
        </div>
    );
};

const CSVImportModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    dataType: string;
    csvData: any[];
}> = ({ isOpen, onClose, dataType, csvData}) => {
    const timetable = useTimetable();
    const config = DATA_CONFIG[dataType];

    const handleImport = async () => {
        let resultPromise;
        switch (dataType) {
            case 'teachers': resultPromise = timetable.addTeachersInBulk(csvData); break;
            case 'subjects': resultPromise = timetable.addSubjectsInBulk(csvData); break;
            case 'classGroups': resultPromise = timetable.addClassGroupsInBulk(csvData); break;
            case 'locations': resultPromise = timetable.addLocationsInBulk(csvData); break;
            case 'timeSlots': resultPromise = timetable.addTimeSlotsInBulk(csvData); break;
        }
        if (resultPromise) {
            const result = await resultPromise;
            alert(result.message || (result.success ? 'Import successful' : 'Import failed'));
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`ยืนยันการนำเข้าข้อมูล: ${config.title}`}>
            <p className="mb-4">พบข้อมูลทั้งหมด {csvData.length} รายการที่พร้อมนำเข้า โปรดตรวจสอบความถูกต้อง</p>
            <div className="max-h-60 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 sticky top-0">
                        <tr>{config.csvHeaders.map((h: string) => <th key={h} className="p-2">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                        {csvData.slice(0, 10).map((row, i) => ( // Preview first 10 rows
                            <tr key={i} className="border-t">
                                {config.csvHeaders.map((h: string) => <td key={h} className="p-2 truncate">{String(row[h] ?? '')}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {csvData.length > 10 && <p className="text-center p-2 text-gray-500">...และอีก {csvData.length - 10} รายการ</p>}
            </div>
             <div className="flex items-center justify-end pt-6">
                <button type="button" onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 mr-2">ยกเลิก</button>
                <button type="button" onClick={handleImport} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">ยืนยันการนำเข้า</button>
            </div>
        </Modal>
    )
}

const CsvInstructions: React.FC<{ dataType: string }> = ({ dataType }) => {
    const config = DATA_CONFIG[dataType];
    if (!config || !config.csvHeaders) {
        return null;
    }

    let instructions: React.ReactNode = null;

    switch (dataType) {
        case 'teachers':
            instructions = (
                <ul className="list-disc list-inside space-y-1">
                    <li><b>prefix:</b> คำนำหน้าชื่อ (เช่น นาย, นาง, นางสาว)</li>
                    <li><b>name:</b> ชื่อ-สกุลเต็ม</li>
                    <li><b>subjectGroup:</b> กลุ่มสาระการเรียนรู้ (ต้องเป็นค่าใดค่าหนึ่งต่อไปนี้): <code>{SUBJECT_GROUP_OPTIONS.join(', ')}</code></li>
                </ul>
            );
            break;
        case 'subjects':
            instructions = (
                 <ul className="list-disc list-inside space-y-1">
                    <li><b>code:</b> รหัสวิชา (ต้องไม่ซ้ำกันในโรงเรียน)</li>
                    <li><b>name:</b> ชื่อวิชา</li>
                    <li><b>subjectGroup:</b> กลุ่มสาระฯ (ต้องเป็นค่าใดค่าหนึ่งต่อไปนี้): <code>{SUBJECT_GROUP_OPTIONS.join(', ')}</code></li>
                    <li><b>semester:</b> ภาคเรียน ระบุเป็นตัวเลข: <code>0</code>=ทุกภาคเรียน, <code>1</code>=ภาคเรียนที่ 1, <code>2</code>=ภาคเรียนที่ 2, <code>3</code>=ภาคฤดูร้อน</li>
                    <li><b>gradeLevel:</b> ระดับชั้น สามารถระบุได้หลายรูปแบบ:
                        <ul className="list-['-_'] list-inside ml-6 mt-1">
                            <li>ระดับชั้นเดียว: <code>อ.1</code>, <code>อ.2</code>, <code>อ.3</code>, <code>ป.1</code> - <code>ป.6</code>, <code>ม.1</code> - <code>ม.6</code></li>
                            <li>ช่วงชั้น: <code>อนุบาล(อ.1-3)</code>, <code>ประถม(ป.1-6)</code>, <code>ม.ต้น(ม.1-3)</code>, <code>ม.ปลาย(ม.4-6)</code></li>
                        </ul>
                    </li>
                    <li><b>credits:</b> จำนวนหน่วยกิต (ตัวเลขทศนิยมได้ เช่น 1.5)</li>
                    <li><b>periodsPerWeek:</b> จำนวนคาบที่ต้องเรียนต่อสัปดาห์ (ตัวเลข)</li>
                </ul>
            );
            break;
        case 'classGroups':
             instructions = (
                <ul className="list-disc list-inside space-y-1">
                    <li><b>name:</b> ชื่อกลุ่มเรียน (เช่น 'ม.1/1', 'ห้องเรียนพิเศษวิทย์-คณิต ม.1')</li>
                    <li><b>gradeLevel:</b> ระดับชั้นของกลุ่มเรียน (เช่น <code>ป.1</code>, <code>ม.4</code>)</li>
                    <li><b>parentName:</b> ชื่อของกลุ่มเรียนหลัก (สำหรับกลุ่มย่อย) หากเป็นกลุ่มเรียนหลักให้ปล่อยว่างไว้</li>
                </ul>
            );
            break;
        case 'locations':
            instructions = (
                <ul className="list-disc list-inside space-y-1">
                    <li><b>name:</b> ชื่อสถานที่ (เช่น 'ห้อง 111', 'ห้องสมุด', 'สนามฟุตบอล')</li>
                    <li><b>responsibleTeacherName:</b> ชื่อ-สกุลเต็มของครูผู้รับผิดชอบ (ต้องตรงกับชื่อครูที่มีในระบบ) หากไม่มีให้ปล่อยว่างไว้</li>
                </ul>
            );
            break;
        case 'timeSlots':
            instructions = (
                <ul className="list-disc list-inside space-y-1">
                    <li><b>id:</b> รหัสคาบเรียน (ต้องไม่ซ้ำกัน เช่น C01, C02)</li>
                    <li><b>period:</b> ลำดับคาบที่ (ตัวเลข เช่น 1, 2, 3)</li>
                    <li><b>startTime:</b> เวลาเริ่มต้น (รูปแบบ HH:mm เช่น 08:30)</li>
                    <li><b>endTime:</b> เวลาสิ้นสุด (รูปแบบ HH:mm เช่น 09:20)</li>
                </ul>
            );
            break;
    }

    if (!instructions) return null;

    return (
        <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded-r-lg">
            <h3 className="font-bold mb-2">คำแนะนำการใช้เทมเพลต CSV สำหรับ "{config.title.replace('จัดการข้อมูล', '').trim()}"</h3>
            <p className="mb-2">ไฟล์ CSV ต้องมีหัวคอลัมน์ต่อไปนี้ตามลำดับ: <code>{config.csvHeaders.join(', ')}</code></p>
            {instructions}
        </div>
    );
};

const DataManagementView: React.FC<{ dataType: MasterDataType | 'users' }> = ({ dataType }) => {
    const { fetchUsers, fetchArchivedData, updateItemStatus, addTimeSlotsInBulk, ...timetable } = useTimetable();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentItem, setCurrentItem] = useState<any | null>(null);
    const [bulkData, setBulkData] = useState<any[]>([{}]);
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [view, setView] = useState<'active' | 'archived'>('active');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'ascending' | 'descending' }>({ key: null, direction: 'ascending' });
    
    // New states for mass edit mode (locations only)
    const [isMassEditMode, setIsMassEditMode] = useState(false);
    const [editedData, setEditedData] = useState<any[]>([]);
    const [massEditLoading, setMassEditLoading] = useState(false);

    const memoizedFetchUsers = useCallback(fetchUsers, []);
    const memoizedFetchArchivedData = useCallback(fetchArchivedData, []);


    useEffect(() => {
        if (dataType === 'users') {
            memoizedFetchUsers();
        } else {
            memoizedFetchArchivedData(dataType);
        }
        setSearchTerm('');
        setCurrentPage(1);
        setItemsPerPage(10);
        setView('active');
        setIsMassEditMode(false); // Reset mass edit mode when switching data types
        // Set default sort config
        const defaultConfig = DATA_CONFIG[dataType];
        if (defaultConfig && defaultConfig.fields.length > 0) {
            setSortConfig({ key: defaultConfig.fields[0].name, direction: 'ascending' });
        } else {
            setSortConfig({ key: null, direction: 'ascending' });
        }
    }, [dataType, memoizedFetchUsers, memoizedFetchArchivedData]);
    
    const config = DATA_CONFIG[dataType];
    const isSoftDeletable = ['teachers', 'subjects', 'classGroups', 'locations', 'timeSlots'].includes(dataType);
    const isToggleable = ['teachers', 'subjects', 'classGroups', 'locations'].includes(dataType);
    const isPaginatedView = isSoftDeletable;
    const archivedDataType = isSoftDeletable ? `archived${dataType.charAt(0).toUpperCase() + dataType.slice(1)}` : '';
    
    const data = view === 'active' 
        ? (timetable as any)[dataType] || []
        : (timetable as any)[archivedDataType] || [];
        
    const { title, fields } = config;

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    const processedData = useMemo(() => {
        if (!isPaginatedView) return data;

        let items = [...data];

        // 1. Sorting
        if (sortConfig.key) {
            const getSortableValue = (item: any, key: string) => {
                const field = fields.find((f: any) => f.name === key);
                if (!field) return item[key];
    
                const value = item[key];
                if (field.name === 'responsibleTeacherId' && value) return timetable.teachers.find(t => t.id === value)?.name || '';
                if (field.name === 'parentId' && value) return timetable.classGroups.find(cg => cg.id === value)?.name || '';
                if (field.name === 'semester' && field.displayOptions) return field.displayOptions.find((d: any) => d.value === value)?.label || value;
                return value;
            };

            items.sort((a, b) => {
                const valA = getSortableValue(a, sortConfig.key!);
                const valB = getSortableValue(b, sortConfig.key!);
    
                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;
                
                let comparison = 0;
                if (typeof valA === 'number' && typeof valB === 'number') {
                    comparison = valA - valB;
                } else {
                    comparison = String(valA).localeCompare(String(valB), 'th-TH');
                }
                
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        
        // 2. Filtering
        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            items = items.filter(item => {
                const searchableString = fields.map((field: any) => {
                    const value = item[field.name];
                    if (field.type === 'password') return '';
                    if (field.name === 'responsibleTeacherId' && value) return timetable.teachers.find(t => t.id === value)?.name || '';
                    if (field.name === 'parentId' && value) return timetable.classGroups.find(cg => cg.id === value)?.name || '';
                    if (field.name === 'semester' && field.displayOptions) return field.displayOptions.find((d: any) => d.value === value)?.label || value;
                    return String(value ?? '');
                }).join(' ').toLowerCase();

                return searchableString.includes(lowercasedFilter);
            });
        }

        return items;
    }, [data, sortConfig, searchTerm, fields, isPaginatedView, timetable.teachers, timetable.classGroups]);

    const totalPages = Math.ceil((isMassEditMode ? editedData.length : processedData.length) / itemsPerPage);
    const paginatedData = useMemo(() => 
        (isMassEditMode ? editedData : processedData).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [processedData, currentPage, itemsPerPage, isMassEditMode, editedData]);

    const dataToRender = isPaginatedView ? paginatedData : data;
    
    const handleOpenModal = (item: any | null = null) => {
        if (item) {
            setIsEditMode(true);
            setCurrentItem(item);
            const { password, ...rest } = item;
            setBulkData([rest]);
        } else {
            setIsEditMode(false);
            setCurrentItem(null);
            setBulkData([{}]);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setCurrentItem(null);
        setBulkData([{}]);
    };
    
    const handleBulkChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const newBulkData = [...bulkData];
        const currentItem = { ...newBulkData[index] };

        if (type === 'checkbox') {
             currentItem[name] = (e.target as HTMLInputElement).checked;
        } else if (type === 'number') {
            currentItem[name] = value === '' ? '' : parseFloat(value);
        } else {
            currentItem[name] = value;
        }
        newBulkData[index] = currentItem;
        setBulkData(newBulkData);
    };
    
    const addBulkRow = () => setBulkData([...bulkData, {}]);
    const removeBulkRow = (index: number) => {
        if (bulkData.length > 1) {
            setBulkData(bulkData.filter((_, i) => i !== index));
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let allSuccess = true;
        for (const item of bulkData) {
            if (dataType === 'users' && !isEditMode && !item.password) {
                alert('กรุณากรอกรหัสผ่านสำหรับผู้ใช้ใหม่');
                allSuccess = false;
                break;
            }
            if (dataType === 'users' && item.password === '') {
                 delete item.password;
            }
            
            const idField = dataType === 'subjects' ? 'code' : 'id';
            const originalId = isEditMode && currentItem ? currentItem[idField] : undefined;

            let resultPromise;
            switch(dataType){
                case 'teachers': resultPromise = timetable.addOrUpdateTeacher(item, originalId); break;
                case 'subjects': resultPromise = timetable.addOrUpdateSubject(item, originalId); break;
                case 'classGroups': resultPromise = timetable.addOrUpdateClassGroup(item, originalId); break;
                case 'locations': resultPromise = timetable.addOrUpdateLocation(item, originalId); break;
                case 'timeSlots': resultPromise = timetable.addOrUpdateTimeSlot(item, originalId); break;
                case 'users': resultPromise = timetable.addOrUpdateUser(item, originalId); break;
                default: allSuccess = false;
            }

            if (resultPromise) {
                const result = await resultPromise;
                if (!result.success) {
                    alert(`เกิดข้อผิดพลาด: ${result.message}`);
                    allSuccess = false;
                    break;
                }
            }
        }

        if (allSuccess) handleCloseModal();
    };

    const handleDelete = async (item: any) => {
        if (!item || (dataType === 'users' && typeof item.username !== 'string')) {
            alert('เกิดข้อผิดพลาด: ข้อมูลสำหรับลบไม่สมบูรณ์');
            console.error('Delete action cancelled due to invalid item data:', item);
            return;
        }

        const isUserManagement = dataType === 'users';
        const confirmationMessage = isUserManagement
            ? `คุณต้องการลบผู้ใช้ "${item.username}" ใช่หรือไม่?\n\nการกระทำนี้เป็นการลบข้อมูลอย่างถาวรและไม่สามารถย้อนกลับได้`
            : 'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้? ข้อมูลจะถูกย้ายไปยังรายการที่ถูกลบ (ถังขยะ) และสามารถกู้คืนได้ในภายหลัง';

        if (window.confirm(confirmationMessage)) {
            let result: { success: boolean, message?: string } | undefined;
            switch(dataType){
                case 'teachers': result = await timetable.deleteTeacher(item.id); break;
                case 'subjects': result = await timetable.deleteSubject(item.code); break;
                case 'classGroups': result = await timetable.deleteClassGroup(item.id); break;
                case 'locations': result = await timetable.deleteLocation(item.id); break;
                case 'timeSlots': result = await timetable.deleteTimeSlot(item.id); break;
                case 'users': result = await timetable.deleteUser(item.id); break;
            }
            if (result && !result.success) {
                alert(`เกิดข้อผิดพลาดในการลบ: ${result.message}`);
            }
        }
    };

    const handleRestore = (item: any) => {
        if (window.confirm('คุณต้องการกู้คืนข้อมูลนี้ใช่หรือไม่?')) {
             switch(dataType){
                case 'teachers': timetable.restoreTeacher(item.id); break;
                case 'subjects': timetable.restoreSubject(item.code); break;
                case 'classGroups': timetable.restoreClassGroup(item.id); break;
                case 'locations': timetable.restoreLocation(item.id); break;
                case 'timeSlots': timetable.restoreTimeSlot(item.id); break;
            }
        }
    }
    
     const handleDownloadTemplate = () => {
        if (!config.csvHeaders) return;
        const headers = config.csvHeaders.join(',');
        
        // Safely access example data for the current data type
        const exampleRows = (TEMPLATE_EXAMPLES as any)[dataType] || [];
        
        // Convert array of arrays into CSV rows, ensuring values are properly quoted
        const csvExampleRows = exampleRows.map((row: string[]) => 
            row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')
        );

        const csvContent = [headers, ...csvExampleRows].join('\r\n');
        
        // Add UTF-8 BOM for better Excel compatibility with Thai characters
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${dataType}_template.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleFileImportClick = () => {
        fileInputRef.current?.click();
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
                alert("ไฟล์ CSV ต้องมีอย่างน้อย 1 บรรทัดข้อมูล");
                return;
            }
            
            const headers = lines[0].split(',').map(h => h.trim());
            const expectedHeaders = config.csvHeaders;
            if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) {
                alert(`หัวข้อคอลัมน์ไม่ถูกต้อง! ต้องเป็น: ${expectedHeaders.join(',')}`);
                return;
            }
            
            const data = lines.slice(1).map(line => {
                const values = line.split(',');
                const obj: { [key: string]: any } = {};
                headers.forEach((header, i) => {
                    let value: any = values[i].trim();
                     if (value.toLowerCase() === 'true') value = true;
                     else if (value.toLowerCase() === 'false') value = false;
                     else if (!isNaN(Number(value)) && value !== '') value = Number(value);
                    obj[header] = value;
                });
                return obj;
            });

            setCsvData(data);
            setIsCsvModalOpen(true);
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleExportCsv = () => {
        if (processedData.length === 0) {
            alert("ไม่มีข้อมูลสำหรับส่งออก");
            return;
        }
    
        const headers = config.csvHeaders;
    
        const escapeCsvCell = (cell: any): string => {
            const str = String(cell ?? '');
            // Quote fields that contain commas, double quotes, or newlines
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
    
        const dataRows = processedData.map(item => {
            const row: any[] = [];
            headers.forEach((header: string) => {
                switch (`${dataType}:${header}`) {
                    case 'locations:responsibleTeacherName':
                        const teacher = timetable.teachers.find(t => t.id === item.responsibleTeacherId);
                        row.push(teacher ? teacher.name : '');
                        break;
                    case 'classGroups:parentName':
                        const parent = timetable.classGroups.find(cg => cg.id === item.parentId);
                        row.push(parent ? parent.name : '');
                        break;
                    default:
                        // This handles direct mappings like 'teachers:name' -> item['name']
                        row.push(item[header]);
                }
            });
            return row.map(escapeCsvCell).join(',');
        });
    
        const csvContent = [
            headers.join(','),
            ...dataRows
        ].join('\r\n');
    
        // Create and download the file with UTF-8 BOM
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${dataType}_export_${view}_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleToggleMassEdit = () => {
        if (isMassEditMode) {
            // Cancel and exit mode
            setIsMassEditMode(false);
            setEditedData([]);
        } else {
            // Enter mode
            // Use a deep copy to avoid mutating the original state
            setEditedData(JSON.parse(JSON.stringify(processedData)));
            setIsMassEditMode(true);
        }
    };
    
    const handleMassEditChange = (id: string, fieldName: string, value: any) => {
        setEditedData(prev =>
            prev.map(item =>
                item.id === id ? { ...item, [fieldName]: value } : item
            )
        );
    };

    const handleSaveMassEdit = async () => {
        setMassEditLoading(true);

        const originalDataMap = new Map(processedData.map(item => [item.id, item]));
        const changedItems = editedData.filter(editedItem => {
            const originalItem = originalDataMap.get(editedItem.id);
            return originalItem && JSON.stringify(originalItem) !== JSON.stringify(editedItem);
        });

        if (changedItems.length === 0) {
            alert("ไม่มีการเปลี่ยนแปลงข้อมูล");
            setIsMassEditMode(false);
            setMassEditLoading(false);
            return;
        }

        const updatePromises = changedItems.map(item => {
            const { id, ...dataToUpdate } = item;
            return timetable.addOrUpdateLocation(dataToUpdate, id);
        });

        try {
            const results = await Promise.all(updatePromises);
            const failedUpdates = results.filter(r => !r.success);
            if (failedUpdates.length > 0) {
                alert(`บันทึกข้อมูล ${results.length - failedUpdates.length} รายการสำเร็จ, แต่เกิดข้อผิดพลาด ${failedUpdates.length} รายการ`);
            } else {
                alert(`บันทึกข้อมูล ${changedItems.length} รายการสำเร็จ`);
            }
        } catch (error) {
            alert("เกิดข้อผิดพลาดร้ายแรงระหว่างการบันทึกข้อมูล");
            console.error("Mass save error:", error);
        } finally {
            setMassEditLoading(false);
            setIsMassEditMode(false);
            // Data will be re-fetched by the context automatically after successful updates
        }
    };


    const renderFormField = (field: any, value: any, onChange: (e: any) => void) => {
        const commonProps = {
            id: field.name,
            name: field.name,
            required: isEditMode && field.type === 'password' ? false : field.required,
            className: "shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline",
            value: value ?? '',
            onChange: onChange,
            placeholder: field.placeholder || ''
        };

        switch (field.type) {
            case 'select':
                return (
                    <select {...commonProps}>
                        <option value="">-- กรุณาเลือก --</option>
                        {field.options.map((opt: any, index: number) => {
                            const val = typeof opt === 'object' ? opt.value : opt;
                            const label = field.displayOptions?.find((d:any) => d.value === val)?.label || val;
                             if (field.name === 'color') {
                                return <option key={val+index} value={val}><div className="flex items-center"><span className={`w-3 h-3 mr-2 rounded-full ${val}`}></span> {val}</div></option>;
                            }
                            return <option key={val+index} value={val}>{label}</option>
                        })}
                    </select>
                );
            case 'select_teacher':
                 return (
                    <select {...commonProps}>
                        <option value="">-- ไม่มี --</option>
                        {[...timetable.activeTeachers].sort((a,b) => a.name.localeCompare(b.name, 'th')).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                    </select>
                );
            case 'select_classGroup':
                return (
                   <select {...commonProps}>
                       <option value="">-- ไม่มี --</option>
                       {timetable.classGroups
                           .filter(cg => !cg.parentId)
                           .filter(cg => cg.id !== (isEditMode && bulkData[0]?.id))
                           .sort((a, b) => a.name.localeCompare(b.name, 'th'))
                           .map((cg) => <option key={cg.id} value={cg.id}>{cg.name}</option>)}
                   </select>
               );
            case 'checkbox':
                return (
                    <input 
                        type="checkbox"
                        id={field.name}
                        name={field.name}
                        checked={!!value}
                        onChange={onChange}
                        className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                );
            default:
                return (
                    <input 
                        {...commonProps}
                        type={field.type}
                        pattern={field.pattern}
                        title={field.pattern ? "กรุณากรอกข้อมูลตามรูปแบบที่กำหนด (HH:mm)" : undefined}
                        disabled={isEditMode && (
                            (field.name === 'id') || 
                            (field.name === 'code' && dataType !== 'subjects') || 
                            (field.name === 'username')
                        )}
                        step={field.type === 'number' ? (field.name === 'credits' ? '0.1' : '1') : undefined}
                    />
                );
        }
    };
    
    const renderTableCell = (item: any, field: any) => {
        const value = item[field.name];
        if (field.type === 'password') return '********';
        if (field.type === 'checkbox') return value ? '✔️ ใช่' : '❌ ไม่ใช่';
        if (field.name === 'responsibleTeacherId' && value) return timetable.teachers.find(t => t.id === value)?.name || 'N/A';
        if (field.name === 'parentId' && value) return timetable.classGroups.find(cg => cg.id === value)?.name || 'N/A';
        if (field.name === 'semester' && field.displayOptions) return field.displayOptions.find((d:any) => d.value === value)?.label || value;
        
        if (field.name === 'color' && value) {
            return (
                <div className="flex items-center">
                    <span className={`inline-block w-4 h-4 rounded-full mr-2 border border-gray-400`} style={{ backgroundColor: value }}></span>
                    <span>{value}</span>
                </div>
            );
        }
        return String(value ?? '');
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
                <div className="flex flex-wrap items-center gap-2">
                    {config.csvHeaders && !isMassEditMode && (
                        <>
                           <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                           <button onClick={handleFileImportClick} className="flex items-center bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                                <Upload size={20} className="mr-2" /> นำเข้า CSV
                            </button>
                             <button onClick={handleDownloadTemplate} className="flex items-center bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                                <Download size={20} className="mr-2" /> โหลดเทมเพลต
                            </button>
                            <button onClick={handleExportCsv} className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors">
                                <FileDown size={20} className="mr-2" /> ส่งออก CSV
                            </button>
                        </>
                    )}
                    {dataType === 'locations' && view === 'active' && (
                        isMassEditMode ? (
                            <>
                                <button onClick={handleSaveMassEdit} disabled={massEditLoading} className="flex items-center bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:bg-green-300">
                                    <Save size={20} className="mr-2" /> {massEditLoading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขทั้งหมด'}
                                </button>
                                <button onClick={handleToggleMassEdit} disabled={massEditLoading} className="flex items-center bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
                                    <XCircle size={20} className="mr-2" /> ยกเลิก
                                </button>
                            </>
                        ) : (
                            <button onClick={handleToggleMassEdit} className="flex items-center bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors">
                                <Edit size={20} className="mr-2" /> แก้ไขทั้งหมด
                            </button>
                        )
                    )}
                    {!isMassEditMode && (
                        <button onClick={() => handleOpenModal()} className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                            <PlusCircle size={20} className="mr-2" /> เพิ่มข้อมูล
                        </button>
                    )}
                </div>
            </div>

            <CsvInstructions dataType={dataType} />

            <div className="flex justify-between items-center mb-4">
                {isPaginatedView ? (
                    <>
                        <div className="relative flex-grow max-w-xs">
                             <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search className="w-5 h-5 text-gray-400" />
                            </span>
                            <input
                                type="text"
                                placeholder="ค้นหา..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full p-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex items-center">
                            <label htmlFor="items-per-page" className="mr-2 text-gray-700">แสดง:</label>
                            <select
                                id="items-per-page"
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                {[10, 20, 30, 40, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
                            </select>
                            <span className="ml-2 text-gray-700">รายการ</span>
                        </div>
                    </>
                ) : <div/>}
                 {isSoftDeletable && !isMassEditMode && (
                    <button
                        onClick={() => {
                            setView(view === 'active' ? 'archived' : 'active');
                            setCurrentPage(1);
                            setSearchTerm('');
                        }}
                        className="flex items-center bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
                    >
                        {view === 'active' ? <Archive size={20} className="mr-2" /> : <ArchiveRestore size={20} className="mr-2" />}
                        {view === 'active' ? `รายการที่ถูกลบ (${(timetable as any)[archivedDataType]?.length || 0})` : 'กลับไปหน้ารายการปกติ'}
                    </button>
                )}
            </div>
            
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-max">
                        <thead className="bg-gray-100">
                            <tr>
                                {fields.map((field: any) => (
                                    <th key={field.name} className="p-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                                        <button
                                            type="button"
                                            onClick={() => !isMassEditMode && requestSort(field.name)}
                                            className="flex items-center transition-colors hover:text-gray-900"
                                            disabled={isMassEditMode}
                                        >
                                            <span>{field.label}</span>
                                            <div className="w-4 h-4 ml-1">
                                                {sortConfig.key === field.name && !isMassEditMode && (
                                                    sortConfig.direction === 'ascending' ? (
                                                        <ArrowUp className="h-4 w-4" />
                                                    ) : (
                                                        <ArrowDown className="h-4 w-4" />
                                                    )
                                                )}
                                            </div>
                                        </button>
                                    </th>
                                ))}
                                {isToggleable && view === 'active' && <th className="p-3 text-left font-semibold text-gray-600">สถานะ</th>}
                                {view === 'archived' && <th className="p-3 text-left font-semibold text-gray-600">วันที่ลบ</th>}
                                {!isMassEditMode && <th className="p-3 text-center font-semibold text-gray-600">การดำเนินการ</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {dataToRender && dataToRender.map((item: any) => (
                                <tr key={item.id || item.code} className={`border-t hover:bg-gray-50 ${!item.isActive && view === 'active' && !isMassEditMode ? 'bg-gray-100 text-gray-500' : ''}`}>
                                    {fields.map((field: any) => (
                                        <td key={field.name} className="p-2 align-middle">
                                            {isMassEditMode && field.name === 'name' ? (
                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={(e) => handleMassEditChange(item.id, 'name', e.target.value)}
                                                    className="w-full p-1 border rounded"
                                                />
                                            ) : isMassEditMode && field.name === 'responsibleTeacherId' ? (
                                                <select
                                                    value={item.responsibleTeacherId || ''}
                                                    onChange={(e) => handleMassEditChange(item.id, 'responsibleTeacherId', e.target.value || null)}
                                                    className="w-full p-1 border rounded"
                                                >
                                                    <option value="">-- ไม่มี --</option>
                                                    {timetable.activeTeachers.sort((a,b) => a.name.localeCompare(b.name, 'th')).map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                renderTableCell(item, field)
                                            )}
                                        </td>
                                    ))}
                                    
                                    {isToggleable && view === 'active' && (
                                        <td className="p-3">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={item.isActive}
                                                    onChange={() => {
                                                        if (isMassEditMode) {
                                                            handleMassEditChange(item.id, 'isActive', !item.isActive);
                                                        } else {
                                                            updateItemStatus(dataType as any, item.id || item.code, !item.isActive)
                                                        }
                                                    }}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                <span className={`ml-3 text-sm font-medium ${item.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                                    {item.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                                                </span>
                                            </label>
                                        </td>
                                    )}

                                    {view === 'archived' && <td className="p-3">{item.deletedAt ? new Date(item.deletedAt).toLocaleString('th-TH') : ''}</td>}
                                    {!isMassEditMode && (
                                        <td className="p-3 text-center">
                                            {view === 'active' ? (
                                                <>
                                                    <button onClick={() => handleOpenModal(item)} className="text-blue-500 hover:text-blue-700 mx-2"><Edit size={18} /></button>
                                                    <button onClick={() => handleDelete(item)} className="text-red-500 hover:text-red-700 mx-2"><Trash2 size={18} /></button>
                                                </>
                                            ) : (
                                                 <button onClick={() => handleRestore(item)} className="flex items-center justify-center mx-auto bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200">
                                                    <ArchiveRestore size={16} className="mr-1"/> กู้คืน
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {(!dataToRender || dataToRender.length === 0) && <p className="text-center p-4 text-gray-500">ไม่พบข้อมูล</p>}
                </div>
            </div>
             {isPaginatedView && processedData.length > 0 && (
                <div className="flex justify-between items-center py-3 px-3 bg-white border-t rounded-b-lg">
                    <div className="text-sm text-gray-700">
                        แสดง <span className="font-medium">{paginatedData.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}</span>
                        {' - '}
                        <span className="font-medium">{Math.min(currentPage * itemsPerPage, (isMassEditMode ? editedData.length : processedData.length))}</span>
                        {' จาก '}
                        <span className="font-medium">{isMassEditMode ? editedData.length : processedData.length}</span> รายการ
                    </div>
                    <div className="inline-flex -space-x-px rounded-md shadow-sm">
                        <button
                            onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-l-md px-3 py-2 text-sm font-medium text-gray-600 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ก่อนหน้า
                        </button>
                        <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                            หน้า {currentPage} / {totalPages > 0 ? totalPages : 1}
                        </span>
                        <button
                            onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                            disabled={currentPage >= totalPages}
                            className="relative inline-flex items-center rounded-r-md px-3 py-2 text-sm font-medium text-gray-600 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ถัดไป
                        </button>
                    </div>
                </div>
            )}
            <CSVImportModal isOpen={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)} dataType={dataType} csvData={csvData} />
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={isEditMode ? `แก้ไข${title.replace('จัดการข้อมูล', '')}` : `เพิ่ม${title.replace('จัดการข้อมูล', '')}`}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {bulkData.map((item, index) => (
                        <div key={index} className="p-4 border rounded-lg relative space-y-3">
                            {!isEditMode && bulkData.length > 1 && (
                                <button type="button" onClick={() => removeBulkRow(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                                    <Trash size={18} />
                                </button>
                            )}
                            {fields.map((field: any) => (
                                <div key={field.name}>
                                    <label className="block text-gray-700 text-sm font-bold mb-1" htmlFor={`${field.name}-${index}`}>
                                        {field.label}
                                    </label>
                                    {renderFormField(field, item[field.name], (e: any) => handleBulkChange(index, e))}
                                    {field.description && <p className="text-xs text-gray-500 mt-1">{field.description}</p>}
                                </div>
                            ))}
                        </div>
                    ))}
                    {!isEditMode && ['teachers', 'subjects', 'classGroups', 'locations', 'timeSlots'].includes(dataType) && (
                        <button type="button" onClick={addBulkRow} className="flex items-center text-blue-600 hover:text-blue-800 font-medium">
                           <Plus size={18} className="mr-1"/> เพิ่มรายการ
                        </button>
                    )}
                    <div className="flex items-center justify-end pt-4">
                        <button type="button" onClick={handleCloseModal} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 mr-2">ยกเลิก</button>
                        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">บันทึก</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

const MasterData: React.FC = () => {
    const location = useLocation();
    const { dataType: routeDataType } = useParams<{ dataType: string }>();
    const { loading, schoolInfo } = useTimetable();

    const getDataTypeFromPath = (): MasterDataType | 'general' | 'users' | undefined => {
        const path = location.pathname;
        if (path.endsWith('/settings/users')) return 'users';
        if (path.endsWith('/settings/general')) return 'general';
        if (routeDataType && DATA_CONFIG[routeDataType]) return routeDataType as MasterDataType;
        return undefined;
    };

    const dataType = getDataTypeFromPath();
    
    // While loading initial school info, don't render anything to avoid flashes of wrong content
    if (loading && !schoolInfo) {
        return null;
    }

    if (dataType === 'general') {
        return <GeneralSettingsPanel />;
    }
    
    if (dataType && DATA_CONFIG[dataType]) {
        return <DataManagementView dataType={dataType} />;
    }
    
    if (!dataType && !routeDataType) {
        return <GeneralSettingsPanel />; // Fallback for /settings
    }
    
    return <div>Invalid data type specified.</div>
};

export default MasterData;