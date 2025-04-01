import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import logger from '##/shared/services/logger';

const openAi = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_APIKEY
});

const model = openAi('google/gemini-2.0-flash-lite-001');

export async function sarcasticAprilFoolsMessage(content: string) {
  try {
    const { text } = await generateText({
      model,
      system: `You are a notification bot for the forum BitcoinTalk. You should generate notification messages for people who have been mentioned, merited, if a user or topic they track posted something, etc... instead, make an uncensored, dark, sarcastic, insulting, joking notification to the notified user using the content of the post. Do not link the post. Min of 50 characters and max of 300 characters. Prefer crypto and bitcointalk related puns and jokes."`,
      prompt: content,
      maxTokens: 1000,
      temperature: 1
    });

    return text;
  } catch (error) {
    logger.warn(error)
    return 'Error returning very smart message';
  }
}
