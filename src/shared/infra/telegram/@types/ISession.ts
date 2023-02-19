import { Context } from 'grammy';

export default interface ISession extends Context {
  username: string;
  userId: number;
  mentions: boolean;
  merits: boolean;
  modlogs: boolean;
  alternative_usernames: Array<string>;
  addTrackedTopicUserTopicId: number;
  page: number;
}
