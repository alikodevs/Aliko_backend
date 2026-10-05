import { Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * GeoIP service using ip-api.com to detect country from IP address.
 * Matches the pattern from the PHP GeoService — cached per IP, with fallback to 'ET'.
 */

const logger = new Logger('GeoResolver');

// Simple in-memory cache: IP -> { countryCode, expiresAt }
const geoCache = new Map<string, { countryCode: string; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function cleanIp(ip?: string): string | undefined {
  if (!ip) return undefined;
  let cleaned = ip.split(',')[0].trim();
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.substring(7);
  }
  return cleaned;
}

/**
 * Get country code from IP address using ip-api.com.
 * Returns 'ET' for local/private IPs, null on failure.
 */
async function getCountryCode(rawIp?: string): Promise<string | null> {
  const ip = cleanIp(rawIp);

  // Handle local development / private IPs
  if (
    !ip ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.') ||
    ip.startsWith('10.') ||
    ip === 'localhost'
  ) {
    logger.log(`Local/private IP detected (${ip || 'N/A'}), defaulting country to ET`);
    return 'ET';
  }

  // Check cache
  const cached = geoCache.get(ip);
  if (cached && cached.expiresAt > Date.now()) {
    logger.log(`GeoIP cache hit for ${ip}: ${cached.countryCode}`);
    return cached.countryCode;
  }

  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`, {
      timeout: 5000,
    });

    if (response.data && response.data.countryCode) {
      const countryCode = response.data.countryCode.toUpperCase();
      // Cache the result
      geoCache.set(ip, {
        countryCode,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      logger.log(`GeoIP lookup for ${ip}: ${countryCode} (${response.data.country || 'N/A'})`);
      return countryCode;
    }
  } catch (error) {
    logger.error(`GeoIP lookup failed for IP ${ip}: ${error.message}`);
  }

  return null;
}

export interface GeoPaymentConfig {
  provider: 'CHAPA' | 'STRIPE';
  currency: string;
}

/**
 * Determines the payment provider and currency based on IP, explicit provider, and explicit currency.
 * Follows the same logic as the PHP reference:
 *   1. If provider is not set or 'auto':
 *      - If currency is explicitly ETB → chapa
 *      - If currency is explicitly USD → stripe
 *      - Otherwise, use country code: ET → chapa, else → stripe
 *   2. If currency is not set:
 *      - chapa → ETB, stripe → USD
 */
export async function resolvePaymentConfig(
  clientIp?: string,
  clientCountry?: string,
  explicitProvider?: string,
  explicitCurrency?: string,
): Promise<GeoPaymentConfig> {
  let provider = explicitProvider?.toUpperCase();
  let currency = explicitCurrency?.toUpperCase();

  // 1. Determine provider if not explicitly set
  if (!provider || provider === 'AUTO') {
    if (currency === 'ETB') {
      provider = 'CHAPA';
    } else if (currency === 'USD') {
      provider = 'STRIPE';
    } else {
      // Use GeoIP to determine country
      let country = clientCountry?.toUpperCase()?.trim();

      if (!country || country === 'XX' || country === 'T1') {
        // Resolve from IP using ip-api.com
        country = (await getCountryCode(clientIp)) ?? 'ET';
      }

      provider = country === 'ET' ? 'CHAPA' : 'STRIPE';
      logger.log(
        `Provider determined for IP ${clientIp || 'N/A'} (${country}): ${provider}`,
      );
    }
  }

  // 2. Determine currency if not explicitly set
  if (!currency || currency === 'AUTO') {
    currency = provider === 'CHAPA' ? 'ETB' : 'USD';
  }

  logger.log(
    `Payment config resolved: provider=${provider}, currency=${currency} [IP: ${clientIp || 'N/A'}, Country: ${clientCountry || 'N/A'}]`,
  );

  return {
    provider: provider as 'CHAPA' | 'STRIPE',
    currency,
  };
}
