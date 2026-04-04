/**
 * parse-corrections.mjs
 *
 * 從校正總表、第14場補充、通盤分析黃金名單，產出 corrections.json。
 *
 * 用法：node scripts/parse-corrections.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── 讀取來源檔案 ───

const correctionTableMd = readFileSync(
  join(ROOT, '京華城案_人名地名校正總表_v3_6.md'), 'utf-8'
);
const session14Md = readFileSync(
  join(ROOT, '京華城案_第14場_人名校正筆記.md'), 'utf-8'
);
const overviewMd = readFileSync(
  join(ROOT, '京華城案_通盤分析.md'), 'utf-8'
);

// ─── 1. 從通盤分析提取黃金名單 ───
// 通盤分析中出現的人名都經過人工確認，是最高優先級

function extractGoldenNames(text) {
  // 交接檔 §2.0 列出的核心人名
  const knownNames = [
    '柯文哲', '沈慶京', '應曉薇', '彭振聲', '黃景茂', '邵琇珮',
    '吳順民', '李文宗', '李文娟', '張志澄', '端木正', '廖彥鈞',
    '林俊言', '鄭深元', '蘇正文', '廖威志', '唐于智', '李傳侯',
    '陸正義', '蕭奕弘', '謝律師', '許英傑', '林欽榮', '林洲民',
    '朱亞虎', '陳佳敏', '林青', '苗博雅', '王尊侃', '周榆修',
    '邱復生', '王令麟', '蔡壁如', '黃珊珊', '劉秀琳', '林芝羽',
    '楊智勝', '白仁德', '范有偉', '許芷瑜', '蔣萬安',
    '江貞諭', '陳士立', '姜長志', '岳芳如', '陳俊源',
    '沈慶光', '張高祥', '邱佩琳', '謝國樑', '蔡明興',
    '李德全', '張立立', '張家偉', '黃書學', '徐國城',
    '陳志銘', '何芳梓', '胡芳瓊', '郭泰琪', '嚴邦瑞',
    '孫丁君', '周王美文', '周俊吉', '林命群', '練鴻慶',
    '李婉萱', '余孟林', '謝博宏', '顧林飛', '黃瀞瑩',
    '何艾婷', '陳雅玲', '洪秀鳳', '劉子安', '黃書文',
    '童宗白', '吳欣盈', '王俊力', '黃澎孝', '王炳忠',
    '陳歐珀', '曾安慈', '黃育平', '潘一如', '蔡立睿',
    '陳春銅', '薛兆信', '陳家駿', '黃采生',
    '梁秀菊', '廖奕辰', '戴玉文', '林寶成',
    '木可公司', '眾望基金會', '京華城', '威京集團',
    '京華廣場', '廉政署', '采風情資分析公司', '木可好店',
  ];

  const goldenSet = new Set();

  // 先加入所有已知名字（只要在通盤分析中出現就加入）
  for (const name of knownNames) {
    if (text.includes(name)) {
      goldenSet.add(name);
    }
  }

  return goldenSet;
}

const goldenNames = extractGoldenNames(overviewMd);
console.log(`通盤分析黃金名單：${goldenNames.size} 個名稱`);

// ─── 2. 解析校正總表 ───

/**
 * 解析 markdown 表格，提取校正對照。
 * 支援不同表格結構（有的有「身份」欄、有的有「備註」欄等）。
 */
function parseCorrectionsFromTable(markdown) {
  const corrections = [];
  const lines = markdown.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // 偵測表格標頭行（包含「正確名稱」或「正確」欄位）
    if (line.startsWith('|') && (line.includes('正確名稱') || line.includes('正確 '))) {
      // 解析標頭欄位
      const headers = line.split('|').map(h => h.trim()).filter(Boolean);
      const correctIdx = headers.findIndex(h => h === '正確名稱' || h === '正確');

      // 找 STT 錯誤欄位（可能叫不同名稱）
      const sttIdx = headers.findIndex(h =>
        h.includes('STT常見錯誤') || h.includes('STT錯誤') ||
        h.includes('舊版/STT寫法') || h.includes('舊版寫法') ||
        h.includes('新增STT錯誤')
      );

      if (correctIdx === -1 || sttIdx === -1) {
        i++;
        continue;
      }

      // 跳過分隔線（|---|---|---| 格式）
      i++;
      if (i < lines.length && lines[i].trim().match(/^\|[\s\-|]+\|$/)) {
        i++;
      }

      // 解析資料行
      while (i < lines.length) {
        const dataLine = lines[i].trim();
        if (!dataLine.startsWith('|')) break;

        const cells = dataLine.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length <= Math.max(correctIdx, sttIdx)) {
          i++;
          continue;
        }

        const correctRaw = cells[correctIdx];
        const sttRaw = cells[sttIdx];

        // 跳過規則（交接檔 §2.2）
        const shouldSkip =
          sttRaw === '—' ||
          sttRaw === '（大致正確）' ||
          sttRaw === '（待確認STT錯誤）' ||
          sttRaw === '—' ||  // em dash
          correctRaw.includes('（待確認）') ||
          correctRaw.includes('待確認全名') ||
          !sttRaw ||
          sttRaw === '—';

        if (shouldSkip) {
          i++;
          continue;
        }

        // 提取正確名稱（去除可能的 emoji、備註標記）
        let correct = correctRaw.replace(/⚠️\s*/g, '').trim();

        // 先清掉括號備註（括號內可能有逗號，必須在分割前處理）
        const sttCleaned = sttRaw
          .replace(/（[^）]*）/g, '')   // 中文括號備註
          .replace(/\([^)]*\)/g, '')    // 英文括號備註
          .replace(/⚠️\s*/g, '')        // emoji 標記

        // 提取錯誤變體（頓號或逗號分隔）
        const cleanedVariants = sttCleaned
          .split(/[、,，]/)
          .map(v => v.trim())
          .filter(v => v && v !== '—' && v !== '—' && v.length > 0);

        if (cleanedVariants.length > 0) {
          corrections.push({
            correct,
            wrong_variants: cleanedVariants,
          });
        }

        i++;
      }
    } else {
      i++;
    }
  }

  return corrections;
}

const tableCorrections = parseCorrectionsFromTable(correctionTableMd);
console.log(`校正總表提取：${tableCorrections.length} 組校正對照`);

// ─── 3. 解析第14場補充 ───

const session14Corrections = parseCorrectionsFromTable(session14Md);
console.log(`第14場補充提取：${session14Corrections.length} 組校正對照`);

// ─── 4. 合併校正對照，處理優先級 ───

// 建立一個 Map：correct → Set<wrong_variants>
const mergedMap = new Map();

function addCorrection(correct, variants, isGolden = false) {
  // 「本院／鈞院」是上下文依賴替換，特殊處理
  if (correct.includes('本院') && correct.includes('鈞院')) {
    if (!mergedMap.has('__context_dependent__')) {
      mergedMap.set('__context_dependent__', []);
    }
    mergedMap.get('__context_dependent__').push({
      correct_judge: '本院',
      correct_other: '鈞院',
      wrong_variants: variants,
    });
    return;
  }

  if (!mergedMap.has(correct)) {
    mergedMap.set(correct, { variants: new Set(), isGolden });
  }
  const entry = mergedMap.get(correct);
  if (isGolden) entry.isGolden = true;
  for (const v of variants) {
    entry.variants.add(v);
  }
}

// 先加校正總表
for (const c of tableCorrections) {
  const isGolden = goldenNames.has(c.correct);
  addCorrection(c.correct, c.wrong_variants, isGolden);
}

// 再加第14場補充（同名條目的變體會合併）
for (const c of session14Corrections) {
  const isGolden = goldenNames.has(c.correct);
  addCorrection(c.correct, c.wrong_variants, isGolden);
}

// ─── 5. 處理特殊的「檢察官」系統性錯誤 ───
// 校正總表 §13「檢察官」的 STT 錯誤在一般表格中，需確認已被解析

// ─── 6. 產出 corrections.json ───

const output = {
  _meta: {
    generated: new Date().toISOString(),
    sources: [
      '京華城案_人名地名校正總表_v3_6.md',
      '京華城案_第14場_人名校正筆記.md',
      '京華城案_通盤分析.md（黃金名單）',
    ],
    goldenNameCount: goldenNames.size,
    totalCorrections: 0,
  },
  context_dependent: [],
  corrections: [],
};

// 上下文依賴替換
if (mergedMap.has('__context_dependent__')) {
  output.context_dependent = mergedMap.get('__context_dependent__');
  mergedMap.delete('__context_dependent__');
}

// 一般替換
for (const [correct, { variants, isGolden }] of mergedMap) {
  const variantArray = [...variants];
  // 長詞優先排序
  variantArray.sort((a, b) => b.length - a.length);

  output.corrections.push({
    correct,
    wrong_variants: variantArray,
    confirmed_by_overview: isGolden,
  });
}

// ─── 將「蔣萬安→檢察���」移到上下文依賴替換 ───
// 「蔣萬安」是真實人名（台北市長），但也是「檢察官」的 STT 錯誤變體。
// 分析區（人工寫的）裡的「蔣萬安」一定是真的，不能動。
// 逐字稿區裡需要根據上下文判斷：如果上下文在討論市府政策、停工令等，是真名；
// 如果上下文是法庭發言中稱呼對方，則可能是 STT 把「檢察官」聽成「蔣萬安」。
// → 延後到 parse-sessions 拆出逐字稿區後，再逐段判斷。
const contextDependentVariants = { '蔣萬安': '檢察官' };

for (const entry of output.corrections) {
  const moved = [];
  entry.wrong_variants = entry.wrong_variants.filter(v => {
    if (contextDependentVariants[v]) {
      moved.push(v);
      return false;
    }
    return true;
  });
  for (const v of moved) {
    output.context_dependent.push({
      correct: contextDependentVariants[v],
      wrong_variants: [v],
      context_rule: 'transcript_only_with_context_check：僅在逐字稿區替換，且需確認上下文不是真的在講蔣萬安市長。分析區不動。',
    });
  }
}
output.corrections = output.corrections.filter(c => c.wrong_variants.length > 0);

// ─── 手動補充校正（校正總表未收錄的 STT 錯誤） ───
const manualCorrections = [
  { correct: '甲章', wrong_variants: ['假章'] },
];
for (const mc of manualCorrections) {
  output.corrections.push({
    correct: mc.correct,
    wrong_variants: mc.wrong_variants,
    confirmed_by_overview: false,
  });
}

// ─── 去重：合併相同變體指向不同正確名稱的情況 ───
// 「競選辦公室/競辦」和「競辦」合併為「競辦」（較短的通用形式）
// 「采��情資分析公司」和「采風情資」保留全名，短名的獨有變體合併到全名
const mergeRules = [
  { remove: '競選辦公室/競辦', keepAs: '競辦' },
  { remove: '采風情資', mergeInto: '采風情資分析公司' },
];

for (const rule of mergeRules) {
  const removeIdx = output.corrections.findIndex(c => c.correct === rule.remove);
  if (removeIdx === -1) continue;

  if (rule.keepAs) {
    // 直接改名
    output.corrections[removeIdx].correct = rule.keepAs;
    // 移除跟另一個重複的條目
    const dupIdx = output.corrections.findIndex(
      (c, i) => i !== removeIdx && c.correct === rule.keepAs
    );
    if (dupIdx !== -1) {
      // 合併變體
      const keepEntry = output.corrections[dupIdx];
      const removeEntry = output.corrections[removeIdx];
      const allVariants = new Set([...keepEntry.wrong_variants, ...removeEntry.wrong_variants]);
      keepEntry.wrong_variants = [...allVariants].sort((a, b) => b.length - a.length);
      keepEntry.confirmed_by_overview = keepEntry.confirmed_by_overview || removeEntry.confirmed_by_overview;
      output.corrections.splice(removeIdx, 1);
    }
  } else if (rule.mergeInto) {
    const targetIdx = output.corrections.findIndex(c => c.correct === rule.mergeInto);
    if (targetIdx !== -1) {
      const target = output.corrections[targetIdx];
      const source = output.corrections[removeIdx];
      const allVariants = new Set([...target.wrong_variants, ...source.wrong_variants]);
      target.wrong_variants = [...allVariants].sort((a, b) => b.length - a.length);
      target.confirmed_by_overview = target.confirmed_by_overview || source.confirmed_by_overview;
      output.corrections.splice(removeIdx, 1);
    }
  }
}

// 按錯誤變體的最長長度排序（長詞優先，交接檔 §2.4）
output.corrections.sort((a, b) => {
  const maxA = Math.max(...a.wrong_variants.map(v => v.length));
  const maxB = Math.max(...b.wrong_variants.map(v => v.length));
  return maxB - maxA;
});

output._meta.totalCorrections = output.corrections.length;

const outputPath = join(__dirname, 'corrections.json');
writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

console.log(`\n產出 corrections.json：`);
console.log(`  一般替換：${output.corrections.length} 組`);
console.log(`  上下文依賴替換：${output.context_dependent.length} 組`);
console.log(`  黃金名單確認：${output.corrections.filter(c => c.confirmed_by_overview).length} 組`);

// ─── 7. 印出替換清單摘要 ───

console.log(`\n=== 替換清單摘要 ===\n`);
for (const c of output.corrections) {
  const tag = c.confirmed_by_overview ? '✓' : ' ';
  console.log(`[${tag}] ${c.correct} ← ${c.wrong_variants.join('、')}`);
}

if (output.context_dependent.length > 0) {
  console.log(`\n=== 上下文依賴替換 ===\n`);
  for (const c of output.context_dependent) {
    console.log(`法官→${c.correct_judge} / 其他→${c.correct_other} ← ${c.wrong_variants.join('、')}`);
  }
}
