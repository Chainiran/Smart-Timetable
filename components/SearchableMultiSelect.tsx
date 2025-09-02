import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';
import { Teacher } from '../types';
import { SUBJECT_GROUP_OPTIONS } from '../constants';

interface Option {
  id: string;
  name: string;
}

interface SearchableMultiSelectProps {
  options: Option[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  label: string;
  placeholder?: string;
  viewType?: 'class' | 'teacher' | 'location';
  allTeachers?: Teacher[];
  widthClass?: string;
}

const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
  options,
  selectedIds,
  onChange,
  label,
  placeholder = 'ค้นหา...',
  viewType,
  allTeachers,
  widthClass = 'w-full md:w-1/2'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOptions = options.filter(opt => selectedIds.includes(opt.id));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleOption = (optionId: string) => {
    const newSelectedIds = selectedIds.includes(optionId)
      ? selectedIds.filter(id => id !== optionId)
      : [...selectedIds, optionId];
    onChange(newSelectedIds);
    setSelectedGroup(''); // Reset group selection if individual selection changes
  };

  const handleSelectByGroup = (group: string) => {
    setSelectedGroup(group);
    if (group && allTeachers) {
        const teacherIdsInGroup = allTeachers
            .filter(t => t.subjectGroup === group)
            .map(t => t.id);
        onChange(teacherIdsInGroup);
    } else {
        onChange([]); // Clear selection if no group is selected
    }
  };

  const filteredOptions = options.filter(opt =>
    opt.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`relative ${widthClass}`} ref={wrapperRef}>
      <label className="block text-lg font-medium text-gray-700 mb-2">{label}</label>
      <div className="border border-gray-300 rounded-md shadow-sm p-2 bg-white cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex flex-wrap gap-2 items-center min-h-[2.5rem]">
          {selectedOptions.map(opt => (
            <span key={opt.id} className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-1 rounded-full flex items-center">
              {opt.name}
              <button
                type="button"
                className="ml-2 text-blue-500 hover:text-blue-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleOption(opt.id);
                }}
              >
                <X size={14} />
              </button>
            </span>
          ))}
          {selectedIds.length === 0 && <span className="text-gray-500 px-2">-- กรุณาเลือก --</span>}
          <div className="flex-grow" />
          <ChevronDown size={20} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>
      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border rounded shadow-lg">
          {viewType === 'teacher' && allTeachers && (
            <div className="p-2 border-b">
                <label htmlFor="group-select" className="text-sm text-gray-600 block mb-1">เลือกครูทั้งกลุ่มสาระฯ:</label>
                <select 
                    id="group-select"
                    value={selectedGroup}
                    onChange={(e) => handleSelectByGroup(e.target.value)}
                    className="w-full p-2 border rounded bg-gray-50"
                    onClick={(e) => e.stopPropagation()} // Prevent closing the main dropdown when clicking the select
                >
                    <option value="">-- ไม่เลือกกลุ่ม --</option>
                    {SUBJECT_GROUP_OPTIONS.map(group => (
                        <option key={group} value={group}>{group}</option>
                    ))}
                </select>
            </div>
          )}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 pl-10 border rounded"
              />
            </div>
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {filteredOptions.map(opt => (
              <li
                key={opt.id}
                className={`p-3 cursor-pointer hover:bg-blue-50 flex items-center ${selectedIds.includes(opt.id) ? 'bg-blue-100' : ''}`}
                onClick={() => handleToggleOption(opt.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(opt.id)}
                  readOnly
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                />
                {opt.name}
              </li>
            ))}
             {filteredOptions.length === 0 && <li className="p-3 text-gray-500">ไม่พบข้อมูล</li>}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableMultiSelect;
