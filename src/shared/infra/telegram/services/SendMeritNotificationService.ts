import { container } from 'tsyringe';

import Merit from '../../../../modules/merits/infra/schemas/Merit';

import telegramBot from '../index';

import SetMeritNotifiedService from '../../../../modules/merits/services/SetMeritNotifiedService';
import GetPostService from '../../../../modules/posts/services/GetPostService';

export default class SendMeritNotificationService {
  public async execute(telegram_id: number, merit: Merit): Promise<void> {
    const setMeritNotified = container.resolve(SetMeritNotifiedService);
    const getPost = container.resolve(GetPostService);

    const post = await getPost.execute(merit.post_id);

    let message = '';
    message += `You received <b>${merit.amount}</b> merits `;
    message += `from <b>${merit.sender}</b> `;
    message += `for <a href="https://bitcointalk.org/index.php?topic=${merit.topic_id}.msg${merit.post_id}#msg${merit.post_id}">${post.title}</a>`;

    await telegramBot.bot.telegram
      .sendMessage(telegram_id, message, { parse_mode: 'HTML' })
      .then(async () => {
        await setMeritNotified.execute(merit, telegram_id);
      });
  }
}
