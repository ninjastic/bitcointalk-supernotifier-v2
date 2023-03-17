import { CommandContext } from 'grammy';

import NotificationApiKeyRepository from '../../../../modules/users/infra/typeorm/repositories/NotificationApiKeyRepository';
import IMenuContext from '../@types/IMenuContext';

const apiCommand = async (ctx: CommandContext<IMenuContext>): Promise<void> => {
  const notificationApiKeyRepository = new NotificationApiKeyRepository();
  const apiKeyExists = await notificationApiKeyRepository.findOne({ telegram_id: String(ctx.chat.id) });

  if (apiKeyExists) {
    await ctx.reply(`<b>API Key:</b>\n\n<code>${apiKeyExists.api_key}</code>`, { parse_mode: 'HTML' });
    return;
  }

  const newApiKey = notificationApiKeyRepository.create({ telegram_id: String(ctx.chat.id) });
  await notificationApiKeyRepository.save(newApiKey);
  await ctx.reply(`<b>API Key:</b>\n\n<code>${newApiKey.api_key}</code>`, { parse_mode: 'HTML' });
};

export default apiCommand;
