import { Route, Routes } from 'react-router-dom';
import { PageRenderer } from './pages/PageRenderer';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<PageRenderer />} />
      <Route path="/*" element={<PageRenderer />} />
    </Routes>
  );
}
