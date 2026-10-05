export interface TrackProgressDto {
  userId: string;
  courseId: number;
  moduleId?: number;
  lessonId?: number;
  contentId?: number;
  status: 'in-progress' | 'completed';
  score?: number;
}
