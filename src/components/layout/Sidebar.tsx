import { Link, useParams } from 'react-router-dom';
import { allSessionMetas } from '../../lib/sessions';
import { SESSION_STAGES } from '../../lib/types';

export default function Sidebar() {
  const { id: currentId } = useParams<{ id: string }>();

  return (
    <nav className="py-4 text-sm overflow-y-auto h-full">
      <Link
        to="/sessions"
        className="block px-4 py-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 uppercase tracking-wider"
      >
        15 場列表
      </Link>
      {SESSION_STAGES.map((stage) => (
        <div key={stage.label} className="mt-3">
          <div className="px-4 py-1 text-xs text-gray-400">{stage.label}</div>
          {stage.sessions.map((sid) => {
            const meta = allSessionMetas.find(m => m.id === sid);
            if (!meta) return null;
            const active = sid === currentId;
            return (
              <Link
                key={sid}
                to={`/sessions/${sid}`}
                className={`block px-4 py-1.5 truncate hover:bg-gray-100 transition ${
                  active
                    ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-500'
                    : 'text-gray-600'
                }`}
              >
                <span className="text-gray-400 mr-1">第{meta.id}場</span>
                <span className="text-xs">{meta.title.length > 20 ? meta.title.slice(0, 20) + '…' : meta.title}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
