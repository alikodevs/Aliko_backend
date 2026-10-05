import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { 
  PaymentServiceInterface, 
  InitTransactionDto, 
  InitSessionResponse, 
  WebhookVerificationResult 
} from '../interfaces/payment-service.interface';

@Injectable()
export class ChapaService implements PaymentServiceInterface {
  private readonly logger = new Logger(ChapaService.name);
  private readonly baseUrl = 'https://api.chapa.co/v1';
  private readonly secretKey: string;

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('CHAPA_SECRET');
  }

  async initializeTransaction(data: InitTransactionDto): Promise<InitSessionResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          amount: data.amount,
          currency: data.currency,
          email: data.email,
          first_name: data.firstName || 'Customer',
          last_name: data.lastName || '',
          tx_ref: data.reference,
          callback_url: this.configService.get('CHAPA_CALLBACK_URL'),
          // return_url: data.returnUrl, // Optional
          meta: data.metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      if (response.data.status === 'success') {
        return {
          checkoutUrl: response.data.data.checkout_url,
          providerReference: data.reference, // Chapa uses tx_ref as reference
        };
      }

      throw new Error(`Chapa initialization failed: ${response.data.message}`);
    } catch (error) {
      this.logger.error(`Chapa initialization error: ${error.message}`);
      throw error;
    }
  }

  async verifyWebhook(payload: any, signature: string): Promise<WebhookVerificationResult> {
    // Chapa doesn't strictly require signature if you verify via API,
    // but a well-designed flow should check it or call verify endpoint.
    // For Chapa, we usually call their verify endpoint with the reference.
    
    const reference = payload.tx_ref;
    
    try {
        const response = await axios.get(`${this.baseUrl}/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${this.secretKey}`,
            },
        });

        if (response.data.status === 'success') {
            const data = response.data.data;
            return {
                isValid: true,
                status: data.status === 'success' ? 'COMPLETED' : 'FAILED',
                providerReference: reference,
                amount: data.amount,
            };
        }

        return {
            isValid: false,
            status: 'FAILED',
            providerReference: reference,
            amount: 0,
        };
    } catch (error) {
        this.logger.error(`Chapa verification error: ${error.message}`);
        return {
            isValid: false,
            status: 'FAILED',
            providerReference: reference,
            amount: 0,
        };
    }
  }
}
