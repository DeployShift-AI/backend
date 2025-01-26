import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { SolanaAgentKit } from "./src";
import { createVercelAITools } from "./src";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import * as dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";
import { PriceCacheService } from "./src/services/PriceCache";

// Types
interface Colors {
  reset: string;
  bright: string;
  dim: string;
  cyan: string;
  yellow: string;
  green: string;
  red: string;
  blue: string;
}

interface ChatRequest {
  message: string;
}

dotenv.config();

const app = express();
app.use(cors({
  origin: 'http://localhost:5173', // Frontend URL
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Utility for timestamps
const getTimestamp = (): string => new Date().toISOString();

// Console colors
const colors: Colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
};

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction): void => {
  console.log(`\n${colors.dim}[${getTimestamp()}]${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}➜ New Request${colors.reset}`);
  console.log(`${colors.yellow}Method:${colors.reset} ${req.method}`);
  console.log(`${colors.yellow}Path:${colors.reset} ${req.path}`);
  console.log(
    `${colors.yellow}Body:${colors.reset}`,
    JSON.stringify(req.body, null, 2)
  );
  next();
});

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required");
}

if (!process.env.HELIUS_API_KEY) {
  throw new Error("HELIUS_API_KEY is required");
}

if (!process.env.RPC_URL) {
  throw new Error("RPC_URL is required");
}

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize price cache service for BTC, ETH, and SOL prices from CoinGecko
const priceCache = new PriceCacheService();

// Store user sessions in memory - maps wallet public key to their agent instance
const userSessions = new Map();

app.post('/api/init-session', async (req: Request, res: Response) => {
  try {
    console.log("1. Received init-session request:", req.body);
    const { publicKey } = req.body;

    if (!publicKey) {
      console.error("2. Missing public key in request");
      throw new Error("Public key is required");
    }

    console.log("3. Creating SolanaAgentKit instance...");
    const solanaAgent = new SolanaAgentKit(
      publicKey,
      process.env.RPC_URL,
      {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        HELIUS_API_KEY: process.env.HELIUS_API_KEY,
      }
    );

    console.log("4. Storing session for public key:", publicKey);
    userSessions.set(publicKey, {
      agent: solanaAgent,
      tools: createVercelAITools(solanaAgent)
    });

    console.log("5. Session initialized successfully");
    res.json({ success: true });
  } catch (error) {
    console.error("Error in init-session:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat', async (req: Request<{}, {}, ChatRequest>, res: Response) => {
  try {
    console.log("1. Received chat request:", req.body);
    const { message, publicKey } = req.body;

    if (!message || !publicKey) {
      console.error("2. Missing message or public key");
      throw new Error("Message and public key are required");
    }

    console.log("3. Looking up session for public key:", publicKey);
    const session = userSessions.get(publicKey);
    if (!session) {
      console.error("4. Session not found for public key:", publicKey);
      throw new Error("Session not found - please connect wallet first");
    }

    console.log("5. Processing message with AI...");
    const response = await streamText({
      prompt: message,
      tools: session.tools,
      model: openai("gpt-4o-mini"),
      temperature: 0.7,
      system: `You are a helpful agent that can interact onchain using the Solana Agent Kit...`,
      maxSteps: 10,
    });

    let fullResponse = '';
    for await (const chunk of response.textStream) {
      fullResponse += chunk;
    }

    console.log("6. AI response generated successfully");
    res.json({ response: fullResponse });
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process request';
    res.status(500).json({ error: errorMessage });
  }
});

app.post('/api/sign-transaction', async (req: Request, res: Response) => {
  try {
    const { transaction, publicKey } = req.body;

    // Get the session
    const session = userSessions.get(publicKey);
    if (!session) {
      throw new Error("Session not found");
    }

    // The transaction will need to be signed by the frontend
    res.json({
      transaction,
      requiresSignature: true
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/portfolio/:publicKey', async (req: Request, res: Response) => {
  try {
    const { publicKey } = req.params;
    console.log('\n=== Portfolio Request Start ===');
    console.log('Public Key:', publicKey);

    const session = userSessions.get(publicKey);
    if (!session) {
      throw new Error("Session not found");
    }

    // Get balances from the connected wallet
    console.log('\n1. Fetching wallet balances...');
    const balances = await session.agent.get_token_balance();
    console.log('Wallet Balances Response:', JSON.stringify(balances, null, 2));

    // Get SOL price using Pyth
    console.log('\n2. Fetching SOL price from Pyth...');
    const solPriceFeedID = await session.agent.getPythPriceFeedID("SOL");
    const solPrice = await session.agent.getPythPrice(solPriceFeedID);
    console.log('SOL Price from Pyth:', solPrice);

    // Calculate SOL value
    const solBalance = Number(balances.sol.toFixed(8));
    const solUsdValue = Number((solBalance * solPrice).toFixed(2));
    console.log('SOL Balance:', solBalance);
    console.log('Calculated SOL USD Value:', solUsdValue);

    // Format tokens and get their prices from Jupiter
    console.log('\n3. Processing token prices...');
    const formattedTokens = await Promise.all(balances.tokens.map(async token => {
      let usdValue = 0;

      // For USDC, use 1:1 ratio
      if (token.symbol === 'USDC') {
        usdValue = token.balance;
      } else {
        try {
          // Get price from Jupiter for other tokens
          const price = await session.agent.fetchTokenPrice(token.tokenAddress);
          usdValue = token.balance * price;
          console.log(`Price for ${token.symbol}:`, price);
        } catch (err) {
          console.log(`Failed to get price for ${token.symbol}:`, err);
        }
      }

      console.log(`Processing token ${token.symbol}:`, {
        balance: token.balance,
        usdValue
      });

      return {
        token: token.symbol,
        symbol: token.name,
        balance: Number(token.balance.toFixed(8)),
        usdValue: Number(usdValue.toFixed(2))
      };
    }));

    // Get watchlist prices from cache
    console.log('\n5. Fetching watchlist prices...');
    const watchlistPrices = {
      BTC: priceCache.getPrice('BTC'),
      ETH: priceCache.getPrice('ETH'),
      SOL: priceCache.getPrice('SOL')
    };
    console.log('Watchlist prices:', watchlistPrices);

    const response = {
      sol: solBalance,
      solPrice: solPrice,
      solUsdValue: solUsdValue,
      tokens: formattedTokens,
      watchlist: {
        BTC: {
          price: watchlistPrices.BTC?.usd || 0,
          change: watchlistPrices.BTC?.usd_24h_change || 0
        },
        ETH: {
          price: watchlistPrices.ETH?.usd || 0,
          change: watchlistPrices.ETH?.usd_24h_change || 0
        },
        SOL: {
          price: watchlistPrices.SOL?.usd || 0,
          change: watchlistPrices.SOL?.usd_24h_change || 0
        }
      }
    };

    console.log('\n6. Final Response:', JSON.stringify(response, null, 2));
    console.log('=== Portfolio Request End ===\n');

    res.json(response);
  } catch (error) {
    console.error('\n=== Portfolio Error ===');
    console.error('Error details:', error);
    console.error('=== Error End ===\n');
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.clear();
  console.log(`\n${colors.bright}${colors.green}=== Solana Agent Server ===${colors.reset}`);
  console.log(`${colors.dim}[${getTimestamp()}]${colors.reset}`);
  console.log(`${colors.cyan}Server running on port ${PORT}${colors.reset}`);
  console.log(`${colors.yellow}Environment:${colors.reset} ${process.env.NODE_ENV || 'development'}`);
  console.log(`${colors.bright}Ready for requests...${colors.reset}\n`);
});