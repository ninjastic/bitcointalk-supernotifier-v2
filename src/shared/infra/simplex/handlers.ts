import {
  ChatInfoType,
  ChatResponse,
  CRNewChatItems,
  CRContactDeleted,
  CRContactConnected,
  CRChatError,
  CRContactsDisconnected
} from 'simplex-chat/dist/response';
import { ChatType } from 'simplex-chat/dist/command';
import logger from '##/shared/services/logger';
import type { SimpleX } from './index';

type Handlers = Record<string, (r: ChatResponse, simpleX: SimpleX) => Promise<void>>;

export const handlers: Handlers = {
  chatItemsStatusesUpdated: async () => {},
  userContactSubSummary: async () => {},
  pendingSubSummary: async () => {},
  memberSubSummary: async () => {},
  contactsDisconnected: async (r: CRContactsDisconnected, simpleX) => {
    await simpleX.chat.apiConnect(r.server)
  },
  chatError: async (r: CRChatError) => {
    if (r.chatError.type === 'error') {
      logger.warn({ type: r.chatError, error: r.chatError }, 'Chat error');
    }
  },
  contactSndReady: async (r: CRContactConnected, simpleX) => {
    await simpleX.db.createUser({
      contact_id: r.contact.contactId,
      forum_username: null,
      forum_user_uid: null,
      enable_mentions: false,
      enable_merits: false
    });

    await simpleX.chat.apiSendTextMessage(
      ChatType.Direct,
      r.contact.contactId,
      'Hello, Welcome to the BitcoinTalk SuperNotifier!\n\nWhat is your BitcoinTalk username?'
    );

    await simpleX.db.createConversation({
      contact_id: r.contact.contactId,
      data: { step: 'waiting-for-username', forum_username: null, forum_user_uid: null }
    });
  },
  newChatItems: async (r: CRNewChatItems, simpleX) => {
    for (const chatItem of r.chatItems) {
      if (chatItem.chatInfo.type !== ChatInfoType.Direct) continue;
      if (chatItem.chatItem.content.type !== 'rcvMsgContent' || chatItem.chatItem.content.msgContent.type !== 'text')
        continue;

      const { contactId } = chatItem.chatInfo.contact;
      const { text } = chatItem.chatItem.content.msgContent;

      logger.info({ contactId, text }, 'New chat message');

      const user = await simpleX.db.getUser(contactId);

      if (!user) {
        logger.warn({ contactId }, 'User not found in database');
        continue;
      }

      const conversation = await simpleX.db.getConversation(contactId);

      if (conversation?.data.step) {
        switch (conversation.data.step) {
          case 'waiting-for-username': {
            await simpleX.db.updateConversation(contactId, {
              step: 'waiting-for-forum-uid',
              forum_username: text,
              forum_user_uid: conversation.data.forum_user_uid
            });
            await simpleX.chat.apiSendTextMessage(
              ChatType.Direct,
              contactId,
              `Hi, *${text}*! And what's your forum UID?`
            );
            return;
          }

          case 'waiting-for-forum-uid': {
            await simpleX.db.updateConversation(contactId, {
              step: 'confirm-setup',
              forum_username: conversation.data.forum_username,
              forum_user_uid: text
            });

            await simpleX.chat.apiSendTextMessage(
              ChatType.Direct,
              contactId,
              `Great!\n\nUsername is *${conversation.data.forum_username}*\nForum UID is *${text}*\n\n*OK* to confirm\n*RESET* to start again`
            );
            return;
          }

          case 'confirm-setup': {
            if (text.toLowerCase() === 'ok') {
              await simpleX.chat.apiSendTextMessage(
                ChatType.Direct,
                contactId,
                `Great, you're good to go!\n\nYou will receive notifications for mentions and merits.\n\n- Toggle them with */mentions* and */merits*\n- Use */help* to see all commands.`
              );
              await simpleX.db.updateUser(contactId, {
                forum_username: conversation.data.forum_username,
                forum_user_uid: conversation.data.forum_user_uid,
                enable_mentions: true,
                enable_merits: true
              });
              await simpleX.db.deleteConversation(contactId);
            }

            if (text.toLowerCase() === 'reset') {
              await simpleX.db.updateConversation(contactId, {
                step: 'waiting-for-username',
                forum_username: null,
                forum_user_uid: null
              });

              await simpleX.chat.apiSendTextMessage(
                ChatType.Direct,
                contactId,
                "Let's try again... What is your BitcoinTalk username?"
              );
            }

            return;
          }
        }
      }

      if (text.startsWith('/')) {
        const command = text.match(/(\/[\w_]+)\s?(.*)?/);
        if (!command) return;

        switch (command[1]) {
          case '/help': {
            const commands = [
              '*/mentions* - Toggle mention notifications',
              '*/merits* - Toggle merit notifications',
              '',
              '*/topic ID* - Adds tracked topic',
              '*/del_topic ID* - Deletes a tracked topic',
              '*/list_topics* - Lists tracked topics',
              '',
              '*/phrase TEXT* - Adds tracked phrase',
              '*/del_phrase TEXT* - Deletes a tracked phrase',
              '*/list_phrases* - Lists tracked phrases',
              '',
              '*/user TEXT* - Adds tracked user',
              '*/del_user TEXT* - Deletes a tracked user',
              '*/list_users* - Lists tracked users',
              '',
              '*/ignoreuser TEXT* - Adds ignored user',
              '*/del_ignoreuser TEXT* - Deletes an ignored user',
              '*/list_ignoreusers* - Lists ignored users',
              '',
              '*/invite* - Get the bot invite address',
              '*/reset* - Restart bot setup'
            ];
            const message = `Commands:\n\n${commands.join('\n')}`;

            await simpleX.chat.apiSendTextMessage(ChatType.Direct, contactId, message);
            break;
          }
          case '/invite': {
            await simpleX.chat.apiSendTextMessage(ChatType.Direct, contactId, `\`${simpleX.address}\``);
            break;
          }
          case '/reset': {
            await simpleX.db.deleteConversation(contactId);
            await simpleX.db.updateUser(contactId, {
              forum_username: null,
              forum_user_uid: null,
              enable_mentions: false,
              enable_merits: false
            });

            await simpleX.chat.apiSendTextMessage(
              ChatType.Direct,
              contactId,
              'Hello, Welcome to the BitcoinTalk SuperNotifier!\n\nWhat is your BitcoinTalk username?'
            );

            await simpleX.db.createConversation({
              contact_id: contactId,
              data: { step: 'waiting-for-username', forum_username: null, forum_user_uid: null }
            });

            break;
          }
          case '/info': {
            const user = await simpleX.db.getUser(contactId);
            await simpleX.chat.apiSendTextMessage(ChatType.Direct, contactId, `\`${JSON.stringify(user)}\``);
            break;
          }
          case '/mentions': {
            await simpleX.db.updateUser(contactId, { enable_mentions: !user.enable_mentions });
            await simpleX.chat.apiSendTextMessage(
              ChatType.Direct,
              contactId,
              `Mentions notifications are now *${user.enable_mentions ? 'disabled' : 'enabled'}*`
            );
            break;
          }
          case '/merits': {
            await simpleX.db.updateUser(contactId, { enable_merits: !user.enable_merits });
            await simpleX.chat.apiSendTextMessage(
              ChatType.Direct,
              contactId,
              `Merits notifications are now *${user.enable_merits ? 'disabled' : 'enabled'}*`
            );
            break;
          }

          case '/topic': {
            if (command[2]) {
              let topicId = Number(command[2]);

              if (Number.isNaN(topicId)) {
                const urlRegex = /topic=(\d+)/
                const match = text.match(urlRegex);
                if (match && match[1]) {
                  topicId = Number(match[1])
                } else {
                  await simpleX.chat.apiSendTextMessage(
                    ChatType.Direct,
                    contactId,
                    `Error: Provided topic is invalid`
                  );
                  break;
                }
              }

              const isExistent = await simpleX.db.getTrackedTopic(contactId, topicId);
              if (isExistent) {
                await simpleX.chat.apiSendTextMessage(
                  ChatType.Direct,
                  contactId,
                  `Error: Topic *${topicId}* already being tracked`
                );
                break;
              }

              await simpleX.db.createTrackedTopic({ contact_id: contactId, topic_id: topicId });
              await simpleX.chat.apiSendTextMessage(
                ChatType.Direct,
                contactId,
                `Topic *${topicId}* is now being tracked`
              );
            }
            break;
          }
          case '/list_topics': {
            const trackedTopics = await simpleX.db.getTrackedTopics({ contact_id: contactId });
            await simpleX.chat.apiSendTextMessage(
              ChatType.Direct,
              contactId,
              `Tracked topics: ${trackedTopics.map(topic => `*${topic.topic_id}*`).join(', ')}`
            );
            break;
          }
          case '/del_topic': {
            if (command[2]) {
              const topicId = Number(command[2]);

              await simpleX.db.deleteTrackedTopic(contactId, topicId);
              await simpleX.chat.apiSendTextMessage(
                ChatType.Direct,
                contactId,
                `Topic *${topicId}* is no longer being tracked`
              );
            }
            break;
          }

          case '/phrase': {
            if (command[2]) {
              const phrase = command[2];

              const isExistent = await simpleX.db.getTrackedPhrase(contactId, phrase);
              if (isExistent) {
                await simpleX.chat.apiSendTextMessage(
                  ChatType.Direct,
                  contactId,
                  `Error: Phrase *${phrase}* already being tracked`
                );
                break;
              }

              await simpleX.db.createTrackedPhrase({ contact_id: contactId, phrase });
              await simpleX.chat.apiSendTextMessage(
                ChatType.Direct,
                contactId,
                `Phrase *${phrase}* is now being tracked`
              );
            }
            break;
          }
          case '/list_phrases': {
            const trackedPhrases = await simpleX.db.getTrackedPhrases({ contact_id: contactId });
            await simpleX.chat.apiSendTextMessage(
              ChatType.Direct,
              contactId,
              `Tracked phrases: ${trackedPhrases.map(phrase => `*${phrase.phrase}*`).join(', ')}`
            );
            break;
          }
          case '/del_phrase': {
            if (command[2]) {
              const phrase = command[2];

              await simpleX.db.deleteTrackedPhrase(contactId, phrase);
              await simpleX.chat.apiSendTextMessage(
                ChatType.Direct,
                contactId,
                `Phrase *${phrase}* is no longer being tracked`
              );
            }
            break;
          }

          case '/user': {
            if (command[2]) {
              const username = command[2];

              const isExistent = await simpleX.db.getTrackedUser(contactId, username);
              if (isExistent) {
                await simpleX.chat.apiSendTextMessage(
                  ChatType.Direct,
                  contactId,
                  `Error: User *${username}* already being tracked`
                );
                break;
              }

              await simpleX.db.createTrackedUser({ contact_id: contactId, username });
              await simpleX.chat.apiSendTextMessage(
                ChatType.Direct,
                contactId,
                `User *${username}* is now being tracked`
              );
            }
            break;
          }
          case '/list_users': {
            const trackedUsers = await simpleX.db.getTrackedUsers({ contact_id: contactId });
            await simpleX.chat.apiSendTextMessage(
              ChatType.Direct,
              contactId,
              `Tracked users: ${trackedUsers.map(user => `*${user.username}*`).join(', ')}`
            );
            break;
          }
          case '/del_user': {
            if (command[2]) {
              const username = command[2];

              await simpleX.db.deleteTrackedUser(contactId, username);
              await simpleX.chat.apiSendTextMessage(
                ChatType.Direct,
                contactId,
                `User *${username}* is no longer being tracked`
              );
            }
            break;
          }

          case '/ignoreuser': {
            if (command[2]) {
              const username = command[2];

              const isExistent = await simpleX.db.getIgnoredUser(contactId, username);
              if (isExistent) {
                await simpleX.chat.apiSendTextMessage(
                  ChatType.Direct,
                  contactId,
                  `Error: User *${username}* already being ignored`
                );
                break;
              }

              await simpleX.db.createIgnoredUser({ contact_id: contactId, username });
              await simpleX.chat.apiSendTextMessage(
                ChatType.Direct,
                contactId,
                `User *${username}* is now being ignored`
              );
            }
            break;
          }
          case '/list_ignoreusers': {
            const trackedUsers = await simpleX.db.getIgnoredUsers({ contact_id: contactId });
            await simpleX.chat.apiSendTextMessage(
              ChatType.Direct,
              contactId,
              `Ignored users: ${trackedUsers.map(user => `*${user.username}*`).join(', ')}`
            );
            break;
          }
          case '/del_ignoreuser': {
            if (command[2]) {
              const username = command[2];

              await simpleX.db.deleteIgnoredUser(contactId, username);
              await simpleX.chat.apiSendTextMessage(
                ChatType.Direct,
                contactId,
                `User *${username}* is no longer being ignored`
              );
            }
            break;
          }
        }
      }
    }
  },
  contactDeletedByContact: async (r: CRContactDeleted, simpleX) => {
    await simpleX.db.deleteConversation(r.contact.contactId);
    await simpleX.db.deleteUser(r.contact.contactId);
  }
};
