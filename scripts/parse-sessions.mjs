/**
 * parse-sessions.mjs
 *
 * 把 corrected/ 目錄的 15 場 markdown 拆成結構化資料：
 *   src/content/sessions/XX/meta.json
 *   src/content/sessions/XX/analysis.md
 *   src/content/sessions/XX/transcript.json
 *
 * 同時處理上下文依賴替換（軍院 → 本院/鈞院、蔣萬安 → 檢察官）。
 *
 * 用法：node scripts/parse-sessions.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CORRECTED_DIR = join(ROOT, 'corrected');
const CONTENT_DIR = join(ROOT, 'src', 'content', 'sessions');

const corrections = JSON.parse(
  readFileSync(join(__dirname, 'corrections.json'), 'utf-8')
);

// ─── 15 場基本資料（交接檔 §3.3 手動填入） ───

const SESSION_META = [
  { id: '01', date: '2025-12-15', timeOfDay: '上午', title: '檢察官論告：圖利罪', sideFocus: '檢方' },
  { id: '02', date: '2025-12-15', timeOfDay: '下午', title: '檢察官論告：收賄罪', sideFocus: '檢方' },
  { id: '03', date: '2025-12-16', timeOfDay: '上午', title: '檢察官論告：應曉薇', sideFocus: '檢方' },
  { id: '04', date: '2025-12-16', timeOfDay: '下午', title: '柯文哲辯護人答辯', sideFocus: '辯方' },
  { id: '05', date: '2025-12-17', timeOfDay: '上午', title: '柯文哲辯護人答辯（續）', sideFocus: '辯方' },
  { id: '06', date: '2025-12-17', timeOfDay: '下午', title: '沈慶京辯護人答辯（廖威志律師）', sideFocus: '辯方' },
  { id: '07', date: '2025-12-18', timeOfDay: '上午', title: '沈慶京辯護人答辯（蘇律師＋徐律師）', sideFocus: '辯方' },
  { id: '08', date: '2025-12-18', timeOfDay: '下午', title: '張志澄＋吳順民＋端木正辯護人答辯', sideFocus: '辯方' },
  { id: '09', date: '2025-12-19', timeOfDay: '上午', title: '檢察官圖利罪論告（彭＋黃＋邵）＋邵認罪＋彭認罪', sideFocus: '混合' },
  { id: '10', date: '2025-12-19', timeOfDay: '下午', title: '黃景茂辯護人答辯＋黃景茂本人答辯', sideFocus: '辯方' },
  { id: '11', date: '2025-12-22', timeOfDay: '上午', title: '檢察官論告：公益侵占＋背信', sideFocus: '檢方' },
  { id: '12', date: '2025-12-22', timeOfDay: '下午', title: '李文宗辯護人答辯＋李文娟辯護人答辯', sideFocus: '辯方' },
  { id: '13', date: '2025-12-23', timeOfDay: '上午', title: '柯文哲辯護人答辯（公益侵占＋背信）＋柯文哲本人答辯', sideFocus: '辯方' },
  { id: '14', date: '2025-12-24', timeOfDay: '上午', title: '應曉薇辯護人答辯', sideFocus: '辯方' },
  { id: '15', date: '2025-12-24', timeOfDay: '下午', title: '289條再辯論（全員最後攻防）', sideFocus: '混合' },
];

// ─── 講者行辨識正則 ───

// 匹配行首的 **講者名** \[時間戳\] 格式
// markdown 中 \[ 是 escaped bracket，原始文字為反斜線+[
// 時間戳格式：MM:SS（分鐘可 1-3 位）或 H:MM:SS
const SPEAKER_LINE_RE = /^\*\*(.+?)\*\*\s*\\?\[(\d{1,3}:\d{2}(?::\d{2})?)\\?\]/;

// 中間時間戳（獨立一行）
const INLINE_TIMESTAMP_RE = /^\\?\[(\d{1,3}:\d{2}(?::\d{2})?)\\?\]\s*$/;

// 分隔線
const SEPARATOR_RE = /^---\s*$/;

// ─── 時間戳轉秒數 ───

function timestampToSeconds(ts) {
  const parts = ts.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

// ─── speakerRole 對照（交接檔 §3.5） ───

// 已知被告名單（講者標記中直接寫人名時使用）
const KNOWN_DEFENDANTS = new Set([
  '柯文哲', '沈慶京', '應曉薇', '彭振聲', '黃景茂',
  '邵琇珮', '吳順民', '李文宗', '李文娟', '張志澄', '端木正',
]);

function getSpeakerRole(speaker) {
  if (speaker.includes('審判長') || speaker.includes('法官')) return 'judge';
  if (speaker.includes('檢察官')) return 'prosecutor';
  if (speaker.includes('被告')) return 'defendant';
  if (speaker.includes('辯護人') || speaker.includes('律師')) return 'defense';
  // 直接寫人名的被告
  if (KNOWN_DEFENDANTS.has(speaker)) return 'defendant';
  return 'other';
}

// ─── 切分邏輯（交接檔 §3.2） ───

function splitDocument(lines) {
  // 1. 找第一個講者行（**審判長** \[時間戳\]）
  let transcriptStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(SPEAKER_LINE_RE);
    if (m && m[1].includes('審判長')) {
      transcriptStart = i;
      break;
    }
  }

  if (transcriptStart === -1) {
    throw new Error('找不到逐字稿起點（第一個 **審判長** 行）');
  }

  // 2. 從 transcriptStart 往上找最近的 ## 標題行
  let noticeStart = transcriptStart;
  for (let i = transcriptStart - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.match(/^#{1,3}\s.*逐字稿/) || line.match(/^#{1,3}\s.*技術說明/)) {
      noticeStart = i;
      break;
    }
  }

  // 如果往上沒找到逐字稿相關標題，再往上找最近的 --- 分隔線
  if (noticeStart === transcriptStart) {
    for (let i = transcriptStart - 1; i >= 0; i--) {
      if (SEPARATOR_RE.test(lines[i].trim())) {
        // 再往上找 ## 標題
        for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
          if (lines[j].trim().startsWith('##')) {
            noticeStart = j;
            break;
          }
        }
        if (noticeStart === transcriptStart) {
          noticeStart = i;
        }
        break;
      }
    }
  }

  // 3. transcriptNotice：noticeStart 到 transcriptStart - 1
  const noticeLines = lines.slice(noticeStart, transcriptStart);
  // 清理：去掉前後空行和分隔線
  const transcriptNotice = noticeLines
    .join('\n')
    .replace(/^[\s\n]*---[\s\n]*/, '')
    .replace(/[\s\n]*---[\s\n]*$/, '')
    .trim();

  // 4. 分析區：第 1 行到 noticeStart - 1
  const analysisLines = lines.slice(0, noticeStart);
  // 去掉尾部空行和分隔線
  let analysisEnd = analysisLines.length;
  while (analysisEnd > 0 && (analysisLines[analysisEnd - 1].trim() === '' || analysisLines[analysisEnd - 1].trim() === '---')) {
    analysisEnd--;
  }
  const analysisText = analysisLines.slice(0, analysisEnd).join('\n').trim();

  // 5. 逐字稿區：transcriptStart 到結尾
  const transcriptLines = lines.slice(transcriptStart);

  return { analysisText, transcriptNotice, transcriptLines, transcriptStart };
}

// ─── 提取分析區章節標題（交接檔 §3.4） ───

function extractAnalysisSections(analysisText) {
  const sections = [];
  for (const line of analysisText.split('\n')) {
    const m = line.match(/^(#{2,3})\s+(.+)/);
    if (m) {
      const title = m[2]
        .replace(/\*\*/g, '')  // 去粗體
        .replace(/\*/g, '')
        .trim();
      sections.push({
        level: m[1].length,
        title,
      });
    }
  }
  return sections;
}

// ─── 解析逐字稿區 → TranscriptBlock[]（交接檔 §3.5） ───

function parseTranscript(transcriptLines, sessionId) {
  const blocks = [];
  let currentBlock = null;
  let pendingSectionBreak = false;
  let blockCounter = 0;
  const contentBuffer = [];

  function flushBlock() {
    if (currentBlock) {
      currentBlock.text = contentBuffer.join('\n').trim();
      blocks.push(currentBlock);
      contentBuffer.length = 0;
    }
  }

  for (const line of transcriptLines) {
    const trimmed = line.trim();

    // 分隔線
    if (SEPARATOR_RE.test(trimmed)) {
      pendingSectionBreak = true;
      continue;
    }

    // 講者行（新 block）
    const speakerMatch = trimmed.match(SPEAKER_LINE_RE);
    if (speakerMatch) {
      flushBlock();

      blockCounter++;
      const speaker = speakerMatch[1];
      const timestamp = speakerMatch[2];

      currentBlock = {
        id: `${sessionId}-${String(blockCounter).padStart(3, '0')}`,
        timestamp,
        timestampSeconds: timestampToSeconds(timestamp),
        speaker,
        speakerRole: getSpeakerRole(speaker),
        text: '',
        isSectionBreak: pendingSectionBreak,
      };
      pendingSectionBreak = false;
      continue;
    }

    // 內容行（包含中間時間戳，保留在 text 中，方式 A）
    if (currentBlock) {
      // 跳過空行堆疊（只保留一個）
      if (trimmed === '' && contentBuffer.length > 0 && contentBuffer[contentBuffer.length - 1] === '') {
        continue;
      }
      contentBuffer.push(line);
    }
  }

  // flush 最後一個 block
  flushBlock();

  return blocks;
}

// ─── 上下文依賴替換 ───

function applyContextDependentCorrections(blocks) {
  let stats = {};

  for (const block of blocks) {
    // 1. 軍院 → 本院/鈞院
    const junYuanRule = corrections.context_dependent.find(
      c => c.correct_judge
    );
    if (junYuanRule) {
      for (const variant of junYuanRule.wrong_variants) {
        const re = new RegExp(variant, 'g');
        const matches = block.text.match(re);
        if (matches) {
          const replacement = block.speakerRole === 'judge'
            ? junYuanRule.correct_judge
            : junYuanRule.correct_other;
          block.text = block.text.replace(re, replacement);

          const key = `${variant}→${replacement}`;
          stats[key] = (stats[key] || 0) + matches.length;
        }
      }
    }

    // 2. 蔣萬安 → 檢察官（僅在逐字稿區，需上下文判斷）
    const jwaRule = corrections.context_dependent.find(
      c => c.context_rule && c.context_rule.includes('蔣萬安')
    );
    if (jwaRule) {
      for (const variant of jwaRule.wrong_variants) {
        if (block.text.includes(variant)) {
          // 上下文判斷：如果整段在討論市府政策、市長施政，則「蔣萬安」是真名
          // 如果上下文是法庭程序中稱呼對方（如「請蔣萬安論告」），則是 STT 錯誤
          //
          // 啟發式規則：
          // - 講者是法官且提到「蔣萬安」→ 很可能是 STT 把「檢察官」聽錯
          // - 講者是被告/辯護人，且上下文提到「市府」「停工」「市長」→ 可能是真名
          // - 段落中同時出現「市府」「市長」「台北市」→ 傾向真名
          const textAround = block.text;
          const hasMayorContext = /市府|市長|台北市|停工|蔣/.test(textAround);
          const isCourtProcedure = block.speakerRole === 'judge';

          // 保守策略：只在法官發言中替換，其他保留不動
          if (isCourtProcedure && !hasMayorContext) {
            block.text = block.text.replace(new RegExp(variant, 'g'), jwaRule.correct);
            const key = `${variant}→${jwaRule.correct}（法官發言）`;
            stats[key] = (stats[key] || 0) + 1;
          } else {
            const key = `${variant}→保留（上下文為市長）`;
            stats[key] = (stats[key] || 0) + 1;
          }
        }
      }
    }
  }

  return stats;
}

// ─── 主流程 ───

const files = readdirSync(CORRECTED_DIR)
  .filter(f => f.endsWith('.md'))
  .sort();

console.log(`處理 ${files.length} 場逐字稿\n`);

for (const file of files) {
  const sessionMatch = file.match(/第(\d{2})場/);
  if (!sessionMatch) {
    console.log(`跳過：${file}（無法辨識場次編號）`);
    continue;
  }
  const sessionId = sessionMatch[1];
  const sessionOrder = parseInt(sessionId, 10);
  const metaTemplate = SESSION_META.find(m => m.id === sessionId);

  if (!metaTemplate) {
    console.log(`跳過：第${sessionId}場（無對應基本資料）`);
    continue;
  }

  const text = readFileSync(join(CORRECTED_DIR, file), 'utf-8');
  const lines = text.split('\n');

  // ─── 切分 ───
  let splitResult;
  try {
    splitResult = splitDocument(lines);
  } catch (e) {
    console.error(`  ✗ ${e.message}`);
    // 除錯：印出前幾個匹配 ** 的行
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('**') && lines[i].includes('[')) {
        console.error(`    行 ${i + 1}: ${lines[i].substring(0, 80)}`);
        break;
      }
    }
    continue;
  }
  const { analysisText, transcriptNotice, transcriptLines } = splitResult;

  // ─── 從第 3 行提取實際主題（交接檔 §3.3） ───
  let actualTitle = metaTemplate.title;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const m = lines[i].match(/^###\s+(.+)/);
    if (m) {
      actualTitle = m[1].replace(/\*\*/g, '').trim();
      break;
    }
  }

  // ─── 解析逐字稿 ───
  const blocks = parseTranscript(transcriptLines, sessionId);

  // ─── 上下文依賴替換 ───
  const ctxStats = applyContextDependentCorrections(blocks);

  // ─── 分析區章節標題 ───
  const analysisSections = extractAnalysisSections(analysisText);

  // ─── 寫出結構化資料 ───
  const sessionDir = join(CONTENT_DIR, sessionId);
  mkdirSync(sessionDir, { recursive: true });

  // meta.json
  const meta = {
    id: sessionId,
    order: sessionOrder,
    date: metaTemplate.date,
    timeOfDay: metaTemplate.timeOfDay,
    title: actualTitle,
    sideFocus: metaTemplate.sideFocus,
    status: {
      analysis: true,
      transcript: true,
      graph: false,
    },
    transcriptNotice,
    analysisSections,
  };
  writeFileSync(join(sessionDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');

  // analysis.md
  writeFileSync(join(sessionDir, 'analysis.md'), analysisText + '\n', 'utf-8');

  // transcript.json
  writeFileSync(join(sessionDir, 'transcript.json'), JSON.stringify(blocks, null, 2), 'utf-8');

  // ─── 報告 ───
  console.log(`第${sessionId}場：分析區 ${analysisSections.length} 個章節標題，逐字稿 ${blocks.length} 個段落`);

  if (Object.keys(ctxStats).length > 0) {
    for (const [key, count] of Object.entries(ctxStats)) {
      console.log(`  上下文替換：${key} × ${count}`);
    }
  }

  // 驗證：每個 block 都有 speaker 和 text
  const emptyBlocks = blocks.filter(b => !b.text);
  if (emptyBlocks.length > 0) {
    console.log(`  ⚠ ${emptyBlocks.length} 個空內容段落：${emptyBlocks.map(b => b.id).join(', ')}`);
  }
}

console.log(`\n結構化資料已寫入 ${CONTENT_DIR}/`);
