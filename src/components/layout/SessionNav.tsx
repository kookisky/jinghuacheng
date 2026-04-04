import { Link } from 'react-router-dom';
import { allSessionMetas } from '../../lib/sessions';

interface Props {
  currentId: string;
}

export default function SessionNav({ currentId }: Props) {
  const currentOrder = parseInt(currentId, 10);
  const prevId = currentOrder > 1 ? String(currentOrder - 1).padStart(2, '0') : null;
  const nextId = currentOrder < 15 ? String(currentOrder + 1).padStart(2, '0') : null;
  const prevMeta = prevId ? allSessionMetas.find(m => m.id === prevId) : null;
  const nextMeta = nextId ? allSessionMetas.find(m => m.id === nextId) : null;

  return (
    <div className="flex items-center justify-between py-4 border-t border-gray-200 mt-8 text-sm">
      {prevMeta ? (
        <Link to={`/sessions/${prevId}`} className="text-blue-600 hover:underline">
          ← 第{prevMeta.id}場
        </Link>
      ) : (
        <span />
      )}
      <Link to="/sessions" className="text-gray-400 hover:text-gray-600">
        全部場次
      </Link>
      {nextMeta ? (
        <Link to={`/sessions/${nextId}`} className="text-blue-600 hover:underline">
          第{nextMeta.id}場 →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
