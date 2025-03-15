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

## License

MIT License - see the [LICENSE](LICENSE) file for details
