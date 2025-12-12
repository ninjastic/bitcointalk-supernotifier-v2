import 'dotenv/config';
import { load } from 'cheerio';
import { inject, injectable } from 'tsyringe';

import type CreateModLogDTO from '../dtos/CreateModLogDTO';
import type ModLog from '../infra/typeorm/entities/ModLog';
import type IModLogRepository from '../repositories/IModLogRepository';

type ModLogType = CreateModLogDTO['type'];

const MESSAGE_TYPE_MAP: Record<string, ModLogType> = {
  'Remove topic:': 'remove_topic',
  'Delete reply:': 'delete_reply',
  'Nuke user:': 'nuke_user',
  'Autoban user:': 'autoban_user',
};

@injectable()
export default class ParseModLogService {
  constructor(
    @inject('ModLogRepository')
    private modLogRepository: IModLogRepository,
  ) {}

  public execute(element: cheerio.Element): ModLog {
    const $ = load(element, { decodeEntities: true });

    const topic = $('a:nth-child(2)');
    const user = $('a:nth-child(3)');

    const topic_url = topic.attr('href') ?? '';
    const user_url = user.attr('href') ?? '';

    const topic_id = Number(topic_url.match(/\?topic=(\d+)/i)?.[1]) || null;
    const user_id = Number(user_url.match(/;u=(\d+)/i)?.[1]) || null;

    const message = $(element).text();
    const post_id = Number(message.match(/.*\(message #(\d+)\)/)?.[1]) || null;
    const title = $('i').text();

    const type = this.getMessageType(message);

    if (!type) {
      throw new Error(`Unknown modlog message type: ${message}`);
    }

    const log: CreateModLogDTO = {
      type,
      post_id,
      topic_id,
      user_id,
      title,
      notified: false,
      notified_to: [],
      checked: false,
    };

    return this.modLogRepository.create(log);
  }

  private getMessageType(message: string): ModLogType | undefined {
    for (const [prefix, type] of Object.entries(MESSAGE_TYPE_MAP)) {
      if (message.startsWith(prefix)) {
        return type;
      }
    }
    return undefined;
  }
}
