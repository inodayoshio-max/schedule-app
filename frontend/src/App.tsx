import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import EventPage from './pages/EventPage';
import ResponsesPage from './pages/ResponsesPage';
import SchedulesPage from './pages/SchedulesPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/schedules" element={<SchedulesPage />} />
        <Route path="/event/:id" element={<EventPage />} />
        <Route path="/event/:id/responses" element={<ResponsesPage />} />
      </Routes>
    </BrowserRouter>
  );
}
