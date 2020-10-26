import rateLimit from 'express-rate-limit';

const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  handler: (req, res) => {
    res.status(429).json({
      result: 'fail',
      error: 'Too many requests',
      data: null,
    });
  },
});

export default rateLimiter;
