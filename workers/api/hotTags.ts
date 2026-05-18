import { successResponse, errorResponse } from '../utils/response';

export async function handleHotTags(): Promise<Response> {
  try {
    const res = await fetch('https://top.baidu.com/api/board?platform=boards&tab=realtime', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) return errorResponse('Failed to fetch hot tags', 502);
    const json: any = await res.json();
    const words: string[] = json?.data?.cards?.[0]?.content?.map((c: any) => c.word) || [];
    return successResponse(words);
  } catch (err: any) {
    return errorResponse(err.message, 502);
  }
}
