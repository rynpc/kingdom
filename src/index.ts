import express from 'express';
import helmet from 'helmet';
import winston from 'winston';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { rateLimit as rateLimitConfig } from './config/rate-limit';
import { createStream } from 'rotating-file-stream';
import path from 'path';
import { body, validationResult } from 'express-validator';
import { proxyConfig } from './config/proxy';
import { corsOptions } from './config/cors';

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

// Configure proxy trust based on environment
app.set('trust proxy', proxyConfig.trustProxy);

// Apply rate limiting
const limiter = rateLimit({
  ...rateLimitConfig,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many requests from this IP, please try again later'
    });
  }
});

app.use(limiter);

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
      frameSrc: ["'none'"],
      upgradeInsecureRequests: []
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
app.use(express.json({
  limit: '10kb',
  verify: (req: express.Request, res: express.Response, buf: Buffer, encoding: string) => {
    try {
      const content = buf.toString(encoding as BufferEncoding);
      JSON.parse(content);
    } catch (e) {
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

const injectionPattern = /('%27)|(')|(--)|(%23)|(#)|(%3B)|(;)|(%2F)|(\/\*)|(DROP\s+TABLE)|(%22)|(")|(SELECT\s+FROM)|(%3D)|(=)|(%7C)|(\|)/;

// Test endpoint with validation
app.post('/api/test', [
  body('message')
    .exists().withMessage('Message is required')
    .isString().withMessage('Message must be a string')
    .trim()
    .notEmpty().withMessage('Message is required')
    .custom((value) => {
      // Check for injection attempts and malicious content
      if (injectionPattern.test(value)) {
        throw new Error('Invalid characters detected');
      }
      return true;
    })
], (req: express.Request, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    logger.warn('Validation failed:', { errors: errors.array() });
    return res.status(400).json({ error: firstError.msg });
  }

  try {
    const message = req.body.message;
    // Double check for malicious content
    if (injectionPattern.test(message)) {
      return res.status(400).json({ error: 'Invalid characters detected' });
    }
    logger.info('Test endpoint called:', { message });
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error in test endpoint:', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Test routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'success' });
});

// Method not allowed handler
app.all('/api/test', (req, res) => {
  res.status(405).json({ error: 'Method not allowed' });
});

// Error handling middleware - must be last
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Error occurred:', { error: err.message });
  if (err.message === 'Invalid JSON') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  return res.status(500).json({ error: 'Internal server error' });
});

export { app };

// Only start the server if this file is run directly
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
  });
}
