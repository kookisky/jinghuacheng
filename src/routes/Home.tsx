import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">京華城案言詞辯論 15 場</h1>
      <p className="text-lg text-gray-600 mb-8">逐字稿與分析</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/overview"
          className="block p-6 rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow transition"
        >
          <h2 className="text-xl font-semibold mb-2">通盤分析</h2>
          <p className="text-gray-500 text-sm">15 場攻防的完整脈絡與結構性觀察</p>
        </Link>

        <Link
          to="/sessions"
          className="block p-6 rounded-lg border border-gray-200 hover:border-amber-400 hover:shadow transition"
        >
          <h2 className="text-xl font-semibold mb-2">15 場逐字稿</h2>
          <p className="text-gray-500 text-sm">每場的分析與完整逐字稿</p>
        </Link>
      </div>

      <footer className="mt-16 pt-8 border-t border-gray-200 text-xs text-gray-400 leading-relaxed">
        本站逐字稿由法庭公開播送內容進行語音轉文字後再整理修訂，非官方人工逐句校正版本，僅供分析與研究參考。正式引用、轉載或確認原意時，請以法院正式資料為準。
      </footer>
    </div>
  );
}
