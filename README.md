<div align="center">
# Shift Backend

A powerful backend service for AI-driven Solana interactions, built with Express.js and TypeScript.

![TypeScript](https://img.shields.io/badge/TypeScript-%5E5.0.0-blue?style=for-the-badge)
![Express.js](https://img.shields.io/badge/Express.js-%5E4.21.2-green?style=for-the-badge)
![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen?style=for-the-badge)
![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=for-the-badge)

</div>

## 🌟 Overview

Shift Backend provides a robust API layer for managing AI-powered Solana blockchain operations. It integrates OpenAI's GPT models with Solana's blockchain capabilities to enable intelligent automation and interaction.

## ⚡ Key Features

- **AI Integration**
  - OpenAI GPT integration
  - Streaming AI responses
  - Intelligent error handling
  - Context-aware interactions

- **Blockchain Operations**
  - Solana transaction management
  - Token operations
  - NFT handling
  - DeFi protocol interactions

- **API Infrastructure**
  - RESTful endpoints
  - Real-time WebSocket support
  - Request validation
  - Rate limiting

- **Security**
  - CORS protection
  - Request logging
  - Input sanitization
  - Error tracking

## 🚀 Getting Started

### Prerequisites
```bash
node >= 22.0.0
pnpm >= 8.0.0
```

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/shift-backend.git

# Install dependencies
pnpm install
```

### Environment Setup
Create a `.env` file with the following variables:
```env
OPENAI_API_KEY=your_openai_api_key
RPC_URL=your_rpc_url
SOLANA_PRIVATE_KEY=your_private_key
```

### Running the Server
```bash
# Development
pnpm dev

# Production
pnpm start
```

## 📡 API Endpoints

### Chat Endpoint
```http
POST /api/chat
Content-Type: application/json

{
  "message": "string",
  "publicKey": "string"
}
```

### Price Cache
```http
GET /api/price/:token
```

## 🛠️ Development

```bash
# Run tests
pnpm test

# Build
pnpm build

# Lint
pnpm lint

# Format code
pnpm format
```

## 📦 Core Dependencies

- `express`: Web framework
- `@solana/web3.js`: Solana blockchain interaction
- `openai`: AI model integration
- `langchain`: LLM framework
- `cors`: Cross-origin resource sharing
- `dotenv`: Environment configuration

## 🔐 Security

This service handles sensitive information including:
- Private keys
- API keys
- User data

Always follow security best practices and never commit sensitive data.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- [Solana Agent Kit](https://github.com/sendaifun/solana-agent-kit)
- [Vercel AI SDK](https://github.com/vercel/ai)
- [LangChain](https://github.com/langchain-ai/langchainjs)

---

<div align="center">
Built with ❤️ for the Solana ecosystem
</div>
