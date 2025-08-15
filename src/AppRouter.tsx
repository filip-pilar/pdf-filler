import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { ImportConfigPage } from './pages/ImportConfigPage';
import { UndoRedoProvider } from './contexts/UndoRedoContext';

export function AppRouter() {
  return (
    <BrowserRouter>
      <UndoRedoProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/import-config" element={<ImportConfigPage />} />
        </Routes>
      </UndoRedoProvider>
    </BrowserRouter>
  );
}