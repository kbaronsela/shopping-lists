import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ListsPage from './pages/ListsPage';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lists" element={<ListsPage />} />
      </Routes>
    </div>
  );
}
