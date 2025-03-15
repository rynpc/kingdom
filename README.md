# Kingdom Project

A Node.js/TypeScript service for kingdom management and operations.

## Features

- Express-based REST API
- TypeScript for type safety
- Secure by default with Helmet middleware
- Comprehensive logging with Winston
- Environment configuration with dotenv
- Jest testing framework
- Docker support

## Getting Started

### Prerequisites

- Node.js 20.x
- Yarn 4.x

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/kingdom.git
cd kingdom

# Install dependencies
yarn install
```

### Development

Run the development server with hot reload:
```bash
yarn dev
```

### Testing

Run the test suite:
```bash
yarn test
```

### Building

Build for production:
```bash
yarn build
```

### Docker

Build the container:
```bash
docker build -t kingdom .
```

Run the container:
```bash
docker run -p 3000:3000 kingdom
```

## Configuration

Create a `.env` file in the root directory with the following variables:
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Winston log level (default: info)
- `RATE_LIMIT_WINDOW`: Rate limiting window in minutes (default: 15)
- `RATE_LIMIT_MAX`: Maximum requests per window (default: 100)

## API Documentation

### Authentication
All API endpoints require authentication using Bearer token:
```
Authorization: Bearer <your-token>
```

### Endpoints

#### GET /api/health
Health check endpoint.

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T12:00:00Z"
}
```

#### Error Responses
The API uses standard HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

MIT License - see the [LICENSE](LICENSE) file for details
