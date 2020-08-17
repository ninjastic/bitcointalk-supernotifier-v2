import { container } from 'tsyringe';
import pluralize from 'pluralize';
import logger from '../../../services/logger';

import Merit from '../../../../modules/merits/infra/schemas/Merit';

import telegramBot from '../index';

import SetMeritNotifiedService from '../../../../modules/merits/services/SetMeritNotifiedService';
import ScrapeUserMeritCountService from '../../../../modules/merits/services/ScrapeUserMeritCountService';
import GetPostService from '../../../../modules/posts/services/GetPostService';
import SetUserBlockedService from './SetUserBlockedService';

export default class SendMeritNotificationService {
  public async execute(telegram_id: number, merit: Merit): Promise<void> {
    const scrapeUserMeritCountService = new ScrapeUserMeritCountService();
    const setMeritNotified = container.resolve(SetMeritNotifiedService);
    const setUserBlocked = container.resolve(SetUserBlockedService);
    const getPost = container.resolve(GetPostService);

    const post = await getPost.execute(merit.post_id);

    const { title } = post;
    const { amount, sender, topic_id, post_id, receiver_uid } = merit;

    const totalMeritCount = await scrapeUserMeritCountService.execute(
      receiver_uid,
    );

    let message = '';
    message += `Merits: <b>${totalMeritCount}</b>. `;
    message += `You received <b>${amount}</b> ${pluralize('merit', amount)} `;
    message += `from <b>${sender}</b> `;
    message += `for <a href="https://bitcointalk.org/index.php?topic=${topic_id}.msg${post_id}#msg${post_id}">${title}</a>`;

    await telegramBot.bot.telegram
      .sendMessage(telegram_id, message, { parse_mode: 'HTML' })
      .then(async () => {
        await setMeritNotified.execute(merit, telegram_id);
      })
      .catch(async error => {
        if (!error.response) {
          logger.error(
            { error: error.response },
            'Error while sending Merit Notification telegram message',
          );

          return;
        }
        if (
          error.response.description ===
          'Forbidden: bot was blocked by the user'
        ) {
          logger.info(
            { error: error.response, telegram_id, merit: merit.id },
            'Telegram user marked as blocked',
          );
          await setUserBlocked.execute(telegram_id);
        }
      });
  }
}
