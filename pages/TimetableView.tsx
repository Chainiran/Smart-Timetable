import React, { useState, useEffect, useRef } from 'react';
// FIX: Import 'createRoot' from 'react-dom/client' for React 18 compatibility.
import { createRoot } from 'react-dom/client';
import { useTimetable } from '../context/TimetableContext';
import TimetableGrid from '../components/TimetableGrid';
import PrintModal from '../components/PrintModal';
import PrintLayout from '../components/PrintLayout';
import { ScheduleEntry, Location, Teacher, ClassGroup } from '../types';
import { Printer, Settings, ChevronDown, ChevronUp, Search, User, FileDown } from 'lucide-react';
import SearchableMultiSelect from '../components/SearchableMultiSelect';

interface TimetableViewProps {
    viewType: 'class' | 'teacher' | 'location';
}

interface PrintData {
    items: {
        id: string;
        name: string;
        entries: ScheduleEntry[];
    }[];
    layout: 2 | 4 | 8;
    displayOptions: DisplayOptions;
    viewType: 'class' | 'teacher' | 'location';
}

interface DisplayOptions {
    showSubjectName: boolean;
    showSubjectCode: boolean;
    showTeacher: boolean;
    showClassGroup: boolean;
    showLocation: boolean;
    useSubjectColors: boolean;
}

const SearchableLocationSelect: React.FC<{
    selectedId: string;
    onSelect: (id: string) => void;
    locations: Location[];
}> = ({ selectedId, onSelect, locations }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const selectedLocation = locations.find(l => l.id === selectedId);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);
    
    useEffect(() => {
        if (selectedLocation) {
            setSearchTerm(selectedLocation.name);
        } else {
            setSearchTerm('');
        }
    }, [selectedLocation]);

    const filteredLocations = locations.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative w-full md:w-1/2" ref={wrapperRef}>
             <label className="block text-lg font-medium text-gray-700 mb-2">เลือกสถานที่:</label>
            <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {setSearchTerm(e.target.value); setIsOpen(true);}}
                    onFocus={() => setIsOpen(true)}
                    placeholder="ค้นหาสถานที่..."
                    className="w-full p-2 pl-10 border border-gray-300 rounded-md shadow-sm"
                />
            </div>
            {isOpen && (
                <ul className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                    {filteredLocations.length > 0 ? filteredLocations.map(l => (
                        <li key={l.id}
                            onClick={() => {
                                onSelect(l.id);
                                setIsOpen(false);
                            }}
                            className="p-2 hover:bg-blue-100 cursor-pointer"
                        >
                            {l.name}
                        </li>
                    )) : <li className="p-2 text-gray-500">ไม่พบสถานที่</li>}
                </ul>
            )}
        </div>
    );
}

const TimetableView: React.FC<TimetableViewProps> = ({ viewType }) => {
    const { classGroups, teachers, locations, schedule, schoolInfo, timeSlots, subjects } = useTimetable();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printData, setPrintData] = useState<PrintData | null>(null);
    const [responsibleTeacherName, setResponsibleTeacherName] = useState('');
    const [displayOptions, setDisplayOptions] = useState<DisplayOptions>({
        showSubjectName: true,
        showSubjectCode: false,
        showTeacher: true,
        showClassGroup: true,
        showLocation: true,
        useSubjectColors: true,
    });
    
    useEffect(() => {
        if (viewType === 'location' && selectedIds.length > 0) {
            const selectedLocation = locations.find(l => l.id === selectedIds[0]);
            if (selectedLocation?.responsibleTeacherId) {
                const teacher = teachers.find(t => t.id === selectedLocation.responsibleTeacherId);
                setResponsibleTeacherName(teacher?.name || 'ไม่มี');
            } else {
                setResponsibleTeacherName('ไม่มี');
            }
        } else {
            setResponsibleTeacherName('');
        }
    }, [selectedIds, viewType, locations, teachers]);

    useEffect(() => {
        const printRootEl = document.getElementById('print-root');
        if (printData && printRootEl) {
            const root = createRoot(printRootEl);
            const PrintComponent = (
                <PrintLayout 
                    {...printData} 
                    schoolInfo={schoolInfo}
                    timeSlots={timeSlots}
                    subjects={subjects}
                    teachers={teachers}
                    locations={locations}
                    classGroups={classGroups}
                />
            );
            root.render(PrintComponent);

            setTimeout(() => {
                window.print();
                root.unmount();
                setPrintData(null);
            }, 100);
        }
    }, [printData, schoolInfo, timeSlots, subjects, teachers, locations, classGroups]);

    const title = viewType === 'class' ? 'ตารางเรียน' : viewType === 'teacher' ? 'ตารางสอน' : 'ตารางการใช้สถานที่';
    const label = viewType === 'class' ? 'เลือกกลุ่มเรียน' : 'เลือกครูผู้สอน';
    const options: (Teacher[] | ClassGroup[] | Location[]) = viewType === 'class' ? classGroups : viewType === 'teacher' ? teachers : locations;
    
    let filteredSchedule: ScheduleEntry[] = [];
    if (selectedIds.length > 0) {
        if (viewType === 'class') {
            const allRelevantClassGroupIds = new Set<string>();
            selectedIds.forEach(selectedId => {
                allRelevantClassGroupIds.add(selectedId);
            });
            filteredSchedule = schedule.filter(e => e.classGroupId && allRelevantClassGroupIds.has(e.classGroupId));
        } else if (viewType === 'teacher') {
            filteredSchedule = schedule.filter(e => e.teacherIds.some(tid => selectedIds.includes(tid)));
        } else { // location
            filteredSchedule = schedule.filter(e => e.locationId === selectedIds[0]);
        }
    }
    
    const handlePrintCurrentView = () => {
        window.print();
    };

    const handleGeneratePdf = (config: {
        ids: string[];
        layout: 2 | 4 | 8;
        displayOptions: DisplayOptions;
    }) => {
        const itemsToPrint = options.filter(opt => config.ids.includes(opt.id));
        const newPrintData: PrintData = {
            items: itemsToPrint.map(item => {
                let itemEntries: ScheduleEntry[] = [];
                if(viewType === 'class') {
                    itemEntries = schedule.filter(e => e.classGroupId === item.id);
                } else if (viewType === 'teacher') {
                    itemEntries = schedule.filter(e => e.teacherIds.includes(item.id));
                } else if (viewType === 'location') {
                    itemEntries = schedule.filter(e => e.locationId === item.id);
                }
                return {
                    id: item.id,
                    name: item.name,
                    entries: itemEntries
                };
            }),
            layout: config.layout,
            displayOptions: config.displayOptions,
            viewType: viewType,
        };
        setPrintData(newPrintData);
        setIsPrintModalOpen(false);
    };
    
    const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setDisplayOptions(prev => ({ ...prev, [name]: checked }));
    };

    const selectedNames = options
        .filter(o => selectedIds.includes(o.id))
        .map(o => o.name)
        .join(', ');

    return (
        <div id="main-content">
            <PrintModal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                onSubmit={handleGeneratePdf}
                viewType={viewType}
                options={options}
                initialDisplayOptions={displayOptions}
            />

            <div className="no-print flex flex-wrap justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
                 <div className="flex items-center gap-2">
                    <button onClick={() => setIsOptionsOpen(!isOptionsOpen)} className="flex items-center bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                        <Settings size={20} className="mr-2" />
                        ตัวเลือกการแสดงผล
                        {isOptionsOpen ? <ChevronUp size={20} className="ml-1" /> : <ChevronDown size={20} className="ml-1" />}
                    </button>
                    <button onClick={() => setIsPrintModalOpen(true)} className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                        <FileDown size={20} className="mr-2" />
                        ส่งออก PDF (ทั้งหมด)
                    </button>
                    {selectedIds.length > 0 && (
                        <button onClick={handlePrintCurrentView} className="flex items-center bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                            <Printer size={20} className="mr-2" />
                            พิมพ์มุมมองนี้
                        </button>
                    )}
                 </div>
            </div>
            
            {isOptionsOpen && (
                <div className="no-print mb-6 p-4 bg-white rounded-lg shadow-md border animate-fade-in-down">
                    <h3 className="text-lg font-semibold mb-3 text-gray-700">ตั้งค่าการแสดงผลตาราง</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showSubjectName" checked={displayOptions.showSubjectName} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>ชื่อวิชา/กิจกรรม</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showSubjectCode" checked={displayOptions.showSubjectCode} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>รหัสวิชา</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showTeacher" checked={displayOptions.showTeacher} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>ครูผู้สอน</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showClassGroup" checked={displayOptions.showClassGroup} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>กลุ่มเรียน</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="showLocation" checked={displayOptions.showLocation} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>สถานที่</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" name="useSubjectColors" checked={displayOptions.useSubjectColors} onChange={handleOptionChange} className="form-checkbox h-5 w-5 text-blue-600 rounded" /><span>ใช้สีพื้นหลังรายวิชา</span></label>
                    </div>
                </div>
            )}

            <div className="no-print mb-6">
                {viewType === 'class' || viewType === 'teacher' ? (
                    <SearchableMultiSelect
                        // FIX: The conditional check `viewType !== 'location'` was redundant because this component is only rendered when viewType is 'class' or 'teacher'.
                        label={label + ' (เลือกได้มากกว่า 1)'}
                        options={options}
                        selectedIds={selectedIds}
                        onChange={setSelectedIds}
                        placeholder={viewType === 'class' ? 'ค้นหากลุ่มเรียน...' : 'ค้นหาครู...'}
                        viewType={viewType}
                        allTeachers={viewType === 'teacher' ? teachers : undefined}
                    />
                ) : (
                    <SearchableLocationSelect 
                        locations={locations}
                        selectedId={selectedIds[0] || ''}
                        onSelect={(id) => setSelectedIds(id ? [id] : [])}
                    />
                )}
                {responsibleTeacherName && (
                    <div className="mt-3 flex items-center text-md text-gray-700 p-2 bg-gray-100 rounded-md w-full md:w-1/2">
                        <User size={18} className="mr-2 text-gray-500"/>
                        <strong>ผู้รับผิดชอบ:</strong><span className="ml-2">{responsibleTeacherName}</span>
                    </div>
                )}
            </div>
            
            <div className="print-container">
                 {selectedIds.length > 0 && (
                    <>
                        <div className="mb-4 hidden print:block text-center">
                            <h2 className="text-3xl font-bold">{schoolInfo.name}</h2>
                            <h3 className="text-2xl font-semibold">{title}</h3>
                            <h4 className="text-xl">{selectedNames}</h4>
                            <p className="text-lg">ปีการศึกษา {schoolInfo.academicYear} ภาคเรียนที่ {schoolInfo.currentSemester}</p>
                        </div>
                        <TimetableGrid 
                            entries={filteredSchedule} 
                            isEditable={false}
                            viewContext={viewType}
                            displayOptions={displayOptions}
                            selectedItemCount={selectedIds.length}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default TimetableView;