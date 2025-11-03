import type { ConversationFlavor } from '@grammyjs/conversations';
import type { Context, SessionFlavor } from 'grammy';
import type ISession from './ISession';

type IMenuContext = Context & SessionFlavor<ISession> & ConversationFlavor;

export default IMenuContext;
