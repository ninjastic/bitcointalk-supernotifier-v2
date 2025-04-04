import logger from '##/shared/services/logger';
import { AChatItem } from 'simplex-chat/dist/response';

export function hasNotificationMessageSent(msg: AChatItem) {
  const sent =
    msg?.chatItem.meta.itemId &&
    (msg?.chatItem.meta.itemStatus.type === 'sndSent' || msg?.chatItem.meta.itemStatus.type === 'sndNew');

  if (!sent) {
    logger.warn({ msg }, 'Notification message not sent');
  }

  return sent;
}
