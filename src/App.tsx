import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './routes/Home';
import Overview from './routes/Overview';
import SessionList from './routes/SessionList';
import SessionDetail from './routes/SessionDetail';
import About from './routes/About';

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-white">
        <nav className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 flex items-center gap-6 h-12 text-sm">
            <Link to="/" className="font-bold text-gray-800 hover:text-black">
              京華城案
            </Link>
            <Link to="/overview" className="text-gray-500 hover:text-gray-800">
              通盤分析
            </Link>
            <Link to="/sessions" className="text-gray-500 hover:text-gray-800">
              15 場逐字稿
            </Link>
            <Link to="/about" className="text-gray-500 hover:text-gray-800 ml-auto">
              關於
            </Link>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/sessions" element={<SessionList />} />
          <Route path="/sessions/:id" element={<SessionDetail />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
