import 'dotenv/config';
import cheerio from 'cheerio';
import { injectable, inject } from 'tsyringe';

import IModLogRepository from '../repositories/IModLogRepository';

import ModLog from '../infra/typeorm/entities/ModLog';
import CreateModLogDTO from '../dtos/CreateModLogDTO';

@injectable()
export default class ParseModLogService {
  constructor(
    @inject('ModLogRepository')
    private modLogRepository: IModLogRepository
  ) {}

  public execute(element: cheerio.Element): ModLog | false {
    const $ = cheerio.load(element, { decodeEntities: true });

    const topic = $('a:nth-child(2)');
    const user = $('a:nth-child(3)');

    const topic_url = topic.attr('href');
    const topic_id = Number(topic_url.match(/\?topic=(\d+)/i)[1]) || null;

    const user_url = user.attr('href');
    const user_id = Number(user_url.match(/;u=(\d+)/i)[1]);

    const message = $(element).text();

    const title = $('i').text();

    let type = '';

    if (message.startsWith('Remove topic:')) {
      type = 'remove_topic';
    } else if (message.startsWith('Delete reply:')) {
      type = 'delete_reply';
      return false;
    } else if (message.startsWith('Nuke user:')) {
      type = 'nuke_user';
      return false;
    } else if (message.startsWith('Autoban user:')) {
      type = 'autoban_user';
      return false;
    }

    const log = {
      type,
      topic_id,
      user_id,
      title,
      notified: false,
      notified_to: [],
      checked: false
    } as CreateModLogDTO;

    const modLog = this.modLogRepository.create(log);

    return modLog;
  }
}
