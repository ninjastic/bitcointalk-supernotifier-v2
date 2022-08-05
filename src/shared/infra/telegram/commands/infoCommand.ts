import { Context } from 'telegraf/typings';

const infoCommand = async (ctx: Context): Promise<void> => {
  await ctx.reply(
    JSON.stringify({
      id: ctx.chat.id,
    }),
  );
};

export default infoCommand;
