import { Test, TestingModule } from '@nestjs/testing';
import { ContentDeliveryService } from './content-delivery.service';
import { ContentType } from '../generated/client';

describe('ContentDeliveryService', () => {
  let service: ContentDeliveryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentDeliveryService],
    }).compile();

    service = module.get<ContentDeliveryService>(ContentDeliveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAdaptiveStreamingUrl', () => {
    it('should generate HLS streaming URL with quality', async () => {
      const result = await service.generateAdaptiveStreamingUrl(
        'https://example.com/video.mp4',
        { quality: 'high', format: 'hls' },
      );

      expect(result.url).toContain('.m3u8');
      expect(result.url).toContain('quality=high');
      expect(result.metadata.mimeType).toBe('application/x-mpegURL');
    });

    it('should generate DASH streaming URL', async () => {
      const result = await service.generateAdaptiveStreamingUrl(
        'https://example.com/video.mp4',
        { format: 'dash' },
      );

      expect(result.url).toContain('.mpd');
      expect(result.metadata.mimeType).toBe('application/dash+xml');
    });
  });

  describe('generateCdnUrl', () => {
    it('should generate CDN URL with region', async () => {
      const result = await service.generateCdnUrl(
        'https://example.com/video.mp4',
        ContentType.VIDEO,
        { region: 'us-east-1' },
      );

      expect(result).toContain('region=us-east-1');
    });

    it('should generate CDN URL with caching', async () => {
      const result = await service.generateCdnUrl(
        'https://example.com/video.mp4',
        ContentType.VIDEO,
        { cache: true },
      );

      expect(result).toContain('cache=1');
    });
  });

  describe('optimizeForNetwork', () => {
    it('should optimize for low bandwidth', async () => {
      const result = await service.optimizeForNetwork(
        'https://example.com/video.mp4',
        ContentType.VIDEO,
        { bandwidth: 500, latency: 50, connectionType: '3g' },
      );

      expect(result).toContain('quality=low');
      expect(result).toContain('mobile=1');
    });

    it('should optimize for high bandwidth', async () => {
      const result = await service.optimizeForNetwork(
        'https://example.com/video.mp4',
        ContentType.VIDEO,
        { bandwidth: 10000, latency: 20, connectionType: 'wifi' },
      );

      expect(result).toContain('quality=high');
    });
  });

  describe('generatePreviewUrl', () => {
    it('should generate video preview URL', async () => {
      const result = await service.generatePreviewUrl(
        'https://example.com/video.mp4',
        ContentType.VIDEO,
      );

      expect(result).toContain('preview=1');
      expect(result).toContain('duration=30');
    });

    it('should generate PDF preview URL', async () => {
      const result = await service.generatePreviewUrl(
        'https://example.com/document.pdf',
        ContentType.PDF,
      );

      expect(result).toContain('preview=1');
      expect(result).toContain('pages=1-3');
    });
  });

  describe('trackDeliveryMetrics', () => {
    it('should track delivery metrics', async () => {
      const metrics = {
        loadTime: 1500,
        bufferTime: 200,
        quality: 'high',
        errors: [],
      };

      const spy = jest.spyOn(service['logger'], 'log');
      await service.trackDeliveryMetrics(1, metrics);

      expect(spy).toHaveBeenCalledWith(
        'Tracking delivery metrics for content 1:',
        metrics,
      );
    });
  });
});
