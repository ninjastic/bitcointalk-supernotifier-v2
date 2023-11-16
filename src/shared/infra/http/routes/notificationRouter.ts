import { Router, Request, Response } from 'express';
import Joi from 'joi';

import { addTelegramJob } from '../../bull/queues/telegramQueue';

import NotificationApiKeyRepository from '../../../../modules/users/infra/typeorm/repositories/NotificationApiKeyRepository';

const notificationRouter = Router();

notificationRouter.post('/', async (request: Request, response: Response) => {
  const { body: requestBody } = request;

  const validationSchema = Joi.object().keys({
    api_key: Joi.string().required(),
    message: Joi.string().required()
  });

  const { error, value: body } = validationSchema.validate(requestBody);

  if (error) {
    return response.status(400).json({ error: true, message: error.details.map(detail => detail.message).join(', ') });
  }

  const notificationApiKeyRepository = new NotificationApiKeyRepository();
  const notificationApiKey = await notificationApiKeyRepository.findOne({ api_key: body.api_key });

  if (!notificationApiKey) {
    return response.status(404).json({ error: true, message: 'api_key is invalid' });
  }

  await addTelegramJob('sendApiNotification', {
    telegram_id: notificationApiKey.telegram_id,
    message: body.message
  });

  return response.json({ error: false, message: 'Notification dispatched' });
});

export default notificationRouter;
