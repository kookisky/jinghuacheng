import type { SpeakerRole } from './types';

export const speakerColors: Record<SpeakerRole, { border: string; bg: string; text: string }> = {
  judge:      { border: 'border-gray-400',   bg: 'bg-gray-50',    text: 'text-gray-600' },
  prosecutor: { border: 'border-blue-400',   bg: 'bg-blue-50',    text: 'text-blue-700' },
  defense:    { border: 'border-amber-400',  bg: 'bg-amber-50',   text: 'text-amber-700' },
  defendant:  { border: 'border-red-400',    bg: 'bg-red-50',     text: 'text-red-700' },
  other:      { border: 'border-gray-300',   bg: 'bg-gray-50',    text: 'text-gray-500' },
};

export const speakerRoleLabel: Record<SpeakerRole, string> = {
  judge: '法官',
  prosecutor: '檢察官',
  defense: '辯護人',
  defendant: '被告',
  other: '其他',
};
