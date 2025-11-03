import type { HearsContext } from 'grammy';
import { InputFile } from 'grammy';
import type { MessageEntity } from '@grammyjs/types';
import { container } from 'tsyringe';

import puppeteer from 'puppeteer';
import type Post from '../../../../modules/posts/infra/typeorm/entities/Post';
import type IMenuContext from '../@types/IMenuContext';
import getPost from '##/modules/posts/services/get-post';
import logger from '##/shared/services/logger';

const imageCommand = async (ctx: HearsContext<IMenuContext>): Promise<void> => {
  if (!ctx.message.reply_to_message) {
    return;
  }

  const { reply_to_message } = ctx.message;

  const link = reply_to_message.entities.find(
    entity => entity.type === 'text_link'
  ) as MessageEntity.TextLinkMessageEntity;
  const postId = Number(link && link.url.match(/\.msg(\d+)/)?.at(1));

  if (Number.isNaN(postId)) {
    return;
  }

  const post: Post | null = await getPost({ postId, shouldCache: true, shouldScrape: true })
    .then(post => post)
    .catch(async err => {
      logger.warn({ err }, '[imageCommand] Failed getPost');
      await ctx.reply(`Could not get post ${postId}, please contact TryNinja.`);
      return null;
    });

  if (!post) {
    return;
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const css = `
    font-family: verdana, sans-serif;
    
    * {
        margin: 0px;
        padding: 0px;
    }
    
    .header {
        display: flex;
        flex-direction: column;
        margin-bottom: 15px;
        padding: 5px 0px;
        background-color: rgba(0, 0, 0, 0.2)
    }

    .post {
        padding: 5px;
    }

    .code {
        color: #000000;
        background-color: #fff;
        font-family: "courier new", "times new roman", monospace;
        font-size: 12px;
        line-height: 1.3em;
        /* Put a nice border around it. */
        border: 1px solid #000000;
        padding: 5px;
        margin: 1px 3px 4px 6px;
        width: 93%;
        /* Don't wrap its contents, and show scrollbars. */
        white-space: nowrap;
        overflow: auto;
        /* Stop after about 24 lines, and just show a scrollbar. */
        max-height: 24em;
    }

    .quoteheader, .codeheader {
        color: #476C8E;
        text-decoration: none;
        font-style: normal;
        font-weight: bold;
        line-height: 1.2em;
        margin-left: 6px;
    }

    .quote {
        color: #000000;
        background-color: #f1f2f4;
        border: 1px solid #d0d0e0;
        padding: 5px;
        margin: 1px 3px 6px 6px;
        line-height: 1.4em;
    }
  `;

  await page.setContent(
    `<style>${css}</style>
    <div class="header">
    <span><b>Title:</b> ${post.title}</span>
    <span><b>Author:</b> ${post.author}</span>
    </div>
    <div class="post">${post.content}</div>`
  );
  await page.setViewport({ width: 800, height: 600 });
  const screenshot = await page.screenshot({ fullPage: true });
  await browser.close();

  await ctx.replyWithPhoto(new InputFile(screenshot), { caption: `Post #${postId}` });
};

export default imageCommand;
