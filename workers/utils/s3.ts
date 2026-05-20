// S3-compatible storage upload utility (AWS Signature V4)
function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(data: string | ArrayBuffer): Promise<string> {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return hex(await crypto.subtle.digest('SHA-256', buf));
}

async function hmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const keyObj = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', keyObj, new TextEncoder().encode(data));
}

async function getSignatureKey(secret: string, date: string, region: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + secret), date);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, 's3');
  return hmacSha256(kService, 'aws4_request');
}

// Upload a file to S3-compatible storage with AWS Signature V4
export async function s3PutObject(
  endpoint: string,
  accessKey: string,
  secretKey: string,
  region: string,
  bucket: string,
  objectKey: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<Response> {
  const host = new URL(endpoint).host;
  const date = new Date().toISOString().replace(/[:-]/g, '').substring(0, 8);
  const amzDate = date + 'T000000Z';

  const contentHash = await sha256(body);

  const canonicalUri = '/' + bucket + '/' + objectKey.split('/').map(encodeURIComponent).join('/');
  const canonicalQuery = '';
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${contentHash}\nx-amz-date:${amzDate}\n`;

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    contentHash,
  ].join('\n');

  const credentialScope = `${date}/${region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256(canonicalRequest),
  ].join('\n');

  const signingKey = await getSignatureKey(secretKey, date, region);
  const signature = hex(await hmacSha256(signingKey, stringToSign));

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const url = `${endpoint.replace(/\/+$/, '')}/${bucket}/${objectKey}`;
  return fetch(url, {
    method: 'PUT',
    body,
    headers: {
      'Host': host,
      'x-amz-content-sha256': contentHash,
      'x-amz-date': amzDate,
      'Authorization': authorization,
      'Content-Type': contentType,
    },
  });
}
