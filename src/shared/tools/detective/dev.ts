import 'dotenv/config';

import CompareUsersService from './services/CompareUsersService';

const compareUsersService = new CompareUsersService();

(async () => {
  await compareUsersService.execute(1333278, 2892163);
})();
