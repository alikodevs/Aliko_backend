export class SubmitSurveyDto {
  cohortId: number;
  courseRating: number;
  platformRating: number;
  instructorRating: number;
  comments?: string;
}

export class GetCohortSurveysDto {
  cohortId: number;
}
