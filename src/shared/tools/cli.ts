import inquirer from 'inquirer';
import { censorPostsMenu } from './forum/censorPostsMenu';
import { createPostMenu } from './forum/createPostsMenu';
import { syncBoards } from './forum/syncBoards';

type MainMenuOptions = 'Posts' | 'Boards' | 'Create';
type PostsMenuOptions = 'Create' | 'Censor';
type BoardsMenuOptions = 'Sync';

interface PromptResponse {
  mainMenu: MainMenuOptions;
  postsMenu: PostsMenuOptions;
  boardsMenu: BoardsMenuOptions;
}

const mainMenu = async () =>
  inquirer
    .prompt<PromptResponse>([
      {
        name: 'mainMenu',
        message: 'Choose the category',
        type: 'list',
        choices: ['Posts', 'Boards'],
      },
      {
        name: 'postsMenu',
        message: 'What about it?',
        type: 'list',
        choices: ['Create', 'Censor'],
        when(answers) {
          return answers.mainMenu === 'Posts';
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
    ])
    .then(async response => {
      if (response.postsMenu === 'Create') {
        await createPostMenu();
      } else if (response.postsMenu === 'Censor') {
        await censorPostsMenu();
      } else if (response.boardsMenu === 'Sync') {
        await syncBoards();
      }
    });

mainMenu().then(() => process.exit());
