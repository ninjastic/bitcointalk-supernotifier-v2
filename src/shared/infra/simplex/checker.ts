import { sub } from 'date-fns';
import { LastCheckedType, NotificationType } from './db';
import { createMentionRegex, isUserMentionedInPost } from '##/shared/services/utils';
import Post from '##/modules/posts/infra/typeorm/entities/Post';
import { SimpleX } from '.';
import logger from '##/shared/services/logger';
import '##/shared/container';
import { sponsorTextsForSimpleX } from '##/config/sponsor';
import { load } from 'cheerio';
import { getRepository, MoreThan, MoreThanOrEqual, Repository } from 'typeorm';
import Merit from '##/modules/merits/infra/typeorm/entities/Merit';
import pluralize from 'pluralize';
import redis from '##/shared/services/redis';
import { hasNotificationMessageSent } from './utils';

const userNextSponsorMap = new Map();

function getSponsorPhrase(contactId: number) {
  const sponsorIndex = userNextSponsorMap.get(contactId) || 0;
  userNextSponsorMap.set(contactId, sponsorIndex + 1);

  return sponsorTextsForSimpleX[sponsorIndex % sponsorTextsForSimpleX.length];
}

class Checker {
  simpleX: SimpleX;
  postsRepository: Repository<Post>;
  meritsRepository: Repository<Merit>;
  lastPostId: number;
  lastMeritDate: Date;

  constructor(simpleX: SimpleX) {
    this.simpleX = simpleX;
    this.postsRepository = getRepository(Post);
    this.meritsRepository = getRepository(Merit);

    this.lastPostId = 0;
    this.lastMeritDate = sub(new Date(), { hours: 24 });

    logger.info({ lastPostId: this.lastPostId, lastMeritDate: this.lastMeritDate }, 'Checker initialized');
  }

  private filterPostContent(content: string): string {
    const $ = load(content);
    const data = $('body');
    data.children('div.quote, div.quoteheader').remove();
    data.find('br').replaceWith('&nbsp;');
    return data.text().replace(/\s\s+/g, ' ').trim();
  }

  async run() {
    const lastCheckedPost = await this.simpleX.db.getLastChecked({ type: LastCheckedType.POST_ID });

    if (lastCheckedPost) {
      this.lastPostId = Number(lastCheckedPost.key);
    }

    const lastCheckedMerit = await this.simpleX.db.getLastChecked({ type: LastCheckedType.MERIT_DATE });

    if (lastCheckedMerit) {
      this.lastMeritDate = new Date(lastCheckedMerit.key);
    }

    const posts = await this.postsRepository.find({
      where: {
        post_id: MoreThan(this.lastPostId),
        date: MoreThanOrEqual(sub(new Date(), { minutes: 30 }))
      },
      order: { post_id: 'ASC' }
    });

    const merits = await this.meritsRepository.find({
      where: {
        date: MoreThan(this.lastMeritDate)
      },
      relations: ['post'],
      order: { date: 'ASC' }
    });

    const trackedPhrases = await this.simpleX.db.getTrackedPhrases();
    const trackedTopics = await this.simpleX.db.getTrackedTopics();
    const trackedUsers = await this.simpleX.db.getTrackedUsers();
    const ignoredUsers = await this.simpleX.db.getIgnoredUsers();

    let users = await this.simpleX.db.getUsers({ enable_mentions: true });

    const notifiedSet = new Set<string>();

    for (const post of posts) {
      logger.debug(`Checking post ${post.post_id}`);
      const ignoringPostUser = ignoredUsers.filter(ignoredUser => ignoredUser.username.toLowerCase() === post.author);

      for (const user of users) {
        const key = `postNotification:${user.contact_id}:${post.post_id}`;
        if (!isUserMentionedInPost(post, { username: user.forum_username })) continue;
        if (user.forum_username.toLowerCase() === post.author.toLowerCase()) continue;
        if (ignoringPostUser.find(ignoring => ignoring.contact_id === user.contact_id)) continue;
        if (await redis.get(key)) continue;
        const notificationExists = await this.simpleX.db.getNotifications({
          contact_id: user.contact_id,
          key
        });
        if (notificationExists.length > 0) continue;
        if (notifiedSet.has(`${user.contact_id}:${post.post_id}`)) continue;

        logger.info({ contactId: user.contact_id, post }, 'Sending mention notification');

        const postUrl = `https://bitcointalk.org/index.php?topic=${post.topic_id}.msg${post.post_id}#msg${post.post_id}`;
        await redis.set(key, '1', 'EX', 60 * 30 * 1000);
        const messageText = `💬 Mentioned by *${post.author}* in *${
          post.title
        }* \n\n${postUrl}\n\n_${this.filterPostContent(post.content).substring(0, 150).trim()}..._${getSponsorPhrase(
          user.contact_id
        )}`;
        const msg = await this.simpleX.sendMessage(user.contact_id, messageText);
        if (hasNotificationMessageSent(msg[0])) {
          await this.simpleX.db.createNotification({
            contact_id: user.contact_id,
            type: NotificationType.MENTION,
            key,
            message: messageText,
            sent: true
          });
        } else {
          await this.simpleX.db.createNotification({
            contact_id: user.contact_id,
            type: NotificationType.MENTION,
            key,
            message: messageText,
            sent: false
          });
        }
        notifiedSet.add(`${user.contact_id}:${post.post_id}`);
      }

      for (const trackedUser of trackedUsers) {
        if (post.author.toLowerCase() !== trackedUser.username.toLowerCase()) continue;
        const user = await this.simpleX.db.getUser(trackedUser.contact_id);
        if (!user) continue;
        if (user.forum_username.toLowerCase() === post.author.toLowerCase()) continue;
        if (notifiedSet.has(`${user.contact_id}:${post.post_id}`)) continue;

        const key = `postNotification:${user.contact_id}:${post.post_id}`;
        if (await redis.get(key)) continue;
        const notificationExists = await this.simpleX.db.getNotifications({
          contact_id: user.contact_id,
          key
        });
        if (notificationExists.length > 0) continue;

        logger.info({ contactId: user.contact_id, post }, 'Sending tracked user notification');

        const postUrl = `https://bitcointalk.org/index.php?topic=${post.topic_id}.msg${post.post_id}#msg${post.post_id}`;
        await redis.set(key, '1', 'EX', 60 * 30 * 1000);
        const messageText = `👤 New reply by *${post.author}* on tracked user *${
          post.title
        }* \n\n${postUrl}\n\n_${this.filterPostContent(post.content).substring(0, 150).trim()}..._${getSponsorPhrase(
          user.contact_id
        )}`;
        const msg = await this.simpleX.sendMessage(user.contact_id, messageText);
        if (hasNotificationMessageSent(msg[0])) {
          await this.simpleX.db.createNotification({
            contact_id: user.contact_id,
            type: NotificationType.TRACKED_USER,
            key,
            message: messageText,
            sent: true
          });
        } else {
          await this.simpleX.db.createNotification({
            contact_id: user.contact_id,
            type: NotificationType.TRACKED_USER,
            key,
            message: messageText,
            sent: false
          });
        }
        notifiedSet.add(`${user.contact_id}:${post.post_id}`);
      }

      for (const trackedTopic of trackedTopics) {
        if (post.topic_id !== trackedTopic.topic_id) continue;
        const user = await this.simpleX.db.getUser(trackedTopic.contact_id);
        if (!user) continue;
        if (user.forum_username.toLowerCase() === post.author.toLowerCase()) continue;
        if (ignoringPostUser.find(ignoring => ignoring.contact_id === user.contact_id)) continue;
        if (notifiedSet.has(`${user.contact_id}:${post.post_id}`)) continue;
        const key = `postNotification:${user.contact_id}:${post.post_id}`;
        if (await redis.get(key)) continue;
        const notificationExists = await this.simpleX.db.getNotifications({
          contact_id: user.contact_id,
          key
        });
        if (notificationExists.length > 0) continue;

        logger.info({ contactId: user.contact_id, post }, 'Sending tracked topic notification');

        const postUrl = `https://bitcointalk.org/index.php?topic=${post.topic_id}.msg${post.post_id}#msg${post.post_id}`;
        await redis.set(key, '1', 'EX', 60 * 30 * 1000);
        const messageText = `📄 New reply by *${post.author}* on tracked topic *${
          post.title
        }* \n\n${postUrl}\n\n_${this.filterPostContent(post.content).substring(0, 150).trim()}..._${getSponsorPhrase(
          user.contact_id
        )}`;
        const msg = await this.simpleX.sendMessage(user.contact_id, messageText);
        if (hasNotificationMessageSent(msg[0])) {
          await this.simpleX.db.createNotification({
            contact_id: user.contact_id,
            type: NotificationType.TRACKED_TOPIC,
            key,
            message: messageText,
            sent: true
          });
        } else {
          await this.simpleX.db.createNotification({
            contact_id: user.contact_id,
            type: NotificationType.TRACKED_TOPIC,
            key,
            message: messageText,
            sent: false
          });
        }
        notifiedSet.add(`${user.contact_id}:${post.post_id}`);
      }

      for (const trackedPhrase of trackedPhrases) {
        const phraseRegex = createMentionRegex(trackedPhrase.phrase);
        if (post.content.match(phraseRegex) === null) continue;
        const user = await this.simpleX.db.getUser(trackedPhrase.contact_id);
        if (!user) continue;
        if (user.forum_username.toLowerCase() === post.author.toLowerCase()) continue;
        if (ignoringPostUser.find(ignoring => ignoring.contact_id === user.contact_id)) continue;
        if (notifiedSet.has(`${user.contact_id}:${post.post_id}`)) continue;
        const key = `postNotification:${user.contact_id}:${post.post_id}`;
        if (await redis.get(key)) continue;
        const notificationExists = await this.simpleX.db.getNotifications({
          contact_id: user.contact_id,
          key
        });
        if (notificationExists.length > 0) continue;

        logger.info({ contactId: user.contact_id, post }, 'Sending tracked phrase notification');

        const postUrl = `https://bitcointalk.org/index.php?topic=${post.topic_id}.msg${post.post_id}#msg${post.post_id}`;
        await redis.set(key, '1', 'EX', 60 * 30 * 1000);
        await this.simpleX.sendMessage(
          user.contact_id,
          `🔠 Found tracked phrase *${trackedPhrase.phrase}* by *${post.author}* in *${
            post.title
          }* \n\n${postUrl}\n\n_${this.filterPostContent(post.content).substring(0, 150).trim()}..._${getSponsorPhrase(
            user.contact_id
          )}`
        );
        const messageText = `🔠 Found tracked phrase *${trackedPhrase.phrase}* by *${post.author}* in *${
          post.title
        }* \n\n${postUrl}\n\n_${this.filterPostContent(post.content).substring(0, 150).trim()}..._${getSponsorPhrase(
          user.contact_id
        )}`;
        const msg = await this.simpleX.sendMessage(user.contact_id, messageText);
        if (hasNotificationMessageSent(msg[0])) {
          await this.simpleX.db.createNotification({
            contact_id: user.contact_id,
            type: NotificationType.TRACKED_PHRASE,
            key,
            message: messageText,
            sent: true
          });
        } else {
          await this.simpleX.db.createNotification({
            contact_id: user.contact_id,
            type: NotificationType.TRACKED_PHRASE,
            key,
            message: messageText,
            sent: false
          });
        }
        notifiedSet.add(`${user.contact_id}:${post.post_id}`);
      }
    }

    if (posts.length > 0) {
      this.lastPostId = posts[posts.length - 1].post_id;
      await this.simpleX.db.updateLastChecked({
        type: LastCheckedType.POST_ID,
        key: this.lastPostId.toString()
      });
    }

    users = await this.simpleX.db.getUsers({ enable_merits: true });

    for (const merit of merits) {
      logger.debug(`Checking merit ${merit.id}`);
      for (const user of users) {
        const key = `meritNotification:${user.contact_id}:${merit.id}`;
        if (merit.receiver_uid !== user.forum_user_uid) continue;
        if (await redis.get(key)) continue;
        const notificationExists = await this.simpleX.db.getNotifications({
          contact_id: user.contact_id,
          key
        });
        if (notificationExists.length > 0) continue;
        logger.info({ contactId: user.contact_id, merit }, 'Sending merit notification');

        const postUrl = `https://bitcointalk.org/index.php?topic=${merit.topic_id}.msg${merit.post_id}#msg${merit.post_id}`;
        await redis.set(key, '1', 'EX', 60 * 24 * 1000);
        const messageText = `⭐️ Received *${merit.amount}* ${pluralize('merit', merit.amount)} by *${
          merit.sender
        }* for *${merit.post.title}* \n\n${postUrl}${getSponsorPhrase(user.contact_id)}`;
        const msg = await this.simpleX.sendMessage(user.contact_id, messageText);
        if (hasNotificationMessageSent(msg[0])) {
          await this.simpleX.db.createNotification({
            contact_id: user.contact_id,
            type: NotificationType.MERIT,
            key,
            message: messageText,
            sent: true
          });
        } else {
          await this.simpleX.db.createNotification({
            contact_id: user.contact_id,
            type: NotificationType.MERIT,
            key,
            message: messageText,
            sent: false
          });
        }
      }
    }

    if (merits.length > 0) {
      this.lastMeritDate = merits[merits.length - 1].date;
      await this.simpleX.db.updateLastChecked({
        type: LastCheckedType.MERIT_DATE,
        key: this.lastMeritDate.toISOString()
      });
    }
  }

  async start() {
    await this.run();
    setTimeout(async () => this.start(), 1000 * 5);
  }
}

export default Checker;
