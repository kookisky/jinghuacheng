/**
 * apply-corrections.mjs
 *
 * 用 corrections.json 對 raw/ 目錄的 15 場 markdown 跑批次人名校正。
 * 校正後的版本寫入 corrected/ 目錄，原檔不動。
 *
 * 上下文依賴替換（軍院 → 本院/鈞院）不在此步驟處理，
 * 需等 parse-sessions 拆出講者角色後才能執行。
 *
 * 用法：node scripts/apply-corrections.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RAW_DIR = join(ROOT, 'raw');
const CORRECTED_DIR = join(ROOT, 'corrected');

// ─── 載入校正對照表 ───

const corrections = JSON.parse(
  readFileSync(join(__dirname, 'corrections.json'), 'utf-8')
);

// ─── 建立所有已知正確名稱集合（用於全詞匹配保護） ───

const allCorrectNames = new Set(
  corrections.corrections.map(c => c.correct)
);

// ─── 全詞匹配邏輯（§2.4） ───

/**
 * 建立替換用正則表達式。
 *
 * 對於中文人名，需要避免子字串匹配：
 * - 「林青」不應該把「林青榮」裡的「林青」換掉
 * - 實作：檢查替換目標前後是否為標點、空格、字串邊界
 *   對 2 字人名額外檢查：前後字不會構成其他已知人名
 */
function buildPattern(variant, correct) {
  // 轉義正則特殊字元
  const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 中文字元判斷
  const isChinese = /^[\u4e00-\u9fff]+$/.test(variant);

  if (!isChinese) {
    // 非純中文（如 Mucca好店）：直接匹配
    return new RegExp(escaped, 'g');
  }

  // 只對 2 字中文人名做嚴格邊界檢查（防止「林青」誤改「林青榮」中的��字串）
  // 2 字中文不用正則邊界限制，改由 replace callback 中逐次檢查是否會破壞更長的已知名稱
  return new RegExp(escaped, 'g');
}

// ─── 替換執行 ───

function applyCorrections(text, filename) {
  let result = text;
  const report = {};  // { correctName: { variant: count } }

  // corrections.json 已按長詞優先排序
  for (const entry of corrections.corrections) {
    const { correct, wrong_variants } = entry;

    for (const variant of wrong_variants) {
      const pattern = buildPattern(variant, correct);
      let count = 0;

      result = result.replace(pattern, (match, offset, str) => {
        // 額外保護：對 2 字中文變體，檢查替換後不會破壞已存在的正確名稱
        if (variant.length === 2 && /^[\u4e00-\u9fff]+$/.test(variant)) {
          // 檢查前一字 + correct 或 correct + 後一字是否構成已知名稱
          const before = offset > 0 ? str[offset - 1] : '';
          const after = offset + match.length < str.length ? str[offset + match.length] : '';

          // 如果前後字跟替換結果組合出另一個已知名稱，跳過
          for (const knownName of allCorrectNames) {
            if (knownName.length > correct.length) {
              if (knownName.includes(correct) && (
                (before && knownName === before + correct) ||
                (after && knownName === correct + after) ||
                (before && after && knownName === before + correct + after)
              )) {
                return match; // 不替換
              }
            }
          }
        }

        count++;
        return correct;
      });

      if (count > 0) {
        if (!report[correct]) report[correct] = {};
        report[correct][variant] = (report[correct][variant] || 0) + count;
      }
    }
  }

  return { result, report };
}

// ─── 掃描 raw/ 目錄，對每場 markdown 執行替換 ───

mkdirSync(CORRECTED_DIR, { recursive: true });

const files = readdirSync(RAW_DIR)
  .filter(f => f.endsWith('.md'))
  .sort();

console.log(`找到 ${files.length} 個 markdown 檔案\n`);

let totalReplacements = 0;
const allReports = [];

// 收集上下文依賴替換的統計（不實際替換）
const contextDependentStats = {};

for (const file of files) {
  const inputPath = join(RAW_DIR, file);
  const outputPath = join(CORRECTED_DIR, file);
  const text = readFileSync(inputPath, 'utf-8');

  // 統計上下文依賴的「軍院」出現次數（不替換）
  for (const cd of corrections.context_dependent) {
    for (const variant of cd.wrong_variants) {
      const matches = text.match(new RegExp(variant, 'g'));
      if (matches) {
        if (!contextDependentStats[file]) contextDependentStats[file] = {};
        contextDependentStats[file][variant] = matches.length;
      }
    }
  }

  // 執行一般替換
  const { result, report } = applyCorrections(text, file);

  // 冪等性驗證：再跑一次不應改變
  const { result: result2 } = applyCorrections(result, file);
  if (result !== result2) {
    console.error(`⚠ 冪等性失敗：${file}`);
  }

  writeFileSync(outputPath, result, 'utf-8');

  // 產出報告
  const sessionMatch = file.match(/第(\d{2})場/);
  const sessionId = sessionMatch ? sessionMatch[1] : file;

  let sessionTotal = 0;
  const reportLines = [];

  for (const [correct, variants] of Object.entries(report)) {
    const parts = Object.entries(variants)
      .map(([v, count]) => `${v}(${count})`)
      .join('、');
    const subtotal = Object.values(variants).reduce((a, b) => a + b, 0);
    sessionTotal += subtotal;
    reportLines.push(`  ${correct}：${parts}`);
  }

  totalReplacements += sessionTotal;

  const cdLines = [];
  if (contextDependentStats[file]) {
    for (const [v, count] of Object.entries(contextDependentStats[file])) {
      cdLines.push(`  未替換（上下文依賴）：${v}(${count}) → 需 parse 後處理`);
    }
  }

  allReports.push({
    sessionId,
    file,
    total: sessionTotal,
    lines: reportLines,
    cdLines,
  });

  console.log(`第${sessionId}場：共替換 ${sessionTotal} 處`);
  for (const line of reportLines) console.log(line);
  for (const line of cdLines) console.log(line);
  console.log('');
}

console.log(`\n${'='.repeat(50)}`);
console.log(`全部 ${files.length} 場合計：替換 ${totalReplacements} 處`);
console.log(`校正後檔案已寫入 ${CORRECTED_DIR}/`);

// ─── 寫出完整報告 ───

const reportText = allReports.map(r => {
  const lines = [`第${r.sessionId}場：共替換 ${r.total} 處`, ...r.lines, ...r.cdLines];
  return lines.join('\n');
}).join('\n\n');

const fullReport = `# 人名校正替換報告\n\n產生時間：${new Date().toISOString()}\n全 ${files.length} 場合計：${totalReplacements} 處替換\n\n---\n\n${reportText}\n`;

writeFileSync(join(__dirname, 'correction-report.md'), fullReport, 'utf-8');
console.log(`\n替換報告已寫入 scripts/correction-report.md`);
