import type { TranscriptBlock as TBlock } from '../../lib/types';
import { speakerColors } from '../../lib/speakerColors';

interface Props {
  block: TBlock;
}

// 把逐字稿文字中的中間時間戳渲染成灰色小字
function renderText(text: string) {
  // 匹配 \[MM:SS\] 或 \[H:MM:SS\] 格式的中間時間戳
  const parts = text.split(/(\\?\[\d{1,3}:\d{2}(?::\d{2})?\])/);
  return parts.map((part, i) => {
    if (part.match(/^\\?\[\d{1,3}:\d{2}(?::\d{2})?\]$/)) {
      const ts = part.replace(/\\?\[/, '').replace(/\\?\]/, '');
      return (
        <span key={i} className="text-xs text-gray-400 mx-1">
          [{ts}]
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function TranscriptBlockComponent({ block }: Props) {
  const colors = speakerColors[block.speakerRole];

  return (
    <div
      id={block.id}
      className={`border-l-4 ${colors.border} pl-4 py-3 ${block.isSectionBreak ? 'mt-8 pt-6 border-t border-gray-200' : ''}`}
    >
      <div className="flex items-baseline gap-2 mb-1">
        <span className={`text-sm font-bold ${colors.text}`}>
          {block.speaker}
        </span>
        <span className="text-xs text-gray-400">
          [{block.timestamp}]
        </span>
      </div>
      <div className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
        {renderText(block.text)}
      </div>
    </div>
  );
}
