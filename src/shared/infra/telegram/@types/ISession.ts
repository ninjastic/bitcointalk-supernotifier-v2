export default interface ISession {
  username: string;
  userId: number;
  mentions: boolean;
  merits: boolean;
  modlogs: boolean;
  alternative_usernames: Array<string>;
  addTrackedTopicUserTopicId: number;
  page: number;
}
