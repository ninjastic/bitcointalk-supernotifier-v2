import fetch from 'node-fetch';
import FormData from 'form-data';

import api from '../../../shared/services/api';
import logger from '../../../shared/services/logger';

export default class LoginService {
  public async execute(): Promise<void> {
    logger.info('[ForumLoginService] Trying to log in for cookies.');

    const bodyFormData = new FormData();

    bodyFormData.append('user', process.env.BITCOINTALK_USER);
    bodyFormData.append('passwrd', process.env.BITCOINTALK_PASSWORD);
    bodyFormData.append('cookieneverexp', 'on');
    bodyFormData.append('hash_passwrd', '');
    bodyFormData.append('totp_value', '');

    const response = await fetch(
      `https://bitcointalk.org/index.php?action=login2;ccode=${process.env.BITCOINTALK_BYPASS_CAPTCHA_CODE}`,
      { method: 'POST', body: bodyFormData, redirect: 'manual' }
    );

    const cookies = response.headers.raw()['set-cookie'];

    if (cookies && cookies[0]) {
      logger.info('[ForumLoginService] Authentication successed.');
      api.defaults.headers.Cookie = `${cookies[0]}; ${cookies[1]}`;
      return Promise.resolve();
    }

    logger.error('[ForumLoginService] Authentication failed.');
    return Promise.reject();
  }
}
