# CLAUDE.md

## 專案概述

京華城案言詞辯論 15 場逐字稿與分析的靜態閱讀網站。
部署目標：GitHub Pages。
技術棧：React + Vite + TypeScript + Tailwind CSS + React Router (hash mode)。

## 關鍵文件

- `京華城案_網站專案_Claude_Code_交接檔.md`：完整開發規格，包含 parser 邏輯、校正流程、前端架構、開工順序。**開工前先讀完。**
- `jinghuacheng-site-architecture-plan.md`：資訊架構與頁面設計規劃。頁面應該長什麼樣、路由怎麼分、閱讀模式怎麼設計，看這份。
- `京華城案_通盤分析.md`：通盤分析正文，已完稿。
- `京華城案_人名地名校正總表_v3_6.md`：人名地名 STT 錯誤對照表。
- `京華城案_第14場_人名校正筆記.md`：第 14 場補充校正。

## 語言與格式

- 所有使用者可見的文字輸出（UI 文字、commit message 說明、README、註解）一律使用**繁體中文**。禁止輸出簡體中文。
- 程式碼中的變數名、函式名、檔案名使用英文。
- commit message 格式：`feat: 新增逐字稿 parser` / `fix: 修正第07場講者標記解析` / `chore: 更新部署設定`。類型標籤用英文，說明用繁體中文。

## 工作方式

- **先討論再動手**：遇到交接檔沒覆蓋到的設計決策，先停下來問，不要自己猜。
- **不要一次做太多**：按交接檔第 7 節的開工順序走。每完成一個步驟，確認結果正確後再進下一步。
- **parser 寫好先跑測試**：用已有的 5 場樣本（01、07、09、12、15）驗證，確認 parse 結果正確後再跑全部 15 場。其餘 10 場可能有新的格式差異，遇到就記錄並回報。
- **校正替換不要覆蓋原檔**：原始 markdown 保持不動，替換結果寫入 `corrected/` 目錄。
- **不要自動生成假資料**：所有內容（通盤分析、15 場逐字稿與分析）都已到位，不需要編造任何內容。

## 命名慣例

- 場次目錄：`sessions/01/` ~ `sessions/15/`（兩位數補零）
- 元件檔案：PascalCase（`TranscriptBlock.tsx`）
- 工具函式：camelCase（`parseTimestamp.ts`）
- CSS class：Tailwind utility，不另寫自訂 CSS（除非 Tailwind 無法覆蓋的情況）
- 型別定義集中在 `src/lib/types.ts`

## 禁止事項

- 不要用 localStorage 或 sessionStorage（GitHub Pages 環境不可靠）
- 不要在前端 bundle 中打包全部 15 場 transcript.json，每場必須 lazy load
- 不要用 `dangerouslySetInnerHTML` render markdown，用 react-markdown
- 不要在頁面標題中使用「官方」「法院逐字稿」等字眼
- 不要用「大陸」稱呼中國
- 不要在 UI 中顯示使用者個人資訊

## 部署注意

- GitHub Pages project site 需要在 `vite.config.ts` 設定 `base` 路徑（repo 名稱）
- 使用 hash router（`createHashRouter`），不要用 browser router
- GitHub Actions 部署流程見交接檔 §4.9
