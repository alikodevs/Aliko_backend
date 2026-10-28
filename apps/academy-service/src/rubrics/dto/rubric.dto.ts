export interface RubricLevel {
  id: string;
  criterionId: string;
  name: string;
  description: string;
  points: number;
  order: number;
}

export interface RubricCriterion {
  id: string;
  rubricId: string;
  title: string;
  description?: string;
  maxPoints: number;
  order: number;
  levels?: RubricLevel[];
}

export interface Rubric {
  id: string;
  name: string;
  description?: string;
  type: 'DISCUSSION' | 'ASSIGNMENT';
  createdBy: string;
  isActive: boolean;
  criteria?: RubricCriterion[];
}

export class CreateRubricLevelDto {
  name: string;
  description: string;
  points: number;
  order?: number;
}

export class CreateRubricCriterionDto {
  title: string;
  description?: string;
  maxPoints: number;
  order?: number;
  levels?: CreateRubricLevelDto[];
}

export class CreateRubricDto {
  name: string;
  description?: string;
  type: 'DISCUSSION' | 'ASSIGNMENT';
  criteria?: CreateRubricCriterionDto[];
}

export class UpdateRubricLevelDto {
  id?: string;
  name: string;
  description: string;
  points: number;
  order?: number;
}

export class UpdateRubricCriterionDto {
  id?: string;
  title: string;
  description?: string;
  maxPoints: number;
  order?: number;
  levels?: UpdateRubricLevelDto[];
}

export class UpdateRubricDto {
  id: string;
  name?: string;
  description?: string;
  type?: 'DISCUSSION' | 'ASSIGNMENT';
  isActive?: boolean;
  criteria?: UpdateRubricCriterionDto[];
}

export class ListRubricsDto {
  type?: 'DISCUSSION' | 'ASSIGNMENT';
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export class CloneRubricDto {
  rubricId: string;
  newName?: string;
}

export class EvaluateCriterionScoreDto {
  criterionId: string;
  levelId?: string;
  points: number;
  feedback?: string;
}

export class EvaluateWithRubricDto {
  rubricId: string;
  scores?: EvaluateCriterionScoreDto[];
  criteriaScores?: EvaluateCriterionScoreDto[];
  studentId?: string;
  evaluatorId?: string;
  overallFeedback?: string;
  selectedLevelIds?: string[];
  customFeedback?: string;
}
