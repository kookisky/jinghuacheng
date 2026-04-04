export type SpeakerRole = 'judge' | 'prosecutor' | 'defense' | 'defendant' | 'other';

export interface TranscriptBlock {
  id: string;
  timestamp: string;
  timestampSeconds: number;
  speaker: string;
  speakerRole: SpeakerRole;
  text: string;
  isSectionBreak: boolean;
}

export interface AnalysisSection {
  level: number;
  title: string;
}

export interface SessionMeta {
  id: string;
  order: number;
  date: string;
  timeOfDay: '上午' | '下午';
  title: string;
  sideFocus: '檢方' | '辯方' | '混合' | '程序';
  status: {
    analysis: boolean;
    transcript: boolean;
    graph: boolean;
  };
  transcriptNotice: string;
  analysisSections: AnalysisSection[];
}

export interface SessionStage {
  label: string;
  sessions: string[];
}

export const SESSION_STAGES: SessionStage[] = [
  { label: '第一階段：檢方蓋樓', sessions: ['01', '02', '03'] },
  { label: '第二階段：辯方反擊', sessions: ['04', '05', '06', '07'] },
  { label: '第三階段：拉鋸與轉折', sessions: ['08', '09', '10', '11', '12', '13'] },
  { label: '第四階段：最終收束', sessions: ['14', '15'] },
];
