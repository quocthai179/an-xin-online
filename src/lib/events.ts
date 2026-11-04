import type { StreetEvent } from '@/backend/types';

/** Plain-text ticker line; null for events that are not shown in the ticker. Never includes messages/contacts. */
export function formatTickerLine(e: StreetEvent): string | null {
  switch (e.type) {
    case 'gift': {
      if (e.kind === 'love') return `${e.giver.name} vừa thả xu tình thương cho ${e.candidate.name} 💛`;
      return `HR ${e.giver.name}${e.giver.company ? ` @ ${e.giver.company}` : ''} vừa thả xu cho ${e.candidate.name} 🪙`;
    }
    case 'invite':
      return `HR ${e.giver.name}${e.giver.company ? ` @ ${e.giver.company}` : ''} vừa thả tờ 500k cho ${e.candidate.name} 💸`;
    case 'offer':
      return `HR ${e.giver.name}${e.giver.company ? ` @ ${e.giver.company}` : ''} vừa BAO TRỌN ${e.candidate.name} 🎉`;
    case 'placed':
      return `${e.candidate.displayName} vừa được bao${e.company ? ` bởi ${e.company}` : ''}! 🎊`;
    case 'incense':
      return `${e.name} vừa thắp nhang cầu job 🪔`;
    default:
      return null;
  }
}
