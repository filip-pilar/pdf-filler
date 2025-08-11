import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { ImportConfigPage } from './pages/ImportConfigPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/import-config" element={<ImportConfigPage />} />
      </Routes>
    </BrowserRouter>
  );
}