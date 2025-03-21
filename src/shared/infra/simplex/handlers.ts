import {
  ChatInfoType,
  ChatResponse,
  CRNewChatItems,
  CRContactDeleted,
  CRChatError,
  CRContactsDisconnected,
  CRContactsSubscribed,
  CRReceivedContactRequest
} from 'simplex-chat/dist/response';
import logger from '##/shared/services/logger';
import type { SimpleX } from './index';

type CRContactConnected = ChatResponse & {
  type: 'contactConnected';
  contact: {
    contactId: number;
    activeConn: {
      connId: number;
      agentConnId: string;
      localDisplayName: string;
    };
  };
};

type CRContactSubSummary = ChatResponse & {
  type: 'contactSubSummary';
  contactSubscriptions: Array<{
    contactId: number;
  }>;
};

type Handlers = Record<string, (r: ChatResponse, simpleX: SimpleX) => Promise<void>>;

export const handlers: Handlers = {
  receivedContactRequest: async (r: CRReceivedContactRequest, simpleX) => {
    const { contactId } = await simpleX.chat.apiAcceptContactRequest(r.contactRequest.contactRequestId);

    while (!(await simpleX.isContactActive(contactId))) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await simpleX.addConnectedUser(contactId);

    await simpleX.db.createUser({
      contact_id: contactId,
      forum_username: null,
      forum_user_uid: null,
      enable_mentions: false,
      enable_merits: false,
      only_direct: false
    });

    await simpleX.sendMessage(
      contactId,
      'Hello, Welcome to the BitcoinTalk SuperNotifier!\n\nWhat is your BitcoinTalk username?'
    );

    await simpleX.db.createConversation({
      contact_id: contactId,
      data: { step: 'waiting-for-username', forum_username: null, forum_user_uid: null }
    });
  },
  contactConnected: async (r: CRContactConnected, simpleX) => {
    const { contactId } = r.contact;
    await simpleX.addConnectedUser(contactId);
  },
  contactsDisconnected: async (r: CRContactsDisconnected, simpleX) => {
    for (const contactRef of r.contactRefs) {
      await simpleX.removeConnectedUser(contactRef.contactId);
    }
  },
  contactsSubscribed: async (r: CRContactsSubscribed, simpleX) => {
    for (const contactRef of r.contactRefs) {
      await simpleX.addConnectedUser(contactRef.contactId);
    }
  },
  chatItemsStatusesUpdated: async () => {},
  contactSubSummary: async (r: CRContactSubSummary, simpleX) => {
    for (const contact of r.contactSubscriptions) {
      await simpleX.addConnectedUser(contact.contactId);
    }
  },
  pendingSubSummary: async () => {},
  acceptingContactRequest: async () => {},
  memberSubSummary: async () => {},
  chatError: async (r: CRChatError) => {
    if (r.chatError.type === 'error') {
      logger.warn({ type: r.chatError, error: r.chatError }, 'Chat error');
    }
  },
  newChatItems: async (r: CRNewChatItems, simpleX) => {
    for (const chatItem of r.chatItems) {
      if (chatItem.chatInfo.type !== ChatInfoType.Direct) continue;
      if (chatItem.chatItem.content.type !== 'rcvMsgContent' || chatItem.chatItem.content.msgContent.type !== 'text')
        continue;

      const { contactId } = chatItem.chatInfo.contact;
      const { text } = chatItem.chatItem.content.msgContent;

      if (!simpleX.connectedUsers.has(contactId)) {
        simpleX.connectedUsers.add(contactId);
        logger.info({ contactId }, `Contact ${contactId} connected`);
      }

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
            await simpleX.sendMessage(contactId, `Hi, *${text}*! And what's your forum UID?`);
            return;
          }

          case 'waiting-for-forum-uid': {
            await simpleX.db.updateConversation(contactId, {
              step: 'confirm-setup',
              forum_username: conversation.data.forum_username,
              forum_user_uid: text
            });

            await simpleX.sendMessage(
              contactId,
              `Great!\n\nUsername is *${conversation.data.forum_username}*\nForum UID is *${text}*\n\n*OK* to confirm\n*RESET* to start again`
            );
            return;
          }

          case 'confirm-setup': {
            if (text.toLowerCase() === 'ok') {
              await simpleX.sendMessage(
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

              logger.info({ contactId }, 'New contact configured');
            }

            if (text.toLowerCase() === 'reset') {
              await simpleX.db.updateConversation(contactId, {
                step: 'waiting-for-username',
                forum_username: null,
                forum_user_uid: null
              });

              await simpleX.sendMessage(contactId, "Let's try again... What is your BitcoinTalk username?");
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
              '*/only_direct* - Toggle only direct mentions (@username) and quotes',
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

            await simpleX.sendMessage(contactId, message);
            break;
          }
          case '/invite': {
            await simpleX.sendMessage(contactId, `\`${simpleX.address}\``);
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

            await simpleX.sendMessage(
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
            await simpleX.sendMessage(contactId, `\`${JSON.stringify(user)}\``);
            break;
          }
          case '/mentions': {
            await simpleX.db.updateUser(contactId, { enable_mentions: !user.enable_mentions });
            await simpleX.sendMessage(
              contactId,
              `Mentions notifications are now *${user.enable_mentions ? 'disabled' : 'enabled'}*`
            );
            break;
          }
          case '/merits': {
            await simpleX.db.updateUser(contactId, { enable_merits: !user.enable_merits });
            await simpleX.sendMessage(
              contactId,
              `Merits notifications are now *${user.enable_merits ? 'disabled' : 'enabled'}*`
            );
            break;
          }
          case '/only_direct': {
            await simpleX.db.updateUser(contactId, { only_direct: !user.only_direct });
            await simpleX.sendMessage(
              contactId,
              `Only direct mentions and quotes are now *${user.only_direct ? 'disabled' : 'enabled'}*`
            );
            break;
          }

          case '/topic': {
            if (command[2]) {
              let topicId = Number(command[2]);

              if (Number.isNaN(topicId)) {
                const urlRegex = /topic=(\d+)/;
                const match = text.match(urlRegex);
                if (match && match[1]) {
                  topicId = Number(match[1]);
                } else {
                  await simpleX.sendMessage(contactId, `Error: Provided topic is invalid`);
                  break;
                }
              }

              const isExistent = await simpleX.db.getTrackedTopic(contactId, topicId);
              if (isExistent) {
                await simpleX.sendMessage(contactId, `Error: Topic *${topicId}* already being tracked`);
                break;
              }

              await simpleX.db.createTrackedTopic({ contact_id: contactId, topic_id: topicId });
              await simpleX.sendMessage(contactId, `Topic *${topicId}* is now being tracked`);
            }
            break;
          }
          case '/list_topics': {
            const trackedTopics = await simpleX.db.getTrackedTopics({ contact_id: contactId });
            await simpleX.sendMessage(
              contactId,
              `Tracked topics: ${trackedTopics.map(topic => `*${topic.topic_id}*`).join(', ')}`
            );
            break;
          }
          case '/del_topic': {
            if (command[2]) {
              const topicId = Number(command[2]);

              await simpleX.db.deleteTrackedTopic(contactId, topicId);
              await simpleX.sendMessage(contactId, `Topic *${topicId}* is no longer being tracked`);
            }
            break;
          }

          case '/phrase': {
            if (command[2]) {
              const phrase = command[2];

              const isExistent = await simpleX.db.getTrackedPhrase(contactId, phrase);
              if (isExistent) {
                await simpleX.sendMessage(contactId, `Error: Phrase *${phrase}* already being tracked`);
                break;
              }

              await simpleX.db.createTrackedPhrase({ contact_id: contactId, phrase });
              await simpleX.sendMessage(contactId, `Phrase *${phrase}* is now being tracked`);
            }
            break;
          }
          case '/list_phrases': {
            const trackedPhrases = await simpleX.db.getTrackedPhrases({ contact_id: contactId });
            await simpleX.sendMessage(
              contactId,
              `Tracked phrases: ${trackedPhrases.map(phrase => `*${phrase.phrase}*`).join(', ')}`
            );
            break;
          }
          case '/del_phrase': {
            if (command[2]) {
              const phrase = command[2];

              await simpleX.db.deleteTrackedPhrase(contactId, phrase);
              await simpleX.sendMessage(contactId, `Phrase *${phrase}* is no longer being tracked`);
            }
            break;
          }

          case '/user': {
            if (command[2]) {
              const username = command[2];

              const isExistent = await simpleX.db.getTrackedUser(contactId, username);
              if (isExistent) {
                await simpleX.sendMessage(contactId, `Error: User *${username}* already being tracked`);
                break;
              }

              await simpleX.db.createTrackedUser({ contact_id: contactId, username });
              await simpleX.sendMessage(contactId, `User *${username}* is now being tracked`);
            }
            break;
          }
          case '/list_users': {
            const trackedUsers = await simpleX.db.getTrackedUsers({ contact_id: contactId });
            await simpleX.sendMessage(
              contactId,
              `Tracked users: ${trackedUsers.map(user => `*${user.username}*`).join(', ')}`
            );
            break;
          }
          case '/del_user': {
            if (command[2]) {
              const username = command[2];

              await simpleX.db.deleteTrackedUser(contactId, username);
              await simpleX.sendMessage(contactId, `User *${username}* is no longer being tracked`);
            }
            break;
          }

          case '/ignoreuser': {
            if (command[2]) {
              const username = command[2];

              const isExistent = await simpleX.db.getIgnoredUser(contactId, username);
              if (isExistent) {
                await simpleX.sendMessage(contactId, `Error: User *${username}* already being ignored`);
                break;
              }

              await simpleX.db.createIgnoredUser({ contact_id: contactId, username });
              await simpleX.sendMessage(contactId, `User *${username}* is now being ignored`);
            }
            break;
          }
          case '/list_ignoreusers': {
            const trackedUsers = await simpleX.db.getIgnoredUsers({ contact_id: contactId });
            await simpleX.sendMessage(
              contactId,
              `Ignored users: ${trackedUsers.map(user => `*${user.username}*`).join(', ')}`
            );
            break;
          }
          case '/del_ignoreuser': {
            if (command[2]) {
              const username = command[2];

              await simpleX.db.deleteIgnoredUser(contactId, username);
              await simpleX.sendMessage(contactId, `User *${username}* is no longer being ignored`);
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

    simpleX.connectedUsers.delete(r.contact.contactId);
    logger.info({ contactId: r.contact.contactId }, 'Contact deleted');
  }
};
