import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import HomeView from './components/HomeView';
import MapView from './components/MapView';
import DebugGraphView from './components/DebugGraphView';
import SavedPathsView from './components/SavedPathsView';
import CounselorView from './components/CounselorView';
import LabView from './components/LabView';

function FixtureBanner() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isFixture = searchParams.get('fixture') === 'true';

  if (!isFixture) return null;

  return (
    <div
      role="alert"
      className="bg-red-600 text-white font-black text-center py-2.5 px-4 uppercase tracking-widest text-xs sm:text-sm z-50 sticky top-0 shadow-xl border-b-2 border-red-900 flex items-center justify-center gap-2 select-none"
    >
      <span className="text-base" aria-hidden="true">⚠️</span>
      <span>FIXTURE DATA — NOT REAL</span>
      <span className="text-base" aria-hidden="true">⚠️</span>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <FixtureBanner />
      <Routes>
        {/* Main Production Routes */}
        <Route path="/" element={<HomeView />} />
        <Route path="/map/:procedureId" element={<MapView />} />
        <Route path="/map" element={<Navigate to="/map/rochester-grade-appeal" replace />} />

        {/* Phase 5 Saved Paths & Counselor Routes */}
        <Route path="/saved" element={<SavedPathsView />} />
        <Route path="/counselor/:pathId" element={<CounselorView />} />
        <Route path="/counselor" element={<Navigate to="/saved" replace />} />

        {/* Phase 6 Developer Route */}
        <Route path="/lab" element={<LabView />} />

        {/* Debug Topology Routes */}
        <Route path="/debug/:procedureId" element={<DebugGraphView />} />
        <Route path="/debug" element={<Navigate to="/debug/rochester-grade-appeal" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
