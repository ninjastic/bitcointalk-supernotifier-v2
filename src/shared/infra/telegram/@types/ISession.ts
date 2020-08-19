import { TelegrafContext } from 'telegraf/typings/context';

export default interface ISession extends TelegrafContext {
  waitingForUsername: boolean;
  waitingForUserId: boolean;
  username: string;
  userId: number;
  mentions: boolean;
  merits: boolean;
  waitingForAddTopic: boolean;
  alternative_usernames: Array<string>;
  page: number;
}
