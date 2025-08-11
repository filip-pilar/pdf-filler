import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { DevPage } from './pages/DevPage';
import { ImportConfigPage } from './pages/ImportConfigPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/dev" element={<DevPage />} />
        <Route path="/import-config" element={<ImportConfigPage />} />
      </Routes>
    </BrowserRouter>
  );
}