import 'dotenv/config';
import 'reflect-metadata';
import inquirer from 'inquirer';

import { censorAddressesMenu } from './forum/censorAddressesMenu';
import { censorPostsMenu } from './forum/censorPostsMenu';
import { createPostMenu } from './forum/createPostsMenu';
import { scrapeMeritDump } from './forum/scrapeMeritDump';
import { scrapePostMenu } from './forum/scrapePostMenu';
import { syncBoards } from './forum/syncBoards';

import '##/shared/container';

type MainMenuOptions = 'Posts' | 'Boards' | 'Merits' | 'Addresses';
type PostsMenuOptions = 'Scrape' | 'Create' | 'Censor';
type AddressesMenuOptions = 'Censor';
type MeritsMenuOptions = 'Scrape Last Dump' | 'Scrape Loyce';
type BoardsMenuOptions = 'Sync';

interface PromptResponse {
  mainMenu: MainMenuOptions;
  postsMenu: PostsMenuOptions;
  meritsMenu: MeritsMenuOptions;
  boardsMenu: BoardsMenuOptions;
  addressesMenu: AddressesMenuOptions;
}

async function mainMenu() {
  return inquirer
    .prompt<PromptResponse>([
      {
        name: 'mainMenu',
        message: 'Choose the category',
        type: 'list',
        choices: ['Posts', 'Merits', 'Boards', 'Addresses'],
      },
      {
        name: 'postsMenu',
        message: 'What about it?',
        type: 'list',
        choices: ['Scrape', 'Create', 'Privacy'],
        when(answers) {
          return answers.mainMenu === 'Posts';
        },
      },
      {
        name: 'meritsMenu',
        message: 'What about it?',
        type: 'list',
        choices: ['Scrape Last Dump', 'Scrape Loyce'],
        when(answers) {
          return answers.mainMenu === 'Merits';
        },
      },
      {
        name: 'boardsMenu',
        message: 'What about it?',
        type: 'list',
        choices: ['Sync'],
        when(answers) {
          return answers.mainMenu === 'Boards';
        },
      },
      {
        name: 'addressesMenu',
        message: 'What about it?',
        type: 'list',
        choices: ['Privacy'],
        when(answers) {
          return answers.mainMenu === 'Addresses';
        },
      },
    ])
    .then(async (response) => {
      if (response.postsMenu === 'Create') {
        await createPostMenu();
      }
      else if (response.postsMenu === 'Censor') {
        await censorPostsMenu();
      }
      else if (response.postsMenu === 'Scrape') {
        await scrapePostMenu();
      }
      else if (response.meritsMenu) {
        const shouldScrapeLoyce = response.meritsMenu === 'Scrape Loyce';
        await scrapeMeritDump(shouldScrapeLoyce);
      }
      else if (response.boardsMenu === 'Sync') {
        await syncBoards();
      }
      else if (response.addressesMenu === 'Censor') {
        await censorAddressesMenu();
      }
    });
}

mainMenu().then(() => process.exit());
