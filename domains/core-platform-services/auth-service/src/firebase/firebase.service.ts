import { Injectable, OnModuleInit, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ensureFirebaseAdmin, getFirebaseAuth } from '@alikohub/firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private ready = false;

  onModuleInit() {
    try {
      // Optional so auth stays up when credentials are absent on the host
      this.ready = ensureFirebaseAdmin({ optional: true });
      if (this.ready) {
        this.logger.log('Firebase Admin initialized with real credentials');
      } else {
        this.logger.warn(
          'Firebase Admin not configured. Place a valid service account JSON at FIREBASE_SERVICE_ACCOUNT_PATH (default: ./firebase-service-account.json).',
        );
      }
    } catch (error) {
      this.ready = false;
      this.logger.error('Failed to initialize Firebase Admin:', error);
      this.logger.warn('Continuing without Firebase');
    }
  }

  isReady() {
    return this.ready;
  }

  getAuth() {
    if (!this.ready && !ensureFirebaseAdmin({ optional: true })) {
      throw new ServiceUnavailableException(
        'Firebase is not configured. Add a valid firebase-service-account.json and restart auth-service.',
      );
    }
    this.ready = true;
    return getFirebaseAuth();
  }
}
