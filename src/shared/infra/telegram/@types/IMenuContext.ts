import type { ConversationFlavor } from '@grammyjs/conversations';
import type { HydrateFlavor } from '@grammyjs/hydrate';
import type { MenuFlavor } from '@grammyjs/menu';
import type { Context, SessionFlavor } from 'grammy';

import type ISession from './ISession';

type BaseMenuContext = Context & SessionFlavor<ISession>;

type IMenuContext = HydrateFlavor<
  ConversationFlavor<BaseMenuContext> & MenuFlavor & { chat: NonNullable<Context['chat']> }
>;

export default IMenuContext;
