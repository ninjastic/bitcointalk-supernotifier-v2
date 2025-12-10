import { Router } from 'express';

const notFoundRouter = Router();

notFoundRouter.all('*', (request, response) => {
  response.status(404).json({
    result: 'fail',
    message: 'Invalid endpoint or method',
    data: null,
  });
});

export default notFoundRouter;
