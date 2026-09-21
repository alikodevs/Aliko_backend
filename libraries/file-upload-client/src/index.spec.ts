import { FILE_UPLOAD_MESSAGE_PATTERNS, FILE_UPLOAD_SERVICE, getFileUploadHttpBaseUrl } from './index';

describe('@alikohub/file-upload-client', () => {
  it('exports stable tokens', () => {
    expect(FILE_UPLOAD_SERVICE).toBe('FILE_UPLOAD_SERVICE');
    expect(FILE_UPLOAD_MESSAGE_PATTERNS.UPLOAD_FILE).toBe('upload_file');
  });

  it('builds HTTP base URL from env defaults', () => {
    const prevHost = process.env.FILE_UPLOAD_SERVICE_HOST;
    const prevPort = process.env.FILE_UPLOAD_SERVICE_PORT;
    delete process.env.FILE_UPLOAD_SERVICE_HOST;
    delete process.env.FILE_UPLOAD_SERVICE_PORT;

    expect(getFileUploadHttpBaseUrl()).toBe('http://localhost:3009');

    if (prevHost === undefined) delete process.env.FILE_UPLOAD_SERVICE_HOST;
    else process.env.FILE_UPLOAD_SERVICE_HOST = prevHost;
    if (prevPort === undefined) delete process.env.FILE_UPLOAD_SERVICE_PORT;
    else process.env.FILE_UPLOAD_SERVICE_PORT = prevPort;
  });

  it('reads host/port from config-like object', () => {
    const url = getFileUploadHttpBaseUrl({
      get: (key: string) =>
        key === 'FILE_UPLOAD_SERVICE_HOST'
          ? 'file-upload-service'
          : key === 'FILE_UPLOAD_SERVICE_PORT'
            ? '3009'
            : undefined,
    });
    expect(url).toBe('http://file-upload-service:3009');
  });
});
