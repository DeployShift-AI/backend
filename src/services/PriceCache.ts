// Interface defining the structure of our price cache
// Stores USD price and 24h price change for each token
interface PriceCache {
  [key: string]: {
    usd: number;
    usd_24h_change: number;
    last_updated: Date;
  } | undefined;
}

/**
 * Service to cache and manage cryptocurrency prices
 * Automatically fetches and updates prices from CoinGecko at regular intervals
 */
export class PriceCacheService {
  // In-memory cache to store token prices
  private cache: PriceCache = {};
  // Timer for periodic price updates
  private updateInterval: NodeJS.Timer;
  // Update prices every hour to stay within rate limits
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour for the price caching.

  constructor() {
    // Initialize cache with first price fetch
    this.updatePrices();
    // Set up periodic price updates
    this.updateInterval = setInterval(() => {
      this.updatePrices();
    }, this.CACHE_DURATION);
  }

  /**
   * Get the cached price data for a specific token
   * @param symbol Token symbol (e.g., 'BTC', 'ETH', 'SOL')
   * @returns Price data or undefined if not found
   */
  getPrice(symbol: string) {
    return this.cache[symbol];
  }

  /**
   * Fetch latest prices from CoinGecko and update the cache
   * Handles BTC, ETH, and SOL prices with their 24h changes
   */
  private async updatePrices() {
    try {
      console.log('Updating price cache...');
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true',
      );
      
      const data = await response.json();
      console.log('Raw CoinGecko Response:', JSON.stringify(data, null, 2));
      
      // Validate response data
      if (!data.bitcoin || !data.ethereum || !data.solana) {
        console.error('Invalid response format from CoinGecko:', data);
        return;
      }
      
      // Update cache with new prices
      this.cache = {
        BTC: {
          usd: data.bitcoin.usd,
          usd_24h_change: data.bitcoin.usd_24h_change,
          last_updated: new Date()
        },
        ETH: {
          usd: data.ethereum.usd,
          usd_24h_change: data.ethereum.usd_24h_change,
          last_updated: new Date()
        },
        SOL: {
          usd: data.solana.usd,
          usd_24h_change: data.solana.usd_24h_change,
          last_updated: new Date()
        }
      };
    } catch (error) {
      console.error('Failed to update price cache:', error);
    }
  }
} 