import React, { useState } from 'react';
import Modal from './Modal';
import SearchableMultiSelect from './SearchableMultiSelect';
import { Teacher, ClassGroup, Location } from '../types';

interface DisplayOptions {
    showSubjectName: boolean;
    showSubjectCode: boolean;
    showTeacher: boolean;
    showClassGroup: boolean;
    showLocation: boolean;
    useSubjectColors: boolean;
}

interface PrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (config: {
        ids: string[];
        layout: 2 | 4 | 8;
        displayOptions: DisplayOptions;
    }) => void;
    viewType: 'class' | 'teacher' | 'location';
    options: (Teacher[] | ClassGroup[] | Location[]);
    initialDisplayOptions: DisplayOptions;
}

const PrintModal: React.FC<PrintModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    viewType,
    options,
    initialDisplayOptions,
}) => {
    const [printScope, setPrintScope] = useState<'all' | 'custom'>('all');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [layout, setLayout] = useState<2 | 4 | 8>(4);
    const [displayOptions, setDisplayOptions] = useState<DisplayOptions>(initialDisplayOptions);

    const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setDisplayOptions(prev => ({ ...prev, [name]: checked }));
    };

    const handleSubmit = () => {
        const idsToPrint = printScope === 'all' ? options.map(opt => opt.id) : selectedIds;
        if (idsToPrint.length === 0) {
            alert('กรุณาเลือกอย่างน้อย 1 รายการเพื่อพิมพ์');
            return;
        }
        onSubmit({
            ids: idsToPrint,
            layout: layout,
            displayOptions: displayOptions,
        });
    };

    const title = viewType === 'class' ? 'กลุ่มเรียน' : viewType === 'teacher' ? 'ครู' : 'สถานที่';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="ตั้งค่าการพิมพ์และส่งออก PDF">
            <div className="space-y-6">
                {/* --- Print Scope --- */}
                <fieldset>
                    <legend className="text-lg font-medium text-gray-900 mb-2">1. เลือกขอบเขตการพิมพ์</legend>
                    <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2"><input type="radio" value="all" checked={printScope === 'all'} onChange={() => setPrintScope('all')} className="form-radio h-4 w-4 text-blue-600" /><span>พิมพ์ทั้งหมด ({options.length} {title})</span></label>
                        <label className="flex items-center space-x-2"><input type="radio" value="custom" checked={printScope === 'custom'} onChange={() => setPrintScope('custom')} className="form-radio h-4 w-4 text-blue-600" /><span>กำหนดเอง</span></label>
                    </div>
                    {printScope === 'custom' && (
                        <div className="mt-4">
                             <SearchableMultiSelect
                                label={`เลือก${title}ที่ต้องการพิมพ์`}
                                options={options}
                                selectedIds={selectedIds}
                                onChange={setSelectedIds}
                                placeholder={`ค้นหา${title}...`}
                                widthClass="w-full"
                             />
                        </div>
                    )}
                </fieldset>

                {/* --- Layout --- */}
                 <fieldset>
                    <legend className="text-lg font-medium text-gray-900 mb-2">2. เลือกรูปแบบการจัดวาง (A4)</legend>
                    <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="layout" value={2} checked={layout === 2} onChange={() => setLayout(2)} className="form-radio h-4 w-4 text-blue-600" /><span>2 ตาราง/หน้า (ใหญ่)</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="layout" value={4} checked={layout === 4} onChange={() => setLayout(4)} className="form-radio h-4 w-4 text-blue-600" /><span>4 ตาราง/หน้า (กลาง)</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="layout" value={8} checked={layout === 8} onChange={() => setLayout(8)} className="form-radio h-4 w-4 text-blue-600" /><span>8 ตาราง/หน้า (เล็ก)</span></label>
                    </div>
                </fieldset>

                {/* --- Display Options --- */}
                <fieldset>
                    <legend className="text-lg font-medium text-gray-900 mb-2">3. ตัวเลือกการแสดงผล</legend>
                     <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showSubjectName" checked={displayOptions.showSubjectName} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>ชื่อวิชา/กิจกรรม</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showSubjectCode" checked={displayOptions.showSubjectCode} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>รหัสวิชา</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showTeacher" checked={displayOptions.showTeacher} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>ครูผู้สอน</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showClassGroup" checked={displayOptions.showClassGroup} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>กลุ่มเรียน</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showLocation" checked={displayOptions.showLocation} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>สถานที่</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="useSubjectColors" checked={displayOptions.useSubjectColors} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>ใช้สีพื้นหลังรายวิชา</span></label>
                    </div>
                </fieldset>

                {/* --- Actions --- */}
                <div className="flex justify-end pt-4 border-t">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 mr-2">ยกเลิก</button>
                    <button type="button" onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">สร้าง PDF</button>
                </div>
            </div>
        </Modal>
    );
};

export default PrintModal;
