import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import EventPage from './pages/EventPage';
import ResponsesPage from './pages/ResponsesPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/event/:id" element={<EventPage />} />
        <Route path="/event/:id/responses" element={<ResponsesPage />} />
      </Routes>
    </BrowserRouter>
  );
}
