import { MenuTemplate } from 'grammy-inline-menu';
import type IMenuContext from '../@types/IMenuContext';

const aboutMenu = new MenuTemplate<IMenuContext>(() => ({
  text: `<b>About</b>\n\nMore information about the bot.`,
  parse_mode: 'HTML'
}));

const donationMenu = new MenuTemplate<IMenuContext>(() => {
  let message = '';
  message += 'Donations are appreciated. 💖\n\n';
  message += 'All the money will be used to cover the bot expenses (around $18/month).';

  return {
    text: message,
    parse_mode: 'HTML'
  };
});

donationMenu.interact('₿ BTC (bech32)', 'bech32-donate', {
  do: async ctx => {
    await ctx.reply('bc1qlfzjqgleh3pg7l63p9fc596uqv30hqr9dpg59q');
    return true;
  }
});

// donationMenu.interact('₿ BTC (legacy)', 'legacy-donate', {
//   do: async ctx => {
//     await ctx.reply('1NinjabXd5znM5zgTcmxDVzH4w3nbaY16L');
//     return true;
//   }
// });

// donationMenu.interact('USDT (TRX)', 'usdt-donate', {
//   do: async ctx => {
//     await ctx.reply('TKijZ1wLkiagkddpXmTUkESEd4Fnsd8pA3');
//     return true;
//   }
// });

donationMenu.interact('↩ Go Back', 'back', {
  do: async ctx => {
    await ctx.answerCallbackQuery();
    return '/';
  }
});

aboutMenu.submenu('💖 Donate', 'donate', donationMenu);

aboutMenu.url('📜 Topic', 'https://bitcointalk.org/index.php?topic=5248878.0');

aboutMenu.interact('↩ Go Back', 'back', {
  do: async ctx => {
    await ctx.answerCallbackQuery();
    return '/';
  }
});

export default aboutMenu;
