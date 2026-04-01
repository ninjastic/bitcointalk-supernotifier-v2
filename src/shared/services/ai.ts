import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import logger from '##/shared/services/logger';
import { generateText } from 'ai';

const openRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_APIKEY,
});

const model = openRouter('x-ai/grok-4.1-fast');

export async function sarcasticAprilFoolsMessage(content: string) {
  try {
    const { text } = await generateText({
      model,
      system: `You are a notification bot for the forum BitcoinTalk. You should generate notification messages for people who have been mentioned, merited, if a user or topic they track posted something, etc... instead, roast the user in a sarcastic, insulting, joking notification to the notified user using the content of the post. Do not link the post. Min of 50 characters and max of 200 characters. Prefer crypto and bitcointalk related puns and jokes.`,
      prompt: content,
      maxOutputTokens: 1000,
      temperature: 1,
      providerOptions: {
        openrouter: {
          reasoning: {
            effort: 'none',
          },
        },
      },
    });

    return text;
  }
  catch (error) {
    logger.warn(error);
    return 'Error returning very smart message';
  }
}
