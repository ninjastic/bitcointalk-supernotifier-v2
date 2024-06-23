import { container } from 'tsyringe';
import pluralize from 'pluralize';
import escape from 'escape-html';

import logger from '../../../../services/logger';

import bot from '../../index';

import Post from '../../../../../modules/posts/infra/typeorm/entities/Post';
import ModLog from '../../../../../modules/modlog/infra/typeorm/entities/ModLog';

import { checkBotNotificationError } from '../../../../services/utils';
import SetModLogNotifiedService from '../../../../../modules/modlog/services/SetModLogNotifiedService';

export default class SendRemovedTopicNotificationService {
  public async execute(telegram_id: string, posts: Post[], modLog: ModLog): Promise<boolean> {
    const setModLogNotified = container.resolve(SetModLogNotifiedService);

    let message = '';
    message += `🗑️ You had <b>${posts.length}</b> `;
    message += pluralize('post', posts.length);
    message += ` deleted because `;
    message += posts.length === 1 ? 'its' : 'their';
    message += ` parent topic got nuked.\n\n`;
    message += `<b>Archived Topic:</b> <a href="https://ninjastic.space/topic/${modLog.topic_id}">`;
    message += `${escape(modLog.title)}`;
    message += `</a>`;

    return bot.instance.api
      .sendMessage(telegram_id, message, { parse_mode: 'HTML' })
      .then(async () => {
        logger.info({ telegram_id, topic_id: modLog.topic_id, message }, 'Removed Topic notification was sent');
        await setModLogNotified.execute(modLog, telegram_id);
        return true;
      })
      .catch(async error => {
        await checkBotNotificationError(error, telegram_id, { topic_id: modLog.topic_id, message });
        return false;
      });
  }
}
