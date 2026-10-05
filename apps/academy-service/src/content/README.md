# Content Delivery System

This module provides comprehensive content delivery features for the AlikoHub Academy platform, including streaming, access control, progress tracking, and optimization.

## Features

### 🎥 **Content Streaming**
- Adaptive streaming for video content (HLS, DASH)
- Quality selection based on network conditions
- CDN integration for global content delivery
- Pre-signed URLs for secure access

### 🔒 **Access Control**
- Role-based access control (Student, Instructor, Admin)
- Content ownership validation
- Enrollment-based access verification
- Secure content delivery

### 📊 **Progress Tracking**
- Real-time progress updates
- Content completion tracking
- Analytics and insights
- Performance metrics

### 🚀 **Optimization**
- Network-aware content delivery
- Bandwidth optimization
- Mobile-friendly delivery
- Caching strategies

## API Endpoints

### Content Access
```http
GET /content/lesson/:lessonId
GET /content/lesson/:lessonId/type/:type
GET /content/:id
GET /content/course/:courseId
```

### Content Streaming
```http
POST /content/stream
POST /content/access
POST /content/progress
```

### Content Management (Instructor/Admin)
```http
POST /content
PATCH /content/:id
PATCH /content/bulk
DELETE /content/:id
```

### Analytics & Recommendations
```http
GET /content/:id/analytics
GET /content/recommendations/:courseId
GET /content/search
```

## Guards

### ContentAccessGuard
Ensures users can only access content they're enrolled in:
- Students: Must be enrolled in the course
- Instructors: Must be teaching the course
- Admins: Full access

### InstructorContentGuard
Restricts content management to instructors and admins:
- Only instructors can manage their own course content
- Admins can manage all content

## Usage Examples

### 1. Get Content for a Lesson
```typescript
// Get all content for a lesson
const content = await contentService.findByLesson(lessonId);

// Get specific content types
const videos = await contentService.findByLessonAndType(lessonId, ContentType.VIDEO);
const pdfs = await contentService.findByLessonAndType(lessonId, ContentType.PDF);
```

### 2. Stream Video Content
```typescript
// Get streaming URL with quality options
const streamData = await contentService.getStreamingUrl({
  contentId: 1,
  quality: 'high',
  format: 'hls'
});
```

### 3. Track Progress
```typescript
// Update user progress
await contentService.updateProgress({
  contentId: 1,
  progress: 75,
  timeSpent: 300,
  lastPosition: '00:05:30'
}, userId);
```

### 4. Get Recommendations
```typescript
// Get personalized content recommendations
const recommendations = await contentService.getRecommendations(userId, courseId);
```

## Content Types

The system supports multiple content types:

- **VIDEO**: Streaming video content with adaptive quality
- **PDF**: Document content with preview capabilities
- **QUIZ**: Interactive quiz content
- **ASSIGNMENT**: Assignment submission content

## Configuration

### Environment Variables
```env
CDN_DOMAIN=your-cdn-domain.com
STREAMING_SERVICE_URL=your-streaming-service.com
```

### Content Metadata
Each content item can include:
- `title`: Content title
- `description`: Content description
- `fileSize`: File size in bytes
- `mimeType`: MIME type
- `thumbnailUrl`: Preview thumbnail
- `duration`: Video duration (for videos)
- `isPublic`: Public access flag
- `metadata`: Additional JSON metadata

## Security

### Access Control
- Firebase authentication integration
- Role-based permissions
- Content ownership validation
- Secure URL generation

### Data Protection
- Pre-signed URLs for sensitive content
- Access logging and analytics
- Rate limiting (to be implemented)
- Content encryption (to be implemented)

## Performance

### Optimization Features
- CDN integration for global delivery
- Adaptive streaming based on network conditions
- Caching strategies
- Bandwidth optimization
- Mobile-friendly delivery

### Monitoring
- Content access tracking
- Performance metrics
- Error logging
- Analytics dashboard

## Integration

### External Services
- **CDN**: AWS CloudFront, Cloudflare
- **Streaming**: Vimeo, AWS MediaConvert
- **Storage**: AWS S3, Google Cloud Storage
- **Analytics**: Custom analytics system

### Frontend Integration
The content delivery system is designed to work seamlessly with:
- React frontend components
- Video players (Video.js, Plyr)
- PDF viewers
- Progress tracking UI

## Testing

Run the test suite:
```bash
npm run test content-delivery.spec.ts
```

## Future Enhancements

- [ ] Real-time collaboration features
- [ ] Advanced analytics dashboard
- [ ] AI-powered content recommendations
- [ ] Offline content access
- [ ] Multi-language content support
- [ ] Advanced video processing
- [ ] Interactive content types
- [ ] Social learning features
