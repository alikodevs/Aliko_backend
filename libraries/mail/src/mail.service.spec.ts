import { MailService } from './mail.service';

describe('@alikohub/mail MailService', () => {
  const envKeys = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
  ] as const;
  const backup: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of envKeys) {
      backup[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (backup[key] === undefined) delete process.env[key];
      else process.env[key] = backup[key];
    }
  });

  it('simulates send when SMTP is not configured', async () => {
    const mail = new MailService();
    const ok = await mail.sendMail({
      to: 'test@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
      fromName: 'AlikoHub',
    });
    expect(ok).toBe(true);
  });
});
