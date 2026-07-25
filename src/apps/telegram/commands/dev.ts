import type { CommandContext } from 'grammy';

import { container } from 'tsyringe';

import type IMenuContext from '../types/IMenuContext';
import type TelegramBot from '../bot';

import MeritsRepository from '##/modules/merits/infra/typeorm/repositories/MeritsRepository';
import SendMeritNotificationService from '../notifications/SendMeritNotificationService';

async function devCommand(ctx: CommandContext<IMenuContext>): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    await ctx.reply('Only in development');
    return;
  }

  const meritsRepository = container.resolve(MeritsRepository);
  const sendMeritNotification = container.resolve(SendMeritNotificationService);
  const bot = container.resolve<TelegramBot>('TelegramBot');

  const merit = meritsRepository.create({
    amount: Math.ceil(Math.random() * 10),
    topic_id: 5440143,
    post_id: 61775766,
    date: new Date(),
    sender: 'satoshi',
    sender_uid: 3,
    receiver: 'TryNinja',
    receiver_uid: 557798,
    notified: false,
    checked: false,
    notified_to: [],
  });

  await sendMeritNotification.execute({
    bot,
    telegramId: String(ctx.chat.id),
    merit,
    scrapedPostTitle: null,
  });
}

export default devCommand;
