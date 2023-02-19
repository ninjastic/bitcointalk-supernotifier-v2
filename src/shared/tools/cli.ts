import inquirer from 'inquirer';
import { censorPostsMenu } from './forum/censorPostsMenu';
import { createPostMenu } from './forum/createPostsMenu';
import { scrapePostMenu } from './forum/scrapePostMenu';
import { syncBoards } from './forum/syncBoards';
import { scrapeMeritDump } from './forum/scrapeMeritDump';

type MainMenuOptions = 'Posts' | 'Boards' | 'Merits';
type PostsMenuOptions = 'Create' | 'Censor' | 'Scrape';
type MeritsMenuOptions = 'Scrape Last Dump' | 'Scrape Loyce';
type BoardsMenuOptions = 'Sync';

interface PromptResponse {
  mainMenu: MainMenuOptions;
  postsMenu: PostsMenuOptions;
  meritsMenu: MeritsMenuOptions;
  boardsMenu: BoardsMenuOptions;
}

const mainMenu = async () =>
  inquirer
    .prompt<PromptResponse>([
      {
        name: 'mainMenu',
        message: 'Choose the category',
        type: 'list',
        choices: ['Posts', 'Merits', 'Boards']
      },
      {
        name: 'postsMenu',
        message: 'What about it?',
        type: 'list',
        choices: ['Create', 'Censor', 'Scrape'],
        when(answers) {
          return answers.mainMenu === 'Posts';
        }
      },
      {
        name: 'meritsMenu',
        message: 'What about it?',
        type: 'list',
        choices: ['Scrape Last Dump', 'Scrape Loyce'],
        when(answers) {
          return answers.mainMenu === 'Merits';
        }
      },
      {
        name: 'boardsMenu',
        message: 'What about it?',
        type: 'list',
        choices: ['Sync'],
        when(answers) {
          return answers.mainMenu === 'Boards';
        }
      }
    ])
    .then(async response => {
      if (response.postsMenu === 'Create') {
        await createPostMenu();
      } else if (response.postsMenu === 'Censor') {
        await censorPostsMenu();
      } else if (response.postsMenu === 'Scrape') {
        await scrapePostMenu();
      } else if (response.meritsMenu) {
        const shouldScrapeLoyce = response.meritsMenu === 'Scrape Loyce';
        await scrapeMeritDump(shouldScrapeLoyce);
      } else if (response.boardsMenu === 'Sync') {
        await syncBoards();
      }
    });

mainMenu().then(() => process.exit());
