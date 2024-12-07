import { serve } from 'bun';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

// Types
interface VideoVersion {
  url: string;
  width: number;
  height: number;
  type?: string;
  bitrate?: number;
}

interface FetchResult {
  videoVersions: VideoVersion[];
  videoUrl: string;
  allUrls: string[];
}

interface DownloadRequest {
  url: string;
}

interface DownloadResponse {
  success: boolean;
  videoUrl?: string;
  filename?: string;
  error?: string;
  details?: string;
}

interface DebugInfo {
  method: string;
  step: string;
  data?: any;
  error?: Error;
  timestamp: string;
}

interface InstagramServiceConfig {
  debug: boolean;
  logLevel: 'error' | 'info' | 'debug' | 'verbose';
  dumpHtml: boolean;
  dumpPath: string;
}

// Your existing HTML_TEMPLATE constant here
const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instagram Reel Downloader</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 class="text-2xl font-bold text-center mb-6">Instagram Reel Downloader</h1>
        
        <div class="space-y-4">
            <input 
                type="text" 
                id="urlInput"
                placeholder="Paste Instagram Reel URL here" 
                class="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
            
            <button 
                id="downloadButton"
                class="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                Download
            </button>

            <div id="status" class="text-center text-sm hidden">
                <div class="animate-spin inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                Processing...
            </div>

            <div id="error" class="text-red-500 text-center text-sm hidden"></div>
            
            <div id="success" class="text-green-500 text-center text-sm hidden">
                Download started! Check your downloads folder.
            </div>
        </div>
    </div>

    <script>
    function showElement(id) {
        document.getElementById(id).classList.remove('hidden');
    }

    function hideElement(id) {
        document.getElementById(id).classList.add('hidden');
    }

    function resetUI() {
        showElement('status');
        hideElement('error');
        hideElement('success');
    }

    function showError(message) {
        const errorElement = document.getElementById('error');
        errorElement.textContent = message;
        showElement('error');
    }

    async function handleDownload() {
        const urlInput = document.getElementById('urlInput');
        resetUI();

        try {
            let downloadUrl;
            
            const processResponse = await fetch('/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: urlInput.value
                })
            });

            const data = await processResponse.json();

            if (!processResponse.ok) {
                throw new Error(data.error || 'Download failed');
            }

            const downloadResponse = await fetch(data.videoUrl);
            const blob = await downloadResponse.blob();
            downloadUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = data.filename || 'video.mp4';
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
            showElement('success');

        } catch (err) {
            showError(err.message || 'An unknown error occurred');
        } finally {
            hideElement('status');
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        const downloadButton = document.getElementById('downloadButton');
        const urlInput = document.getElementById('urlInput');

        downloadButton.addEventListener('click', handleDownload);
        
        urlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleDownload();
            }
        });
    });
    </script>
</body>
</html>`;

class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly WINDOW_MS = 60000;
  private readonly MAX_REQUESTS = 10;

  public isRateLimited(ip: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(ip) || [];
    const validTimestamps = timestamps.filter(
      (time) => now - time < this.WINDOW_MS
    );

    if (validTimestamps.length >= this.MAX_REQUESTS) {
      return true;
    }

    validTimestamps.push(now);
    this.requests.set(ip, validTimestamps);
    return false;
  }

  public getRemainingTime(ip: string): number {
    const timestamps = this.requests.get(ip) || [];
    if (timestamps.length === 0) return 0;
    return Math.max(0, this.WINDOW_MS - (Date.now() - timestamps[0]));
  }
}

class InstagramService {
  private static config: InstagramServiceConfig = {
    debug: false,
    logLevel: 'error',
    dumpHtml: false,
    dumpPath: './debug_dumps',
  };

  private static debugLogs: DebugInfo[] = [];

  private static readonly HEADERS = {
    accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    cookie: 'replace with your own cookie',
  };
  private static readonly HEADERSGQL = {
    accept: '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'content-type': 'application/x-www-form-urlencoded',
    'sec-ch-prefers-color-scheme': 'dark',
    'sec-ch-ua':
      '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'x-asbd-id': '129477',
    'x-csrftoken': '2zFp2MYspSreZW6UTGiBdS',
    'x-fb-friendly-name': 'PolarisPostActionLoadPostQueryQuery',
    'x-ig-app-id': '936619743392459',
    Referer: 'https://www.instagram.com/reel/',
    Origin: 'https://www.instagram.com',
    cookie: 'replace with your own cookie',
  };
  public static configure(config: Partial<InstagramServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private static debug(info: Omit<DebugInfo, 'timestamp'>): void {
    if (!this.config.debug) return;

    const debugInfo: DebugInfo = {
      ...info,
      timestamp: new Date().toISOString(),
    };

    this.debugLogs.push(debugInfo);

    if (
      this.config.logLevel === 'verbose' ||
      this.config.logLevel === 'debug'
    ) {
      console.log(
        `[DEBUG][${debugInfo.timestamp}] ${debugInfo.method} | ${debugInfo.step}`
      );
      if (debugInfo.data) {
        console.log('Data:', JSON.stringify(debugInfo.data, null, 2));
      }
      if (debugInfo.error) {
        console.log('Error:', debugInfo.error);
      }
    }
  }

  private static async dumpToFile(
    content: string,
    reelCode: string
  ): Promise<void> {
    if (!this.config.dumpHtml) return;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `instagram_${reelCode}_${timestamp}.html`;
      const filepath = join(this.config.dumpPath, filename);

      await mkdir(this.config.dumpPath, { recursive: true });
      await writeFile(filepath, content, 'utf8');

      this.debug({
        method: 'dumpToFile',
        step: 'File dump successful',
        data: { filepath },
      });
    } catch (error) {
      this.debug({
        method: 'dumpToFile',
        step: 'File dump failed',
        error: error as Error,
      });
    }
  }

  public static getDebugLogs(): DebugInfo[] {
    return this.debugLogs;
  }

  public static clearDebugLogs(): void {
    this.debugLogs = [];
  }

  public static async extractReelCode(url: string): Promise<string> {
    this.debug({
      method: 'extractReelCode',
      step: 'Starting URL extraction',
      data: { url },
    });

    url = url.trim();
    const urlPattern = /instagram\.com\/reel?\/([A-Za-z0-9_-]+)/;
    const match = url.match(urlPattern);

    if (match?.[1]) {
      return match[1];
    }

    if (/^[A-Za-z0-9_-]{11}$/.test(url)) {
      return url;
    }

    throw new Error('Invalid Instagram reel URL or code');
  }
  private static async fetchGraphQL(reelCode: string): Promise<any> {
    const variables = {
      shortcode: reelCode,
      fetch_tagged_user_count: null,
      hoisted_comment_id: null,
      hoisted_reply_id: null,
    };

    const formData = new URLSearchParams({
      av: '0',
      __d: 'www',
      __user: '0',
      __a: '1',
      __req: 'a',
      lsd: 'AVquaOpmmkA',
      jazoest: '21059',
      __spin_r: '1018692829',
      __spin_b: 'trunk',
      __spin_t: '1733530727',
      fb_api_caller_class: 'RelayModern',
      fb_api_req_friendly_name: 'PolarisPostActionLoadPostQueryQuery',
      variables: JSON.stringify(variables),
      server_timestamps: 'true',
      doc_id: '8845758582119845',
    });

    this.debug({
      method: 'fetchGraphQL',
      step: 'Starting GraphQL fetch',
      data: { reelCode, variables },
    });

    const response = await fetch('https://www.instagram.com/graphql/query', {
      method: 'POST',
      headers: {
        ...this.HEADERSGQL,
        Referer: `https://www.instagram.com/reel/${reelCode}/`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  }
  public static async fetchInstagramReel(
    reelCode: string
  ): Promise<FetchResult> {
    try {
      // const graphqlData = await this.fetchGraphQL(reelCode);

      // if (graphqlData?.data?.xdt_shortcode_media) {
      //   const media = graphqlData.data.xdt_shortcode_media;

      //   // Extract video information from dash manifest
      //   if (media.dash_info?.video_dash_manifest) {
      //     const manifestText = media.dash_info.video_dash_manifest;
      //     const videoVersions: VideoVersion[] = [];

      //     // Parse manifest for video URLs and qualities
      //     const baseUrlMatches = manifestText.matchAll(
      //       /<BaseURL>([^<]+)<\/BaseURL>[^>]+width="(\d+)" height="(\d+)"/g
      //     );

      //     for (const match of Array.from(baseUrlMatches)) {
      //       const [_, url, width, height] = match;
      //       if (url && width && height) {
      //         videoVersions.push({
      //           url,
      //           width: parseInt(width),
      //           height: parseInt(height),
      //           type: 'video/mp4',
      //         });
      //       }
      //     }

      //     if (videoVersions.length > 0) {
      //       // Sort by quality (height)
      //       videoVersions.sort((a, b) => (b.height || 0) - (a.height || 0));

      //       return {
      //         videoVersions,
      //         videoUrl: videoVersions[0].url,
      //         allUrls: videoVersions.map((v) => v.url),
      //       };
      //     }
      //   }

      //   // Fallback to direct video_url if available
      //   if (media.video_url) {
      //     return {
      //       videoVersions: [
      //         {
      //           url: media.video_url,
      //           width: media.dimensions?.width || 720,
      //           height: media.dimensions?.height || 1280,
      //           type: 'video/mp4',
      //         },
      //       ],
      //       videoUrl: media.video_url,
      //       allUrls: [media.video_url],
      //     };
      //   }
      // }
      this.debug({
        method: 'fetchInstagramReel',
        step: `Starting fetch for reel: ${reelCode}`,
      });

      const response = await fetch(
        `https://www.instagram.com/reel/${reelCode}/`,
        {
          headers: this.HEADERS,
        }
      );
      const headerObj: { [key: string]: string } = {};
      response.headers.forEach((value, key) => {
        headerObj[key] = value;
      });
      this.debug({
        method: 'fetchInstagramReel',
        step: 'Response received',
        data: {
          status: response.status,
          statusText: response.statusText,
          headers: headerObj,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();

      // Dump HTML content if debug is enabled
      if (this.config.debug && this.config.dumpHtml) {
        await this.dumpToFile(text, reelCode);
      }

      this.debug({
        method: 'fetchInstagramReel',
        step: 'Response text received',
        data: {
          textLength: text.length,
          preview: text.substring(0, 200) + '...',
        },
      });

      const result = this.parseInstagramResponse(text, reelCode);

      if (!result) {
        throw new Error('Could not extract video information');
      }

      return result;
    } catch (error) {
      this.debug({
        method: 'fetchInstagramReel',
        step: 'Error occurred',
        error: error as Error,
      });
      throw error;
    }
  }

  private static parseInstagramResponse(
    text: string,
    targetReelCode: string
  ): FetchResult | null {
    try {
      this.debug({
        method: 'parseInstagramResponse',
        step: 'Starting parse',
        data: { targetReelCode },
      });

      // First try to find content in the NEXT_DATA script
      const nextDataMatch = text.match(
        /<script type="application\/json" data-content-len="\d+" data-sjs>(.*?)<\/script>/
      );

      this.debug({
        method: 'parseInstagramResponse',
        step: 'NEXT_DATA match found',
        data: { hasMatch: !!nextDataMatch },
      });

      if (nextDataMatch) {
        const jsonData = JSON.parse(nextDataMatch[1]);

        // Try various data paths
        const paths = [
          {
            name: 'clips_connection',
            data: jsonData?.require?.[0]?.[3]?.[0]?.['__bbox']
              ?.require?.[0]?.[3]?.[1]?.['__bbox']?.result?.data
              ?.xdt_api__v1__clips__clips_on_logged_out_connection_v2?.edges,
          },
          {
            name: 'media_shortcode',
            data: jsonData?.require?.[0]?.[3]?.[0]?.['__bbox']
              ?.require?.[0]?.[3]?.[1]?.['__bbox']?.result?.data
              ?.xdt_api__v1__media__shortcode__web_info?.items,
          },
        ];

        for (const path of paths) {
          this.debug({
            method: 'parseInstagramResponse',
            step: `Checking path: ${path.name}`,
            data: { hasData: !!path.data },
          });

          if (path.data) {
            const edges =
              path.name === 'media_shortcode'
                ? path.data.map((item: any) => ({ node: { media: item } }))
                : path.data;

            for (const edge of edges) {
              const media = edge?.node?.media;
              if (
                media?.code === targetReelCode &&
                media?.video_versions?.length > 0
              ) {
                const videoVersions = media.video_versions.map((v: any) => ({
                  url: v.url,
                  width: v.width || 0,
                  height: v.height || 0,
                  type: v.type,
                }));

                videoVersions.sort(
                  (a: any, b: any) => (b.height || 0) - (a.height || 0)
                );

                return {
                  videoVersions,
                  videoUrl: videoVersions[0].url,
                  allUrls: videoVersions.map((v: any) => v.url),
                };
              }
            }
          }
        }
      }

      // Try video patterns
      const videoPatterns = [
        { name: 'video_versions', pattern: /"video_versions":\s*(\[[^\]]+\])/ },
        {
          name: 'video_pattern',
          pattern: /video_versions":\[(.*?)\],"image_versions2"/,
        },
        { name: 'video_url', pattern: /"video_url":"([^"]+)"/ },
      ];

      for (const { name, pattern } of videoPatterns) {
        this.debug({
          method: 'parseInstagramResponse',
          step: `Trying pattern: ${name}`,
        });

        const match = text.match(pattern);
        if (match) {
          try {
            if (pattern.toString().includes('video_url')) {
              const url = match[1].replace(/\\/g, '');
              return {
                videoVersions: [
                  { url, width: 720, height: 1280, type: 'video/mp4' },
                ],
                videoUrl: url,
                allUrls: [url],
              };
            }

            const videoData = JSON.parse(
              match[1].replace(/\\"/g, '"').replace(/\\\//g, '/')
            );

            if (Array.isArray(videoData) && videoData.length > 0) {
              const videoVersions = videoData.map((v) => ({
                url: v.url,
                width: v.width || 720,
                height: v.height || 1280,
                type: v.type || 'video/mp4',
              }));

              videoVersions.sort((a, b) => (b.height || 0) - (a.height || 0));

              return {
                videoVersions,
                videoUrl: videoVersions[0].url,
                allUrls: videoVersions.map((v) => v.url),
              };
            }
          } catch (error) {
            this.debug({
              method: 'parseInstagramResponse',
              step: `Pattern ${name} processing error`,
              error: error as Error,
            });
          }
        }
      }

      // Try parsing dash manifest
      const dashManifestMatch = text.match(
        /"video_dash_manifest":\s*"([^"]+)"/
      );

      this.debug({
        method: 'parseInstagramResponse',
        step: 'Checking dash manifest',
        data: { hasMatch: !!dashManifestMatch },
      });

      if (dashManifestMatch) {
        const manifestText = dashManifestMatch[1]
          .replace(/\\"/g, '"')
          .replace(/\\\//g, '/');

        const baseUrlMatches = manifestText.matchAll(
          /<BaseURL>([^<]+)<\/BaseURL>[^>]+width="(\d+)" height="(\d+)"/g
        );

        const videoVersions: VideoVersion[] = [];
        for (const match of baseUrlMatches) {
          const [_, url, width, height] = match;
          if (url && width && height) {
            videoVersions.push({
              url,
              width: parseInt(width),
              height: parseInt(height),
              type: 'video/mp4',
            });
          }
        }

        if (videoVersions.length > 0) {
          videoVersions.sort((a, b) => (b.height || 0) - (a.height || 0));
          return {
            videoVersions,
            videoUrl: videoVersions[0].url,
            allUrls: videoVersions.map((v) => v.url),
          };
        }
      }

      this.debug({
        method: 'parseInstagramResponse',
        step: 'No video information found',
        data: { targetReelCode },
      });

      return null;
    } catch (error) {
      this.debug({
        method: 'parseInstagramResponse',
        step: 'Fatal parsing error',
        error: error as Error,
      });
      return null;
    }
  }
}

class Server {
  private server;
  private rateLimiter = new RateLimiter();
  private corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  constructor(port: number) {
    this.server = serve({
      port,
      fetch: this.handleRequest.bind(this),
    });

    console.log(`[${new Date().toISOString()}] Server started on port ${port}`);
  }
  private async downloadVideo(videoUrl: string): Promise<Response> {
    try {
      const response = await fetch(videoUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || 'video/mp4';
      const blob = await response.blob();

      return new Response(blob, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': 'attachment; filename="instagram_video.mp4"',
          ...this.corsHeaders,
        },
      });
    } catch (error) {
      console.error('Error downloading video:', error);
      throw error;
    }
  }
  private async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: this.corsHeaders });
    }

    // Rate limiting check
    if (this.rateLimiter.isRateLimited(clientIP)) {
      const retryAfter = Math.ceil(
        this.rateLimiter.getRemainingTime(clientIP) / 1000
      );
      return this.sendError(
        'Too many requests',
        429,
        `Please try again after ${retryAfter} seconds`
      );
    }

    try {
      if (url.pathname === '/url' && url.searchParams.has('url')) {
        try {
          const instagramUrl = url.searchParams.get('url')!;
          const reelCode = await InstagramService.extractReelCode(instagramUrl);
          const result = await InstagramService.fetchInstagramReel(reelCode);

          // Download and send the video as a blob
          return await this.downloadVideo(result.videoUrl);
        } catch (error) {
          console.error('Error processing URL parameter:', error);
          return this.sendError(
            'Failed to process video',
            400,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }
      
      switch (url.pathname) {
        case '/':
          return this.handleRoot();
        case '/process':
          if (req.method === 'POST') {
            return this.handleProcess(req);
          }
        default:
          return this.sendError('Not Found', 404);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Unhandled error:`, error);
      return this.sendError('Internal Server Error', 500);
    }
  }

  private handleRoot(): Response {
    return new Response(HTML_TEMPLATE, {
      headers: {
        'Content-Type': 'text/html',
        ...this.corsHeaders,
      },
    });
  }

  private async handleProcess(req: Request): Promise<Response> {
    try {
      const data = (await req.json()) as DownloadRequest;

      if (!data.url?.trim()) {
        return this.sendError('URL is required', 400);
      }

      const reelCode = await InstagramService.extractReelCode(data.url);
      const result = await InstagramService.fetchInstagramReel(reelCode);

      return new Response(
        JSON.stringify({
          success: true,
          videoUrl: result.videoUrl,
          filename: `instagram_${reelCode}.mp4`,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...this.corsHeaders,
          },
        }
      );
    } catch (error) {
      return this.sendError(
        'Failed to process request',
        400,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private sendError(
    message: string,
    status: number,
    details?: string
  ): Response {
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        details,
      } as DownloadResponse),
      {
        status,
        headers: {
          'Content-Type': 'application/json',
          ...this.corsHeaders,
        },
      }
    );
  }

  public getPort(): number {
    return this.server.port;
  }

  public close(): void {
    if (this.server) {
      this.server.stop();
    }
  }
}

// Initialize debug mode
InstagramService.configure({
  debug: false,
  logLevel: 'verbose',
  dumpHtml: false,
  dumpPath: './debug_dumps',
});

// Initialize server
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3334;
const server = new Server(PORT);

console.log(
  `[${new Date().toISOString()}] Server running at http://localhost:${server.getPort()}`
);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] Shutting down server...`);
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] Shutting down server...`);
  server.close();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(
    `[${new Date().toISOString()}] Unhandled Rejection at:`,
    promise,
    'reason:',
    reason
  );
});
