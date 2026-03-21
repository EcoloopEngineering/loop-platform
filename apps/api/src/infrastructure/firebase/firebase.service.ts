import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: admin.app.App;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const privateKey = this.configService
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');

    if (!admin.apps.length) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey,
          clientEmail,
        }),
      });
    } else {
      this.app = admin.apps[0]!;
    }
  }

  async verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
    return this.app.auth().verifyIdToken(token);
  }

  async getUser(uid: string): Promise<admin.auth.UserRecord> {
    return this.app.auth().getUser(uid);
  }

  get messaging(): admin.messaging.Messaging {
    return this.app.messaging();
  }
}
