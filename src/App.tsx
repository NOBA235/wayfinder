import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomeView from './components/HomeView';
import MapView from './components/MapView';
import DebugGraphView from './components/DebugGraphView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main Production Routes */}
        <Route path="/" element={<HomeView />} />
        <Route path="/map/:procedureId" element={<MapView />} />
        <Route path="/map" element={<Navigate to="/map/rochester-grade-appeal" replace />} />

        {/* Debug Topology Routes */}
        <Route path="/debug/:procedureId" element={<DebugGraphView />} />
        <Route path="/debug" element={<Navigate to="/debug/rochester-grade-appeal" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
