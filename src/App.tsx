import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DebugGraphView from './components/DebugGraphView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/debug/:procedureId" element={<DebugGraphView />} />
        <Route path="/debug" element={<Navigate to="/debug/rochester-grade-appeal" replace />} />
        <Route path="/" element={<Navigate to="/debug/rochester-grade-appeal" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
