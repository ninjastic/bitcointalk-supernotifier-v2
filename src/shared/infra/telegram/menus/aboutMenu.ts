import { Menu } from '@grammyjs/menu';

import type IMenuContext from '../@types/IMenuContext';

import { editHtml, mainMenuHtml } from './menu-utils';

export const ABOUT_MENU_HTML = '<b>About</b>\n\nMore information about the bot.';

const DONATION_MENU_HTML = [
  'Donations are appreciated. 💖',
  '',
  'All the money will be used to cover the bot expenses (around $18/month).',
].join('\n');

const donationMenu = new Menu<IMenuContext>('dnm')
  .text('₿ BTC (bech32)', async (ctx) => {
    await ctx.reply('bc1qlfzjqgleh3pg7l63p9fc596uqv30hqr9dpg59q');
  })
  .row()
  .back('↩ Go Back', async (ctx) => {
    await editHtml(ctx, ABOUT_MENU_HTML);
  });

const aboutMenu = new Menu<IMenuContext>('abm')
  .submenu('💖 Donate', 'dnm', async (ctx) => {
    await editHtml(ctx, DONATION_MENU_HTML);
  })
  .row()
  .url('📜 Topic', 'https://bitcointalk.org/index.php?topic=5248878.0')
  .row()
  .back('↩ Go Back', async (ctx) => {
    await editHtml(ctx, mainMenuHtml(ctx));
  });

aboutMenu.register(donationMenu);

export default aboutMenu;
