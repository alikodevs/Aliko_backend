export interface InitTransactionDto {
  amount: number;
  currency: string;
  email: string;
  firstName?: string;
  lastName?: string;
  reference: string;
  purpose?: string;
  metadata?: any;
}

export interface InitSessionResponse {
  checkoutUrl: string;
  providerReference: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PENDING' | 'REFUNDED';
  providerReference: string;
  amount: number; // For double checking
}

export abstract class PaymentServiceInterface {
  abstract initializeTransaction(data: InitTransactionDto): Promise<InitSessionResponse>;
  abstract verifyWebhook(payload: any, signature: string): Promise<WebhookVerificationResult>;
}
