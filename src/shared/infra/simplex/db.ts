import knex, { Knex } from 'knex';

export type SimpleXUser = {
  contact_id: number;
  forum_username: string | null;
  forum_user_uid: number | null;
  enable_mentions: boolean;
  enable_merits: boolean;
  deleted_at: string | null;
  created_at: string;
};

export type TrackedPhrase = {
  id: number;
  contact_id: number;
  phrase: string;
  created_at: string;
};

export type TrackedTopic = {
  id: number;
  contact_id: number;
  topic_id: number;
  created_at: string;
};

export type TrackedUser = {
  id: number;
  contact_id: number;
  username: string;
  created_at: string;
};

export type IgnoredUser = {
  id: number;
  contact_id: number;
  username: string;
  created_at: string;
};

export type RawConversation = {
  id: number;
  contact_id: number;
  data: string;
  created_at: string;
};

export type Conversation = {
  id: number;
  contact_id: number;
  data: any;
  created_at: string;
};

export enum NotificationType {
  MENTION = 'MENTION',
  MERIT = 'MERIT',
  TRACKED_PHRASE = 'TRACKED_PHRASE',
  TRACKED_TOPIC = 'TRACKED_TOPIC',
  TRACKED_USER = 'TRACKED_USER'
}

export type Notification = {
  id: number;
  contact_id: number;
  type: NotificationType;
  key: string;
  created_at: string;
};

export enum LastCheckedType {
  POST_ID = 'POST_ID',
  MERIT_DATE = 'MERIT_DATE'
}

export type LastChecked = {
  id: number;
  type: LastCheckedType;
  key: string;
  created_at: string;
};

class Db {
  db: Knex;

  constructor() {
    this.db = knex({
      client: 'better-sqlite3',
      connection: {
        filename: './simplex.db'
      },
      useNullAsDefault: true
    });

    this.initDB();
  }

  async initDB() {
    const userTableExists = await this.db.schema.hasTable('users');

    if (!userTableExists) {
      await this.db.schema.createTable('users', table => {
        table.increments('contact_id').primary();
        table.string('forum_username');
        table.integer('forum_user_uid');
        table.boolean('enable_mentions').defaultTo(false);
        table.boolean('enable_merits').defaultTo(false);
        table.timestamp('deleted_at').nullable();
        table.timestamp('created_at').defaultTo(this.db.fn.now());
      });
    }

    const conversationTableExists = await this.db.schema.hasTable('conversations');

    if (!conversationTableExists) {
      await this.db.schema.createTable('conversations', table => {
        table.increments('id').primary();
        table.integer('contact_id').notNullable();
        table.json('data');
        table.timestamp('created_at').defaultTo(this.db.fn.now());
      });
    }

    const trackedPhraseTableExists = await this.db.schema.hasTable('tracked_phrases');

    if (!trackedPhraseTableExists) {
      await this.db.schema.createTable('tracked_phrases', table => {
        table.increments('id').primary();
        table.integer('contact_id').notNullable();
        table.string('phrase').notNullable();
        table.timestamp('created_at').defaultTo(this.db.fn.now());
      });
    }

    const trackedTopicTableExists = await this.db.schema.hasTable('tracked_topics');

    if (!trackedTopicTableExists) {
      await this.db.schema.createTable('tracked_topics', table => {
        table.increments('id').primary();
        table.integer('contact_id').notNullable();
        table.integer('topic_id').notNullable();
        table.timestamp('created_at').defaultTo(this.db.fn.now());
      });
    }

    const notificationTableExists = await this.db.schema.hasTable('notifications');

    if (!notificationTableExists) {
      await this.db.schema.createTable('notifications', table => {
        table.increments('id').primary();
        table.integer('contact_id').notNullable();
        table.string('type').notNullable();
        table.string('key').notNullable();
        table.timestamp('created_at').defaultTo(this.db.fn.now());
      });
    }

    const trackedUserTableExists = await this.db.schema.hasTable('tracked_users');

    if (!trackedUserTableExists) {
      await this.db.schema.createTable('tracked_users', table => {
        table.increments('id').primary();
        table.integer('contact_id').notNullable();
        table.string('username').notNullable();
        table.timestamp('created_at').defaultTo(this.db.fn.now());
      });
    }

    const ignoredUserTableExists = await this.db.schema.hasTable('ignored_users');

    if (!ignoredUserTableExists) {
      await this.db.schema.createTable('ignored_users', table => {
        table.increments('id').primary();
        table.integer('contact_id').notNullable();
        table.string('username').notNullable();
        table.timestamp('created_at').defaultTo(this.db.fn.now());
      });
    }

    const lastCheckedTableExists = await this.db.schema.hasTable('last_checked');

    if (!lastCheckedTableExists) {
      await this.db.schema.createTable('last_checked', table => {
        table.increments('id').primary();
        table.string('type').notNullable();
        table.string('key').notNullable();
        table.timestamp('created_at').defaultTo(this.db.fn.now());
      });

      await this.db<LastChecked>('last_checked').insert({
        type: LastCheckedType.POST_ID,
        key: '0'
      });

      await this.db<LastChecked>('last_checked').insert({
        type: LastCheckedType.MERIT_DATE,
        key: new Date().toISOString()
      });
    }
  }

  async getLastChecked(where: Partial<LastChecked>): Promise<LastChecked | undefined> {
    return (await this.db<LastChecked>('last_checked').where(where).first()) as LastChecked | undefined;
  }

  async updateLastChecked(lastChecked: Omit<LastChecked, 'id' | 'created_at'>): Promise<void> {
    await this.db<LastChecked>('last_checked')
      .where({
        type: lastChecked.type
      })
      .update({
        type: lastChecked.type,
        key: lastChecked.key
      });
  }

  async getNotifications(where: Partial<Notification>): Promise<Notification[]> {
    return (await this.db<Notification>('notifications').where(where)) as Notification[];
  }

  async createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<void> {
    await this.db<Notification>('notifications').insert({
      contact_id: notification.contact_id,
      type: notification.type,
      key: notification.key
    });
  }

  async getUser(contact_id: number): Promise<SimpleXUser | undefined> {
    return (await this.db<SimpleXUser>('users').where({ contact_id }).first()) as SimpleXUser | undefined;
  }

  async getUsers(where: Partial<SimpleXUser>): Promise<SimpleXUser[]> {
    return (await this.db<SimpleXUser>('users').where(where)) as SimpleXUser[];
  }

  async createUser(user: Omit<SimpleXUser, 'created_at' | 'deleted_at'>): Promise<void> {
    await this.db<SimpleXUser>('users').insert(user);
  }

  async updateUser(
    contact_id: number,
    user: Partial<Omit<SimpleXUser, 'contact_id' | 'created_at' | 'deleted_at'>>
  ): Promise<void> {
    await this.db<SimpleXUser>('users').where({ contact_id }).update(user);
  }

  async deleteUser(contact_id: number): Promise<void> {
    await this.db<SimpleXUser>('users')
      .where({ contact_id })
      .update({ enable_mentions: false, enable_merits: false, deleted_at: this.db.fn.now() });
  }

  async createConversation(conversation: Omit<Conversation, 'id' | 'created_at'>): Promise<void> {
    await this.db<Conversation>('conversations').insert({
      contact_id: conversation.contact_id,
      data: JSON.stringify(conversation.data)
    });
  }

  async updateConversation(contact_id: number, data: any): Promise<void> {
    await this.db<Conversation>('conversations')
      .where({ contact_id })
      .update({ data: JSON.stringify(data) });
  }

  async getConversation(contact_id: number): Promise<Conversation | undefined> {
    const conversation = await this.db<RawConversation>('conversations').where({ contact_id }).first();

    if (conversation?.data) {
      return { ...conversation, data: JSON.parse(conversation.data) } as Conversation;
    }

    return undefined;
  }

  async deleteConversation(contact_id: number): Promise<void> {
    await this.db<Conversation>('conversations').where({ contact_id }).delete();
  }

  async createTrackedPhrase(trackedPhrase: Omit<TrackedPhrase, 'id' | 'created_at'>): Promise<void> {
    await this.db<TrackedPhrase>('tracked_phrases').insert({
      contact_id: trackedPhrase.contact_id,
      phrase: trackedPhrase.phrase
    });
  }

  async deleteTrackedPhrase(contact_id: number, phrase: string): Promise<void> {
    await this.db<TrackedPhrase>('tracked_phrases').where({ contact_id, phrase: phrase.toLowerCase() }).delete();
  }

  async getTrackedPhrase(contact_id: number, phrase: string): Promise<TrackedPhrase | undefined> {
    return (await this.db<TrackedPhrase>('tracked_phrases')
      .where({ contact_id, phrase: phrase.toLowerCase() })
      .first()) as TrackedPhrase | undefined;
  }

  async getTrackedPhrases(where: Partial<TrackedPhrase> = {}): Promise<TrackedPhrase[]> {
    return (await this.db<TrackedPhrase>('tracked_phrases').where(where)) as TrackedPhrase[];
  }

  async createTrackedTopic(trackedTopic: Omit<TrackedTopic, 'id' | 'created_at'>): Promise<void> {
    await this.db<TrackedTopic>('tracked_topics').insert({
      contact_id: trackedTopic.contact_id,
      topic_id: trackedTopic.topic_id
    });
  }

  async deleteTrackedTopic(contact_id: number, topic_id: number): Promise<void> {
    await this.db<TrackedTopic>('tracked_topics').where({ contact_id, topic_id }).delete();
  }

  async getTrackedTopic(contact_id: number, topic_id: number): Promise<TrackedTopic | undefined> {
    return (await this.db<TrackedTopic>('tracked_topics').where({ contact_id, topic_id }).first()) as
      | TrackedTopic
      | undefined;
  }

  async getTrackedTopics(where: Partial<TrackedTopic> = {}): Promise<TrackedTopic[]> {
    return (await this.db<TrackedTopic>('tracked_topics').where(where)) as TrackedTopic[];
  }

  async createTrackedUser(trackedUser: Omit<TrackedUser, 'id' | 'created_at'>): Promise<void> {
    await this.db<TrackedUser>('tracked_users').insert({
      contact_id: trackedUser.contact_id,
      username: trackedUser.username
    });
  }

  async deleteTrackedUser(contact_id: number, username: string): Promise<void> {
    await this.db<TrackedUser>('tracked_users').where({ contact_id, username }).delete();
  }

  async getTrackedUser(contact_id: number, username: string): Promise<TrackedUser | undefined> {
    return (await this.db<TrackedUser>('tracked_users').where({ contact_id, username }).first()) as
      | TrackedUser
      | undefined;
  }

  async getTrackedUsers(where: Partial<TrackedUser> = {}): Promise<TrackedUser[]> {
    return (await this.db<TrackedUser>('tracked_users').where(where)) as TrackedUser[];
  }

  async createIgnoredUser(ignoredUser: Omit<IgnoredUser, 'id' | 'created_at'>): Promise<void> {
    await this.db<IgnoredUser>('ignored_users').insert({
      contact_id: ignoredUser.contact_id,
      username: ignoredUser.username.toLowerCase()
    });
  }

  async deleteIgnoredUser(contact_id: number, username: string): Promise<void> {
    await this.db<IgnoredUser>('ignored_users').where({ contact_id, username: username.toLowerCase() }).delete();
  }

  async getIgnoredUser(contact_id: number, username: string): Promise<IgnoredUser | undefined> {
    return (await this.db<IgnoredUser>('ignored_users')
      .where({ contact_id, username: username.toLowerCase() })
      .first()) as IgnoredUser | undefined;
  }

  async getIgnoredUsers(where: Partial<IgnoredUser> = {}): Promise<IgnoredUser[]> {
    return (await this.db<IgnoredUser>('ignored_users').where(where)) as IgnoredUser[];
  }
}

export default Db;
