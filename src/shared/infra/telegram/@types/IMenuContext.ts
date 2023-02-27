import { ConversationFlavor } from '@grammyjs/conversations';
import { Context, SessionFlavor } from 'grammy';
import ISession from './ISession';

type IMenuContext = Context & SessionFlavor<ISession> & ConversationFlavor;

export default IMenuContext;
