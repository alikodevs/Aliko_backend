/**
 * Strips `correctAnswer` from an exercise object so quiz/exam answers
 * are never exposed to students or unauthenticated callers (WABON CA-02).
 */
export function stripExerciseAnswer<T extends Record<string, any>>(
  exercise: T,
): Omit<T, 'correctAnswer'> {
  if (!exercise || typeof exercise !== 'object') return exercise;
  const { correctAnswer: _correctAnswer, ...rest } = exercise;
  return rest;
}

/**
 * Recursively strips `correctAnswer` from all exercises nested inside
 * a course's modules and lessons unless `canViewAnswers` is true.
 */
export function sanitizeCourseExercises<T extends Record<string, any>>(
  course: T,
  canViewAnswers: boolean,
): T {
  if (canViewAnswers || !course || !Array.isArray(course.modules)) {
    return course;
  }

  return {
    ...course,
    modules: course.modules.map((mod: any) => ({
      ...mod,
      ...(Array.isArray(mod.exercises)
        ? { exercises: mod.exercises.map(stripExerciseAnswer) }
        : {}),
      ...(Array.isArray(mod.lessons)
        ? {
            lessons: mod.lessons.map((lesson: any) => ({
              ...lesson,
              ...(Array.isArray(lesson.exercises)
                ? { exercises: lesson.exercises.map(stripExerciseAnswer) }
                : {}),
            })),
          }
        : {}),
    })),
  };
}
