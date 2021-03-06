import { container } from 'tsyringe';
import pluralize from 'pluralize';
import escape from 'escape-html';

import logger from '../../../services/logger';

import bot from '../index';

import Post from '../../../../modules/posts/infra/typeorm/entities/Post';
import ModLog from '../../../../modules/modlog/infra/typeorm/entities/ModLog';

import SetModLogNotifiedService from '../../../../modules/modlog/services/SetModLogNotifiedService';
import SetUserBlockedService from './SetUserBlockedService';

export default class SendRemovedTopicNotificationService {
  public async execute(
    telegram_id: number,
    posts: Post[],
    modLog: ModLog,
  ): Promise<void> {
    const setModLogNotified = container.resolve(SetModLogNotifiedService);
    const setUserBlocked = container.resolve(SetUserBlockedService);

    let message = '';
    message += `You had <b>${posts.length}</b> `;
    message += pluralize('post', posts.length);
    message += ` deleted because `;
    message += posts.length === 1 ? 'its' : 'their';
    message += ` parent topic got nuked.\n\n`;
    message += `<b>Archived Topic:</b> <a href="https://ninjastic.space/topic/${modLog.topic_id}">`;
    message += `${escape(modLog.title)}`;
    message += `</a>`;

    await bot.instance.telegram
      .sendMessage(telegram_id, message, { parse_mode: 'HTML' })
      .then(async () => {
        logger.info(
          { telegram_id, message },
          'Removed Topic notification was sent',
        );
        await setModLogNotified.execute(modLog, telegram_id);
      })
      .catch(async error => {
        if (!error.response) {
          logger.error(
            { error, telegram_id, modLog, posts, message },
            'Error while sending Removed Topic Notification telegram message',
          );

          return;
        }
        if (
          error.response.description ===
            'Forbidden: bot was blocked by the user' ||
          error.response.description === 'Forbidden: user is deactivated'
        ) {
          logger.info(
            { error: error.response, telegram_id, modLog, posts, message },
            'Telegram user marked as blocked',
          );
          await setUserBlocked.execute(telegram_id);
        } else {
          logger.error(
            { error: error.response, telegram_id, modLog, posts, message },
            'Error while sending Removed Topic Notification telegram message',
          );
        }
      });
  }
}
