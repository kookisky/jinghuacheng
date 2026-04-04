export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">關於本站</h1>
      <div className="prose prose-gray max-w-none text-sm">
        <p>
          本站收錄京華城案 15 場言詞辯論的逐字稿與分析。逐字稿由法庭公開播送內容經 GPT-4o Transcribe
          語音轉文字後，再以 Claude Opus 進行語義校正（人名、法條、機關名稱、法庭用語等），最後經人工排版整理。
        </p>
        <p className="mt-3">
          整體信心度約 85-95%，依各場講者語速、法律術語密度而異。人名、地名、機構名稱已盡量校正，
          但仍可能有少數殘留誤差。
        </p>
        <p className="mt-3">
          正式引用、轉載或確認原意時，請以法院正式資料為準。
        </p>
      </div>
    </div>
  );
}
