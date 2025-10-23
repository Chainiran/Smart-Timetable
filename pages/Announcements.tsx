import React, { useState, useEffect, useRef } from 'react';
import { useTimetable } from '../context/TimetableContext';
import { Announcement } from '../types';
import Modal from '../components/Modal';
import { PlusCircle, Edit, Trash2, Bold, Italic, Underline, Palette } from 'lucide-react';

// Simple Rich Text Editor Component
const SimpleEditor: React.FC<{ value: string; onChange: (html: string) => void; }> = ({ value, onChange }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const colorInputRef = useRef<HTMLInputElement>(null);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        onChange(e.currentTarget.innerHTML);
    };
    
    const applyFormat = (command: string, arg?: string) => {
        if (editorRef.current) {
            editorRef.current.focus();
            document.execCommand(command, false, arg);
            // Manually trigger input event after execCommand
            const event = new Event('input', { bubbles: true, cancelable: true });
            editorRef.current.dispatchEvent(event);
        }
    };
    
    // Sync external value changes to the editor
    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);

    return (
        <div className="border rounded-lg">
            <div className="flex items-center gap-2 p-2 border-b bg-gray-50 rounded-t-lg">
                <button type="button" onClick={() => applyFormat('bold')} className="p-2 hover:bg-gray-200 rounded"><Bold size={16} /></button>
                <button type="button" onClick={() => applyFormat('italic')} className="p-2 hover:bg-gray-200 rounded"><Italic size={16} /></button>
                <button type="button" onClick={() => applyFormat('underline')} className="p-2 hover:bg-gray-200 rounded"><Underline size={16} /></button>
                <button type="button" onClick={() => colorInputRef.current?.click()} className="p-2 hover:bg-gray-200 rounded relative">
                    <Palette size={16} />
                    <input
                        type="color"
                        ref={colorInputRef}
                        onChange={(e) => applyFormat('foreColor', e.target.value)}
                        className="absolute w-0 h-0 opacity-0"
                    />
                </button>
            </div>
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="p-3 min-h-[200px] prose max-w-none focus:outline-none"
                dangerouslySetInnerHTML={{ __html: value }}
            />
        </div>
    );
};


const Announcements: React.FC = () => {
    const { announcements, fetchAllAnnouncements, addOrUpdateAnnouncement, deleteAnnouncement, updateAnnouncementStatus } = useTimetable();
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentItem, setCurrentItem] = useState<Partial<Announcement> | null>(null);

    useEffect(() => {
        setLoading(true);
        fetchAllAnnouncements().finally(() => setLoading(false));
    }, [fetchAllAnnouncements]);

    const sortedAnnouncements = [...announcements].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const openModal = (item: Announcement | null = null) => {
        if (item) {
            setIsEditMode(true);
            setCurrentItem(item);
        } else {
            setIsEditMode(false);
            setCurrentItem({ title: '', content: '', isActive: true });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentItem(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentItem) return;

        // FIX: The type of `dataToSave` was inferred with optional properties from `currentItem: Partial<Announcement>`.
        // The `addOrUpdateAnnouncement` function expects required properties. By explicitly checking for the required
        // properties, we satisfy TypeScript's type checker and ensure data integrity before sending to the API.
        const { id, title, content, isActive } = currentItem;

        if (title === undefined || content === undefined || isActive === undefined) {
            alert('Title, content, and active status are required.');
            return;
        }

        const dataToSave = { title, content, isActive };

        const result = await addOrUpdateAnnouncement(dataToSave, isEditMode ? id : undefined);
        if (result.success) {
            closeModal();
        } else {
            alert(`Error: ${result.message}`);
        }
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบประกาศนี้?')) {
            const result = await deleteAnnouncement(id);
             if (!result.success) {
                alert(`Error: ${result.message}`);
            }
        }
    };
    
    const handleToggleStatus = (id: string, currentStatus: boolean) => {
        updateAnnouncementStatus(id, !currentStatus);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">จัดการประกาศประชาสัมพันธ์</h1>
                <button onClick={() => openModal()} className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                    <PlusCircle size={20} className="mr-2" /> เพิ่มประกาศ
                </button>
            </div>
            
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-max">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 text-left font-semibold text-gray-600">หัวข้อ</th>
                                <th className="p-3 text-left font-semibold text-gray-600">อัปเดตล่าสุด</th>
                                <th className="p-3 text-center font-semibold text-gray-600">สถานะ</th>
                                <th className="p-3 text-center font-semibold text-gray-600">การดำเนินการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="text-center p-4">Loading...</td></tr>
                            ) : sortedAnnouncements.length === 0 ? (
                                <tr><td colSpan={4} className="text-center p-4 text-gray-500">ไม่พบประกาศ</td></tr>
                            ) : (
                                sortedAnnouncements.map(item => (
                                <tr key={item.id} className="border-t hover:bg-gray-50">
                                    <td className="p-3 font-medium">{item.title}</td>
                                    <td className="p-3 text-sm text-gray-600">{new Date(item.updatedAt).toLocaleString('th-TH')}</td>
                                    <td className="p-3 text-center">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                          <input type="checkbox" checked={item.isActive} onChange={() => handleToggleStatus(item.id, item.isActive)} className="sr-only peer" />
                                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                          <span className={`ml-3 text-sm font-medium ${item.isActive ? 'text-green-600' : 'text-red-600'}`}>{item.isActive ? 'เผยแพร่' : 'ซ่อน'}</span>
                                        </label>
                                    </td>
                                    <td className="p-3 text-center">
                                        <button onClick={() => openModal(item)} className="text-blue-500 hover:text-blue-700 mx-2"><Edit size={18} /></button>
                                        <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 mx-2"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditMode ? 'แก้ไขประกาศ' : 'เพิ่มประกาศใหม่'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">หัวข้อ</label>
                        <input
                            id="title"
                            type="text"
                            required
                            value={currentItem?.title || ''}
                            onChange={(e) => setCurrentItem(p => ({ ...p, title: e.target.value }))}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">เนื้อหา</label>
                        <SimpleEditor
                            value={currentItem?.content || ''}
                            onChange={(html) => setCurrentItem(p => ({ ...p, content: html }))}
                        />
                    </div>
                    <div>
                        <label className="flex items-center space-x-2">
                             <input
                                type="checkbox"
                                checked={currentItem?.isActive ?? true}
                                onChange={(e) => setCurrentItem(p => ({ ...p, isActive: e.target.checked }))}
                                className="h-5 w-5 text-blue-600 border-gray-300 rounded"
                            />
                            <span>เผยแพร่ทันที</span>
                        </label>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="button" onClick={closeModal} className="bg-gray-500 text-white px-4 py-2 rounded-lg mr-2">ยกเลิก</button>
                        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-lg">บันทึก</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Announcements;