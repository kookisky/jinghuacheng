import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getSessionMeta, loadAnalysis, loadTranscript } from '../lib/sessions';
import type { TranscriptBlock } from '../lib/types';
import AnalysisView from '../components/session/AnalysisView';
import TranscriptView from '../components/session/TranscriptView';
import Sidebar from '../components/layout/Sidebar';
import SessionNav from '../components/layout/SessionNav';

type Tab = 'analysis' | 'transcript';

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const meta = id ? getSessionMeta(id) : undefined;

  const [activeTab, setActiveTab] = useState<Tab>('analysis');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptBlock[] | null>(null);

  useEffect(() => {
    if (!id) return;
    setAnalysis(null);
    setTranscript(null);
    loadAnalysis(id).then(setAnalysis);
    loadTranscript(id).then(setTranscript);
  }, [id]);

  if (!meta) {
    return <div className="p-8 text-center text-gray-500">找不到第 {id} 場資料</div>;
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)]">
      {/* 左欄：15 場列表（桌機版） */}
      <aside className="hidden lg:block w-60 shrink-0 border-r border-gray-200 sticky top-12 h-[calc(100vh-3rem)] overflow-y-auto">
        <Sidebar />
      </aside>

      {/* 中欄：主閱讀區 */}
      <main className="flex-1 min-w-0 max-w-4xl mx-auto px-4 py-6">
        {/* 手機版場次導航條 */}
        <div className="lg:hidden mb-4">
          <SessionNav currentId={meta.id} />
        </div>

        {/* 頁首 */}
        <header className="mb-6">
          <div className="text-sm text-gray-400 mb-1">第{meta.id}場｜{meta.date} {meta.timeOfDay}</div>
          <h1 className="text-xl font-bold">{meta.title}</h1>
        </header>

        {/* 單場頁首警語 */}
        <div className="text-xs text-gray-400 bg-gray-50 rounded p-3 mb-4 leading-relaxed">
          本場逐字稿係依公開播送內容進行語音轉文字後，再就人名、法條、機關名稱與法庭用語等進行修訂整理。此版本非官方人工逐句校正稿，僅供分析參考；若需正式引用或確認原意，請以法院正式資料為準。
        </div>

        {/* Tab 切換 */}
        <div className="flex gap-1 border-b border-gray-200 mb-4 sticky top-12 bg-white z-5">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === 'analysis'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            分析
          </button>
          <button
            onClick={() => setActiveTab('transcript')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === 'transcript'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            逐字稿
          </button>
        </div>

        {/* 內容區（兩個都在 DOM 中，用 display 控制顯隱，保持滾動位置） */}
        <div style={{ display: activeTab === 'analysis' ? 'block' : 'none' }}>
          {analysis !== null ? (
            <AnalysisView markdown={analysis} />
          ) : (
            <div className="text-gray-400 py-8 text-center">載入中...</div>
          )}
        </div>

        <div style={{ display: activeTab === 'transcript' ? 'block' : 'none' }}>
          {transcript !== null ? (
            <>
              {meta.transcriptNotice && (
                <div className="text-xs text-gray-400 bg-gray-50 rounded p-3 mb-4 leading-relaxed">
                  {meta.transcriptNotice.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
                  ))}
                </div>
              )}
              <div className="text-xs text-gray-400 bg-amber-50 rounded p-2 mb-4">
                本逐字稿為語音轉文字後修訂稿，非官方人工校正版本，僅供分析參考；正式引用請以法院資料為準。
              </div>
              <TranscriptView blocks={transcript} />
            </>
          ) : (
            <div className="text-gray-400 py-8 text-center">載入中...</div>
          )}
        </div>

        {/* 頁尾場次導航 */}
        <SessionNav currentId={meta.id} />
      </main>
    </div>
  );
}
