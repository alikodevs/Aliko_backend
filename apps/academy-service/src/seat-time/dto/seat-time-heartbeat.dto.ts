export class SeatTimeHeartbeatDto {
  courseId: number;
  lessonId: number;
  contentId?: number;
  /** Seconds of active engagement since last heartbeat (max 120s per pulse) */
  activeSeconds: number;
  /** Client-reported idle duration in seconds (mouse/keyboard inactivity) */
  idleSeconds?: number;
}
