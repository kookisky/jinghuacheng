import type { TranscriptBlock } from '../../lib/types';
import TranscriptBlockComponent from './TranscriptBlock';

interface Props {
  blocks: TranscriptBlock[];
}

export default function TranscriptView({ blocks }: Props) {
  return (
    <div className="space-y-0">
      {blocks.map((block) => (
        <TranscriptBlockComponent key={block.id} block={block} />
      ))}
    </div>
  );
}
