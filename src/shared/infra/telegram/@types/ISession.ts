export default interface ISession {
  username: string;
  userId: number;
  mentions: boolean;
  merits: boolean;
  modlogs: boolean;
  track_topics: boolean;
  alternative_usernames: Array<string>;
  isGroup: boolean;
  addTrackedTopicUserTopicId: number;
  page: number;
}
