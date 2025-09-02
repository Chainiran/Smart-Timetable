
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useTimetable } from '../context/TimetableContext';
import Modal from '../components/Modal';
import { DATA_CONFIG, SEMESTER_OPTIONS } from '../constants';
import { PlusCircle, Edit, Trash2, Save, Trash, Plus, Upload, Download } from 'lucide-react';
import { SchoolInfo } from '../types';

const GeneralSettingsPanel: React.FC = () => {
    const { schoolInfo, updateSchoolInfo } = useTimetable();
    const [localInfo, setLocalInfo] = useState<SchoolInfo | null>(schoolInfo);

    useEffect(() => {
        if (schoolInfo) {
            setLocalInfo(schoolInfo);
        }
    }, [schoolInfo]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLocalInfo(prev => prev ? ({ ...prev, [name]: name === 'currentSemester' ? Number(value) : value }) : null);
    };

    const handleSave = () => {
        if (localInfo) {
            updateSchoolInfo(localInfo);
            alert('บันทึกการตั้งค่าทั่วไปสำเร็จ');
        }
    };
    
    if (!localInfo) {
        return <div>Loading school info...</div>;
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow">
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

const MasterData: React.FC = () => {
    const { dataType = 'general' } = useParams<{ dataType: string }>();
    const location = useLocation();
    const isGeneralSettings = location.pathname === '/settings/general' || dataType === 'general';
    const timetable = useTimetable();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [bulkData, setBulkData] = useState<any[]>([{}]);
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [csvData, setCsvData] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const config = dataType ? DATA_CONFIG[dataType] : null;
    const data = dataType ? (timetable as any)[dataType] : [];

    if (isGeneralSettings) {
        return <GeneralSettingsPanel />;
    }
    
    if (!dataType || !config) {
        return null;
    }

    const { title, fields } = config;
    
    const handleOpenModal = (item: any | null = null) => {
        if (item) {
            setIsEditMode(true);
            setBulkData([item]);
        } else {
            setIsEditMode(false);
            setBulkData([{}]);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
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
    
    const getAction = (actionType: 'addOrUpdate' | 'delete') => {
        const key = dataType as keyof typeof timetable;
        // Fix: Corrected logic for singularizing and capitalizing the data type name.
        if (typeof key !== 'string' || !key.endsWith('s')) return;
        const capitalizedKey = (key.charAt(0).toUpperCase() + key.slice(1)).slice(0, -1);
        const actionName = `${actionType}${capitalizedKey}`;
        return (timetable as any)[actionName];
    }
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let allSuccess = true;
        for (const item of bulkData) {
            let resultPromise: Promise<any> | undefined;
            if (dataType === 'subjects') {
                resultPromise = timetable.addOrUpdateSubject(item);
            } else if (dataType === 'classGroups') {
                resultPromise = timetable.addOrUpdateClassGroup(item);
            } else if (dataType === 'teachers') {
                 resultPromise = timetable.addOrUpdateTeacher(item);
            } else if (dataType === 'locations') {
                 resultPromise = timetable.addOrUpdateLocation(item);
            } else if (dataType === 'timeSlots') {
                resultPromise = timetable.addOrUpdateTimeSlot(item);
            } else {
                const action = getAction('addOrUpdate');
                if (action) resultPromise = action(item);
            }

            if (resultPromise) {
                const result = await resultPromise;
                if (!result.success) {
                    alert(result.message);
                    allSuccess = false;
                    break;
                }
            }
        }

        if (allSuccess) handleCloseModal();
    };

    const handleDelete = (item: any) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?')) {
             if (dataType === 'subjects') {
                timetable.deleteSubject(item.code);
            } else if (dataType === 'timeSlots'){
                 timetable.deleteTimeSlot(item.id);
            } else {
                const action = getAction('delete');
                if (action) action(item.id);
            }
        }
    };
    
     const handleDownloadTemplate = () => {
        if (!config.csvHeaders) return;
        const headers = config.csvHeaders.join(',');
        const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
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
        event.target.value = ''; // Reset file input
    };

    const renderFormField = (field: any, value: any, onChange: (e: any) => void) => { /* ... implementation from previous step, unchanged ... */
        const commonProps = {
            id: field.name,
            name: field.name,
            required: field.required,
            className: "shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline",
            value: value ?? '',
            onChange: onChange
        };

        switch (field.type) {
            case 'select':
                return (
                    <select {...commonProps}>
                        <option value="">-- กรุณาเลือก --</option>
                        {field.options.map((opt: any, index: number) => {
                            const val = typeof opt === 'object' ? opt.value : opt;
                            const label = field.displayOptions?.find((d:any) => d.value === val)?.label || val;
                            return <option key={val+index} value={val}>{label}</option>
                        })}
                    </select>
                );
            case 'select_teacher':
                 return (
                    <select {...commonProps}>
                        <option value="">-- ไม่มี --</option>
                        {timetable.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                    </select>
                );
            case 'select_classGroup':
                return (
                   <select {...commonProps}>
                       <option value="">-- ไม่มี --</option>
                       {timetable.classGroups
                           .filter(cg => !cg.parentId)
                           .filter(cg => cg.id !== (isEditMode && bulkData[0]?.id))
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
                        disabled={(field.name === 'id' || field.name === 'code') && isEditMode}
                        step={field.type === 'number' ? (field.name === 'credits' ? '0.1' : '1') : undefined}
                    />
                );
        }
    };
    
    const renderTableCell = (item: any, field: any) => { /* ... implementation from previous step, unchanged ... */
        const value = item[field.name];
        if (field.type === 'checkbox') return value ? '✔️ ใช่' : '❌ ไม่ใช่';
        if (field.name === 'responsibleTeacherId' && value) return timetable.teachers.find(t => t.id === value)?.name || 'N/A';
        if (field.name === 'parentId' && value) return timetable.classGroups.find(cg => cg.id === value)?.name || 'N/A';
        if (field.name === 'semester' && field.displayOptions) return field.displayOptions.find((d:any) => d.value === value)?.label || value;
        return value;
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
                <div className="flex items-center space-x-2">
                    {config.csvHeaders && (
                        <>
                           <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                           <button onClick={handleFileImportClick} className="flex items-center bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                                <Upload size={20} className="mr-2" /> นำเข้า CSV
                            </button>
                             <button onClick={handleDownloadTemplate} className="flex items-center bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                                <Download size={20} className="mr-2" /> โหลดเทมเพลต
                            </button>
                        </>
                    )}
                    <button onClick={() => handleOpenModal()} className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                        <PlusCircle size={20} className="mr-2" /> เพิ่มข้อมูล
                    </button>
                </div>
            </div>
            
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-max">
                        <thead className="bg-gray-100">
                            <tr>
                                {fields.map((field: any) => <th key={field.name} className="p-3 text-left font-semibold text-gray-600">{field.label}</th>)}
                                <th className="p-3 text-center font-semibold text-gray-600">การดำเนินการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item: any) => (
                                <tr key={item.id || item.code} className="border-t hover:bg-gray-50">
                                    {fields.map((field: any) => <td key={field.name} className="p-3">{renderTableCell(item, field)}</td>)}
                                    <td className="p-3 text-center">
                                        <button onClick={() => handleOpenModal(item)} className="text-blue-500 hover:text-blue-700 mx-2"><Edit size={18} /></button>
                                        <button onClick={() => handleDelete(item)} className="text-red-500 hover:text-red-700 mx-2"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
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
                                </div>
                            ))}
                        </div>
                    ))}
                    {!isEditMode && ['teachers', 'subjects', 'classGroups', 'locations'].includes(dataType) && (
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

export default MasterData;
