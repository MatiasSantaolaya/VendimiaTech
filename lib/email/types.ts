export type EmailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
};
export interface EmailProvider {
  send(message: EmailMessage): Promise<{ id: string; accepted: boolean }>;
}
