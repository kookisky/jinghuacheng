import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { allSessionMetas } from '../lib/sessions';
import { SESSION_STAGES } from '../lib/types';

const sideFocusStyle: Record<string, string> = {
  '檢方': 'bg-blue-100 text-blue-700',
  '辯方': 'bg-amber-100 text-amber-700',
  '混合': 'bg-purple-100 text-purple-700',
  '程序': 'bg-gray-100 text-gray-600',
};

export default function SessionList() {
  useEffect(() => {
    document.title = '京華城案言詞辯論｜15場總覽';
  }, []);
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">15 場言詞辯論</h1>

      {SESSION_STAGES.map((stage) => (
        <div key={stage.label} className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {stage.label}
          </h2>
          <div className="space-y-2">
            {stage.sessions.map((sid) => {
              const meta = allSessionMetas.find(m => m.id === sid);
              if (!meta) return null;
              return (
                <Link
                  key={sid}
                  to={`/sessions/${sid}`}
                  className="flex items-baseline gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:shadow-sm transition"
                >
                  <span className="text-sm font-mono text-gray-400 shrink-0">
                    第{meta.id}場
                  </span>
                  <span className="text-sm flex-1">{meta.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${sideFocusStyle[meta.sideFocus] || ''}`}>
                    {meta.sideFocus}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
