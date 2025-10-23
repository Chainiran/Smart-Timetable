import React, { useState } from 'react';
import Modal from './Modal';
import SearchableMultiSelect from './SearchableMultiSelect';
// FIX: Import the centralized 'ColorBy' type to ensure consistency across components.
import { Teacher, ClassGroup, Location, ColorBy } from '../types';

// FIX: Removed local type definition to use the centralized one from 'types.ts'.
// type ColorBy = 'subjectGroup' | 'teacher' | 'classGroup' | 'subject';

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
        layout: 1 | 2 | 4 | 6;
        displayOptions: DisplayOptions;
        colorBy: ColorBy;
        showCoteachers: boolean;
    }) => void;
    viewType: 'class' | 'teacher' | 'location';
    options: (Teacher[] | ClassGroup[] | Location[]);
    initialDisplayOptions: DisplayOptions;
    initialColorBy: ColorBy;
}

const PrintModal: React.FC<PrintModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    viewType,
    options,
    initialDisplayOptions,
    initialColorBy,
}) => {
    const [printScope, setPrintScope] = useState<'all' | 'custom'>('all');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [layout, setLayout] = useState<1 | 2 | 4 | 6>(2);
    const [displayOptions, setDisplayOptions] = useState<DisplayOptions>(initialDisplayOptions);
    const [colorBy, setColorBy] = useState<ColorBy>(initialColorBy);
    const [showCoteachers, setShowCoteachers] = useState(false);

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
            colorBy: colorBy,
            showCoteachers: showCoteachers,
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
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="layout" value={1} checked={layout === 1} onChange={() => setLayout(1)} className="form-radio h-4 w-4 text-blue-600" /><span>1 ตาราง/หน้า (แนวนอน)</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="layout" value={2} checked={layout === 2} onChange={() => setLayout(2)} className="form-radio h-4 w-4 text-blue-600" /><span>2 ตาราง/หน้า (แนวตั้ง)</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="layout" value={4} checked={layout === 4} onChange={() => setLayout(4)} className="form-radio h-4 w-4 text-blue-600" /><span>4 ตาราง/หน้า (แนวนอน)</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="radio" name="layout" value={6} checked={layout === 6} onChange={() => setLayout(6)} className="form-radio h-4 w-4 text-blue-600" /><span>6 ตาราง/หน้า (แนวตั้ง)</span></label>
                    </div>
                </fieldset>

                {/* --- Display Options --- */}
                <fieldset>
                    <legend className="text-lg font-medium text-gray-900 mb-2">3. ตัวเลือกการแสดงผล</legend>
                     <div className="grid grid-cols-2 gap-3 mb-4">
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showSubjectName" checked={displayOptions.showSubjectName} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>ชื่อวิชา/กิจกรรม</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showSubjectCode" checked={displayOptions.showSubjectCode} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>รหัสวิชา</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showTeacher" checked={displayOptions.showTeacher} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>ครูผู้สอน</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showClassGroup" checked={displayOptions.showClassGroup} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>กลุ่มเรียน</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showLocation" checked={displayOptions.showLocation} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>สถานที่</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="useSubjectColors" checked={displayOptions.useSubjectColors} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>ใช้สีพื้นหลัง</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showCoteachers" checked={showCoteachers} onChange={e => setShowCoteachers(e.target.checked)} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>แสดงครูผู้สอนร่วม</span></label>
                    </div>
                     <div className="flex items-center gap-2 max-w-xs">
                        <label htmlFor="color-scheme-select-modal" className="text-sm font-medium text-gray-700 whitespace-nowrap">จำแนกสีตาม:</label>
                        <select
                            id="color-scheme-select-modal"
                            value={colorBy}
                            onChange={(e) => setColorBy(e.target.value as ColorBy)}
                            className="block w-full pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                            <option value="subjectGroup">กลุ่มสาระวิชา</option>
                            <option value="teacher">ครูผู้สอน</option>
                            <option value="classGroup">กลุ่มเรียน</option>
                            <option value="subject">รายวิชา</option>
                        </select>
                    </div>
                </fieldset>

                {/* --- Actions --- */}
                <div className="pt-4 border-t">
                    <p className="text-center text-sm text-red-600 mb-4">
                        สามารถปรับขนาด Scale การพิมพ์ให้เหมาะสมสำหรับหลายตาราง/หน้าได้ แนะนำ 70-90%
                    </p>
                    <div className="flex justify-end">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 mr-2">ยกเลิก</button>
                        <button type="button" onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">สร้าง PDF</button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default PrintModal;