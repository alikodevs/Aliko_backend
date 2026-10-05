export class StartConversationDto {
  recipientId: string;
  courseId?: number;
}

export class SendMessageDto {
  body: string;
}
