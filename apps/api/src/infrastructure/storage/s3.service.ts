import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private client: S3Client | null = null;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly config: ConfigService) {
    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');
    this.region = this.config.get<string>('AWS_REGION', 'us-east-2');
    this.bucket = this.config.get<string>('AWS_S3_BUCKET', 'loop-platform-uploads');

    if (accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region: this.region,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log(`S3 configured: bucket=${this.bucket}, region=${this.region}`);
    } else {
      this.logger.warn('S3 not configured — uploads will use local disk');
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async upload(params: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<string> {
    if (!this.client) {
      throw new Error('S3 not configured');
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );

    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${params.key}`;
    this.logger.log(`Uploaded to S3: ${params.key}`);
    return url;
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      this.logger.log(`Deleted from S3: ${key}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete from S3: ${error.message}`);
    }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!this.client) {
      throw new Error('S3 not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
