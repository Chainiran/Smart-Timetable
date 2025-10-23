import React from 'react';
// FIX: Import 'Plus' from 'lucide-react' to resolve the 'Cannot find name' error.
import { Settings, Calendar, Printer, ClipboardEdit, Upload, Download, PlusCircle, Edit, Trash2, BookOpen, HelpCircle, Plus } from 'lucide-react';

const Help: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 space-y-12 animate-fade-in-up">
            <header className="text-center border-b pb-6 mb-8">
                <HelpCircle className="mx-auto h-16 w-16 text-blue-500 mb-4" />
                <h1 className="text-4xl font-extrabold text-gray-800">คู่มือการใช้งาน Smart Timetable</h1>
                <p className="mt-2 text-lg text-gray-600">คำแนะนำการใช้งานระบบจัดการตารางสอนอัจฉริยะ</p>
            </header>

            {/* Section 1: Master Data */}
            <section id="master-data" className="space-y-6 p-6 bg-white rounded-lg shadow-md">
                <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                        <Settings className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">1. การตั้งค่าข้อมูลพื้นฐาน</h2>
                        <p className="text-gray-600">จัดการข้อมูลหลักทั้งหมดของโรงเรียน เช่น ครู, รายวิชา, กลุ่มเรียน, และสถานที่</p>
                    </div>
                </div>
                <div className="prose max-w-none prose-lg prose-blue">
                    <p>
                        ข้อมูลพื้นฐานเป็นหัวใจของระบบ ก่อนเริ่มจัดตารางสอน คุณต้องเตรียมข้อมูลเหล่านี้ให้พร้อม โดยสามารถทำได้ 2 วิธีหลัก:
                    </p>
                    <ol>
                        <li>
                            <strong>การเพิ่ม/แก้ไขข้อมูลทีละรายการ:</strong>
                            <ul>
                                <li><strong>เพิ่มข้อมูล:</strong> คลิกปุ่ม <span className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md text-base"><PlusCircle size={16} className="mr-1" />เพิ่มข้อมูล</span> เพื่อเปิดหน้าต่างสำหรับกรอกรายละเอียด</li>
                                <li><strong>แก้ไขข้อมูล:</strong> คลิกไอคอน <span className="inline-flex items-center bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-md text-base"><Edit size={16} /></span> ท้ายรายการที่ต้องการ</li>
                                <li><strong>ลบข้อมูล:</strong> คลิกไอคอน <span className="inline-flex items-center bg-red-100 text-red-800 px-2 py-0.5 rounded-md text-base"><Trash2 size={16} /></span> เพื่อย้ายข้อมูลไปยัง "รายการที่ถูกลบ" (สามารถกู้คืนได้)</li>
                            </ul>
                        </li>
                        <li>
                            <strong>การนำเข้าข้อมูลด้วยไฟล์ CSV (แนะนำสำหรับข้อมูลจำนวนมาก):</strong>
                            <ul>
                                <li>คลิกปุ่ม <span className="inline-flex items-center bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md text-base"><Download size={16} className="mr-1" />โหลดเทมเพลต</span> เพื่อดาวน์โหลดไฟล์ตัวอย่าง</li>
                                <li>เปิดไฟล์ด้วยโปรแกรม Spreadsheet (เช่น Excel, Google Sheets) และกรอกข้อมูลของคุณตามรูปแบบในไฟล์เทมเพลต</li>
                                <li>บันทึกไฟล์เป็นนามสกุล .csv (เลือก Encoding เป็น UTF-8 เพื่อรองรับภาษาไทย)</li>
                                <li>กลับมาที่ระบบแล้วคลิก <span className="inline-flex items-center bg-green-100 text-green-800 px-2 py-0.5 rounded-md text-base"><Upload size={16} className="mr-1" />นำเข้า CSV</span> เพื่ออัปโหลดไฟล์ที่เตรียมไว้</li>
                            </ul>
                        </li>
                    </ol>
                     <p><strong>เคล็ดลับ:</strong> คุณสามารถเปิด-ปิดการใช้งานข้อมูลแต่ละรายการ (เช่น ครูที่ลาออก) ได้ด้วยสวิตช์ "สถานะ" โดยไม่ต้องลบข้อมูลออกจากระบบ</p>
                </div>
            </section>

            {/* Section 2: Timetable Arrangement */}
            <section id="arrangement" className="space-y-6 p-6 bg-white rounded-lg shadow-md">
                <div className="flex items-center space-x-4">
                    <div className="bg-green-100 p-3 rounded-full">
                        <Calendar className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">2. การจัดตารางสอน</h2>
                         <p className="text-gray-600">เครื่องมือหลักสำหรับวางคาบสอนลงในตาราง</p>
                    </div>
                </div>
                <div className="prose max-w-none prose-lg prose-blue">
                    <p>
                        หลังจากตั้งค่าข้อมูลพื้นฐานเรียบร้อยแล้ว คุณสามารถเริ่มจัดตารางสอนได้ที่เมนูนี้
                    </p>
                    <ul>
                        <li><strong>เลือกมุมมอง:</strong> คุณสามารถเลือกจัดตารางโดยยึด "กลุ่มเรียน" หรือ "ครูผู้สอน" เป็นหลัก</li>
                        <li><strong>การเพิ่มคาบสอน:</strong> คลิกที่ช่องตารางว่างเพื่อเปิดหน้าต่าง "เพิ่มคาบเรียน" จากนั้นกรอกข้อมูลที่จำเป็น เช่น รายวิชา, ครูผู้สอน, และสถานที่</li>
                        <li><strong>การลาก-วาง:</strong> สำหรับกลุ่มเรียนที่มีวิชาที่ยังจัดไม่ครบคาบ ระบบจะแสดง "รายวิชาที่ยังจัดไม่ครบ" คุณสามารถลากวิชานั้นไปวางในช่องตารางว่างได้เลยเพื่อความรวดเร็ว</li>
                        <li><strong>การตรวจจับข้อขัดแย้ง (Conflict):</strong> หากคุณพยายามบันทึกคาบสอนที่ซ้ำซ้อนกับข้อมูลที่มีอยู่ (เช่น ครูคนเดียวกันมีสอน 2 ที่ในเวลาเดียวกัน) ระบบจะแจ้งเตือนและให้คุณเลือกว่าจะ "บันทึกทับ" หรือ "กลับไปแก้ไข"</li>
                        <li><strong>กิจกรรมพิเศษ:</strong> คุณสามารถเพิ่มกิจกรรมที่ไม่ใช่วิชาสอนได้ เช่น พักเที่ยง, กิจกรรมลูกเสือ โดยติ๊กที่ช่อง "กิจกรรมพิเศษ"</li>
                    </ul>
                </div>
            </section>

            {/* Section 3: View & Print */}
            <section id="view-print" className="space-y-6 p-6 bg-white rounded-lg shadow-md">
                <div className="flex items-center space-x-4">
                     <div className="bg-purple-100 p-3 rounded-full">
                        <Printer className="h-8 w-8 text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">3. การแสดงผลและพิมพ์ตาราง</h2>
                        <p className="text-gray-600">ดู, เปรียบเทียบ, และส่งออกตารางในรูปแบบต่างๆ</p>
                    </div>
                </div>
                 <div className="prose max-w-none prose-lg prose-blue">
                    <p>
                        เมนู "ตารางเรียน/สอน" (<BookOpen size={20} className="inline-block" />) เป็นส่วนที่ผู้ใช้ทั่วไปและนักเรียนสามารถเข้ามาดูตารางที่จัดเสร็จแล้วได้
                    </p>
                    <ul>
                        <li><strong>การเลือกดู:</strong> สามารถเลือกดูได้ 3 มุมมองคือ ตารางเรียน (ตามกลุ่มเรียน), ตารางสอน (ตามครู), และตารางการใช้สถานที่</li>
                        <li><strong>การดูพร้อมกันหลายรายการ:</strong> ในมุมมองตารางเรียนและตารางสอน คุณสามารถเลือกดูหลายรายการพร้อมกันได้ (เช่น ดูตารางสอนของครู 5 คนในหน้าเดียว) เพื่อเปรียบเทียบคาบว่าง</li>
                        <li><strong>ตัวเลือกการแสดงผล:</strong> คลิกปุ่ม <span className="inline-flex items-center bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md text-base"><Settings size={16} className="mr-1" />ตัวเลือก</span> เพื่อปรับแต่งการแสดงผล เช่น เปิด/ปิดการแสดงรหัสวิชา, ชื่อครู, สถานที่ หรือเปลี่ยนรูปแบบการจำแนกสี</li>
                        <li><strong>การพิมพ์และส่งออก PDF:</strong> คลิกปุ่ม <span className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md text-base"><Printer size={16} className="mr-1" />พิมพ์ / ส่งออก PDF</span> เพื่อสร้างไฟล์ PDF ที่สามารถพิมพ์ได้ โดยสามารถเลือกรูปแบบการจัดวางได้ (1, 2, หรือ 6 ตารางต่อหน้า)</li>
                    </ul>
                </div>
            </section>

             {/* Section 4: Substitution */}
            <section id="substitution" className="space-y-6 p-6 bg-white rounded-lg shadow-md">
                <div className="flex items-center space-x-4">
                     <div className="bg-orange-100 p-3 rounded-full">
                        <ClipboardEdit className="h-8 w-8 text-orange-600" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">4. การจัดสอนแทน</h2>
                        <p className="text-gray-600">จัดการและบันทึกการสอนแทนเมื่อมีครูไม่มาปฏิบัติหน้าที่</p>
                    </div>
                </div>
                <div className="prose max-w-none prose-lg prose-blue">
                    <p>
                        เมื่อมีครูลาหรือไม่สามารถมาสอนได้ คุณสามารถใช้เมนูนี้เพื่อจัดหาครูสอนแทนได้อย่างรวดเร็วและมีประสิทธิภาพ
                    </p>
                    <ol>
                        <li><strong>เลือกวันที่และครูที่ไม่มา:</strong> เริ่มต้นโดยการเลือกวันที่และครูที่ไม่สามารถมาสอนได้ ตารางสอนของครูท่านนั้นจะปรากฏขึ้นเป็นสีส้ม</li>
                        <li><strong>พิจารณาครูสอนแทน:</strong> ในช่อง "ครูที่จะพิจารณา" ให้เลือกครูที่คาดว่าจะมาสอนแทน ตารางสอนของครูเหล่านั้นจะปรากฏขึ้นพร้อมกัน ทำให้คุณเห็นทันทีว่าใครว่างหรือไม่ว่างในคาบนั้นๆ</li>
                        <li><strong>จัดสอนแทน:</strong>
                            <ul>
                                <li><strong>วิธีที่ 1 (รวดเร็ว):</strong> ในช่องตารางของครูที่ลา จะมีรายชื่อ "ครูที่ว่าง" ปรากฏขึ้น คุณสามารถคลิกปุ่ม <span className="inline-flex items-center bg-green-100 text-green-800 p-1 rounded-full"><Plus size={14}/></span> หลังชื่อครูเพื่อจัดสอนแทนได้ทันที</li>
                                <li><strong>วิธีที่ 2 (กำหนดเอง):</strong> คลิกที่คาบสอนสีส้มของครูที่ลา เพื่อเปิดหน้าต่างและเลือกครูสอนแทนจากรายชื่อครูที่ว่างทั้งหมด พร้อมระบุเหตุผลและหมายเหตุ</li>
                            </ul>
                        </li>
                        <li><strong>ตรวจสอบและส่งออก:</strong> รายการสอนแทนที่จัดแล้วจะแสดงในตารางด้านล่าง คุณสามารถพิมพ์เป็นใบเซ็นชื่อหรือส่งออกเป็นไฟล์ PDF/CSV ได้</li>
                    </ol>
                </div>
            </section>
        </div>
    );
};

export default Help;
