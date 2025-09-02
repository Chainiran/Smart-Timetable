
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TimetableProvider } from './context/TimetableContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import MasterData from './pages/MasterData';
import TimetableArrangement from './pages/TimetableArrangement';
import TimetableView from './pages/TimetableView';

const App: React.FC = () => {
  return (
    <TimetableProvider>
      <HashRouter>
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/arrange" element={<TimetableArrangement />} />
              <Route path="/view/class" element={<TimetableView viewType="class" />} />
              <Route path="/view/teacher" element={<TimetableView viewType="teacher" />} />
              <Route path="/view/location" element={<TimetableView viewType="location" />} />
              <Route path="/settings/general" element={<MasterData />} />
              <Route path="/settings/:dataType" element={<MasterData />} />
              <Route path="/settings" element={<Navigate to="/settings/general" replace />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </TimetableProvider>
  );
};

export default App;
