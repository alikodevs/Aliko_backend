export class CreateStoryChapterDto {
  year?: number;
  projectName?: string;
  storyText: string;
  photos?: string[];
  captions?: string[];
  tags?: string[];
  orderIndex?: number;
  isPublished?: boolean = true;
}

export class UpdateStoryChapterDto {
  year?: number;
  projectName?: string;
  storyText?: string;
  photos?: string[];
  captions?: string[];
  tags?: string[];
  orderIndex?: number;
  isPublished?: boolean;
}
