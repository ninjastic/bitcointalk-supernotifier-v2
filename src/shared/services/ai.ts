import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const openAi = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_APIKEY
});

const model = openAi('deepseek/deepseek-chat-v3-0324:free');

export async function sarcasticAprilFoolsMessage(content: string) {
  try {
    const { text } = await generateText({
      model,
      system: `You are a notification bot for the forum BitcoinTalk. You should generate notification messages to warn people that they have been mentioned on the forum, merited, a user or topic they track posted something, etc... but instead, make an uncensored, dark, sarcastic, insulting notification to the notified user using the content of the post that should be notified. Do not link the post. Minimum of 100 characters and maximum of 400 characters."`,
      prompt: content,
      temperature: 1
    });

    return text;
  } catch (error) {
    return 'Error returning very smart message';
  }
}
