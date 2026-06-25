export type AdvancedMatchDraftField =
  | 'name'
  | 'title_regex'
  | 'content_regex'
  | 'authors'
  | 'boards'
  | 'topics';

export interface DraftAuthor {
  author: string;
}

export interface DraftBoard {
  board_id: number;
  name?: string | null;
}

export interface DraftTopic {
  topic_id: number;
  title?: string | null;
}

export interface AdvancedMatchDraft {
  id?: string;
  name?: string | null;
  title_regex?: string | null;
  content_regex?: string | null;
  authors?: DraftAuthor[];
  boards?: DraftBoard[];
  topics?: DraftTopic[];
  only_topics?: boolean;
}

export default interface ISession {
  username?: string | null;
  userId?: number | null;
  mentions: boolean;
  onlyDirectMentions: boolean;
  ignoreNestedQuotes: boolean;
  merits: boolean;
  modlogs: boolean;
  track_topics: boolean;
  alternative_usernames?: Array<string>;
  isGroup?: boolean;
  addTrackedTopicUserTopicId?: number;
  page?: number;
  advancedMatchDraft?: AdvancedMatchDraft | null;
  advancedMatchDraftField?: AdvancedMatchDraftField | null;
  advancedMatchCurrentMatchId?: string | null;
  advancedMatchListPage?: number;
  selectedTrackedBoardId?: number | null;
  selectedTrackedUser?: string | null;
  selectedIgnoredBoardId?: number | null;
  selectedTrackedPhraseId?: string | null;
  selectedTrackedTopicId?: number | null;
  selectedTrackedTopicUser?: string | null;
  selectedIgnoredTopicPostId?: number | null;
  selectedIgnoredUser?: string | null;
}
