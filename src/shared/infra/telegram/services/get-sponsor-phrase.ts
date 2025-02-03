import { sponsorTexts } from '##/config/sponsor';

const userNextSponsorMap = new Map();

export default function getSponsorPhrase(telegramId: string) {
  const sponsorIndex = userNextSponsorMap.get(telegramId) || 0;
  userNextSponsorMap.set(telegramId, sponsorIndex + 1);

  return sponsorTexts[sponsorIndex % sponsorTexts.length];
}
