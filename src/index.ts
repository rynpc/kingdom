import express from 'express';
import helmet from 'helmet';
import winston from 'winston';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { rateLimit as rateLimitConfig } from './config/rate-limit';
import { corsOptions } from './config/cors';
import { createStream } from 'rotating-file-stream';
import path from 'path';
import { body, validationResult } from 'express-validator';

dotenv.config();

// Set up rotating logs
const logDirectory = path.join(__dirname, '../logs');
const accessLogStream = createStream('access.log', {
  interval: '1d',
  path: logDirectory,
  compress: 'gzip'
});

const errorLogStream = createStream('error.log', {
  interval: '1d',
  path: logDirectory,
  compress: 'gzip'
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.Stream({
      stream: errorLogStream,
      level: 'error'
    }),
    new winston.transports.Stream({
      stream: accessLogStream
    })
  ]
});

const app = express();

// Trust proxy - needed if behind a reverse proxy
app.set('trust proxy', 1);

// Apply rate limiting
app.use(rateLimit(rateLimitConfig));

// Enhanced security with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
  noSniff: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' }
}));

// CORS configuration
app.use(cors(corsOptions));

// Body parsing with limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Test endpoint with validation
app.post('/api/test', [
  body('message')
    .trim()
    .isLength({ min: 1, max: 100 })
    .custom(value => {
      if (/<[^>]*>/.test(value)) {
        throw new Error('HTML tags are not allowed');
      }
      return true;
    })
    .escape(),
], async (req: express.Request, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation failed:', { errors: errors.array() });
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    logger.info('Test endpoint called:', { message: req.body.message });
    res.json({ success: true, message: 'Security measures are working!' });
  } catch (error) {
    logger.error('Error in test endpoint:', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response) => {
  logger.error('Unhandled error:', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

export { app };

// Only start the server if this file is run directly
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
  });
}
