import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import WorldRules from '@/pages/WorldRules';
import Chapters from '@/pages/Chapters';
import Endings from '@/pages/Endings';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<WorldRules />} />
          <Route path="/chapters" element={<Chapters />} />
          <Route path="/endings" element={<Endings />} />
        </Route>
      </Routes>
    </Router>
  );
}
