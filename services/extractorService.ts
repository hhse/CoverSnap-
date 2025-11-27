
import { ExtractionResult, Platform } from '../types';

const identifyPlatform = (url: string): Platform => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('weixin.qq.com')) return Platform.WECHAT;
  if (lowerUrl.includes('zhihu.com')) return Platform.ZHIHU;
  if (lowerUrl.includes('xiaohongshu.com')) return Platform.XIAOHONGSHU;
  if (lowerUrl.includes('bilibili.com') || lowerUrl.includes('b23.tv')) return Platform.BILIBILI;
  return Platform.UNKNOWN;
};

// Helper to fetch HTML using multiple proxy strategies
const fetchHtml = async (targetUrl: string): Promise<string> => {
  // We prioritize corsproxy.io for raw HTML as it's less likely to mess up encoding than JSON-wrapped responses
  const strategies = [
    // Strategy 1: CORSProxy.io (Raw HTML) - Fast and direct
    async (url: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      try {
        // Add random param to prevent caching
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, {
           signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return await res.text();
      } catch (e) {
        clearTimeout(timeoutId);
        throw e;
      }
    },
    // Strategy 2: CodeTabs (Raw HTML) - Reliable fallback
    async (url: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return await res.text();
      } catch (e) {
        clearTimeout(timeoutId);
        throw e;
      }
    },
    // Strategy 3: AllOrigins (JSON wrapped) - Reliable fallback
    async (url: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}&t=${Date.now()}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (!data.contents) throw new Error('Empty contents');
        return data.contents as string;
      } catch (e) {
        clearTimeout(timeoutId);
        throw e;
      }
    }
  ];

  for (const strategy of strategies) {
    try {
      return await strategy(targetUrl);
    } catch (e) {
      console.warn('Proxy strategy failed:', e);
    }
  }
  
  throw new Error('Network error: Unable to connect to the page. Please check the link.');
};

// Helper: Regex to extract meta content directly from raw HTML (bypasses DOM parser issues)
const regexExtractMeta = (html: string, property: string): string | null => {
  // Matches <meta property="og:image" content="..."> OR <meta name="og:image" content="...">
  // OR <meta itemprop="image" content="...">
  // Handles single quotes, double quotes, and arbitrary ordering of attributes
  const regex = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
  const match = html.match(regex);
  if (match) return match[1];

  // Try reverse order: content first (less common but possible)
  const regexReverse = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["']${property}["']`, 'i');
  const matchReverse = html.match(regexReverse);
  return matchReverse ? matchReverse[1] : null;
};

export const extractCoverImage = async (targetUrl: string): Promise<ExtractionResult> => {
  if (!targetUrl) throw new Error('Please provide a valid URL');

  let validUrl = targetUrl.trim();
  const urlMatch = validUrl.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    validUrl = urlMatch[0];
  } else if (!/^https?:\/\//i.test(validUrl)) {
    validUrl = 'https://' + validUrl;
  }

  try {
    new URL(validUrl);
  } catch (e) {
    throw new Error('Invalid URL format');
  }

  let platform = identifyPlatform(validUrl);

  try {
    const html = await fetchHtml(validUrl);
    
    // --- Platform Re-identification based on Content ---
    if (platform === Platform.UNKNOWN) {
        if (html.includes('mmbiz.qpic.cn') || html.includes('var msg_cdn_url')) platform = Platform.WECHAT;
        else if (html.includes('bilibili.com')) platform = Platform.BILIBILI;
        else if (html.includes('zhihu.com')) platform = Platform.ZHIHU;
        else if (html.includes('xiaohongshu.com')) platform = Platform.XIAOHONGSHU;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    let coverUrl: string | null = null;
    let title: string | undefined = undefined;

    // --- Common Title Extraction ---
    const ogTitle = doc.querySelector('meta[property="og:title"]');
    title = ogTitle?.getAttribute('content') || doc.title;
    if (!title || title.length < 2) {
         const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
         if (titleMatch) title = titleMatch[1];
    }

    // --- WeChat Special Handling ---
    if (platform === Platform.WECHAT) {
      // 1. Try regex for msg_cdn_url variable (Standard)
      const varRegex = /(?:var\s+)?msg_cdn_url\s*=\s*["']([^"']+)["']/;
      const match = html.match(varRegex);
      if (match && match[1]) {
        coverUrl = match[1];
      }

      // 2. Try Standard Meta Tags (Regex + DOM)
      if (!coverUrl) coverUrl = regexExtractMeta(html, 'og:image');
      if (!coverUrl) coverUrl = regexExtractMeta(html, 'twitter:image');

      // 3. Try Script Regex for "cdn_url" key
      if (!coverUrl) {
        const jsonKeyRegex = /["']cdn_url["']\s*:\s*["']([^"']+)["']/;
        const m = html.match(jsonKeyRegex);
        if (m && m[1]) coverUrl = m[1];
      }

      // 4. Brute Force Regex for ANY mmbiz URL ending in /0
      // Support http, https, and protocol-relative //
      if (!coverUrl) {
        const bruteForceOriginal = /(?:https?:)?\/\/mmbiz\.qpic\.cn\/[^\s"']+\/0/gi;
        const matches = html.match(bruteForceOriginal);
        if (matches && matches.length > 0) {
            coverUrl = matches[0];
        }
      }

      // 5. Brute Force Regex for ANY mmbiz URL (Fallback)
      if (!coverUrl) {
         const bruteForceAny = /(?:https?:)?\/\/mmbiz\.qpic\.cn\/[^\s"']+/gi;
         const matches = html.match(bruteForceAny);
         if (matches && matches.length > 0) {
            const validMatches = matches.filter(m => m.length > 50);
            if (validMatches.length > 0) coverUrl = validMatches[0];
         }
      }
      
      // Title Fallback
      if (!title || title === 'Untitled' || title === 'Untitled Article') {
        const titleMatch = html.match(/var\s+msg_title\s*=\s*["'](.*?)["']/);
        if (titleMatch && titleMatch[1]) title = titleMatch[1];
      }
    } 
    // --- Zhihu Handling ---
    else if (platform === Platform.ZHIHU) {
      coverUrl = regexExtractMeta(html, 'og:image');
      
      if (!coverUrl) {
         // Look for "coverUrl" in JSON state
         const coverMatch = html.match(/"coverUrl":"(https:[^"]+?)"/);
         if (coverMatch) coverUrl = coverMatch[1];
      }
    } 
    // --- Bilibili Handling ---
    else if (platform === Platform.BILIBILI) {
      // 1. Try standard metas via regex (Bilibili often uses itemprop="image")
      coverUrl = regexExtractMeta(html, 'og:image');
      if (!coverUrl) coverUrl = regexExtractMeta(html, 'image'); 
      if (!coverUrl) {
          const itempropMatch = html.match(/itemprop=["']image["']\s+content=["']([^"']+)["']/i);
          if (itempropMatch) coverUrl = itempropMatch[1];
      }

      // 2. Script/JSON state regex
      if (!coverUrl) {
         // Look for "pic": "..." or "cover": "..."
         // Catch escaped slashes like https:\/\/
         const scriptRegex = /["'](?:pic|cover|archive)["']\s*:\s*["']((?:https?:)?\\?\/\\?\/[^"']+)["']/;
         const match = html.match(scriptRegex);
         if (match && match[1]) {
             coverUrl = match[1].replace(/\\u002F/g, '/').replace(/\\/g, '');
         }
      }

      // 3. Brute Force Regex for Bilibili CDN (hdslb.com)
      if (!coverUrl) {
         // Matches http://i0.hdslb.com/bfs/archive/....jpg or similar
         // Priority to 'archive' paths which are usually the main video covers
         const hdslbRegex = /(?:https?:)?\/\/[a-z0-9]+\.hdslb\.com\/bfs\/archive\/[a-zA-Z0-9_-]+\.(?:jpg|png|webp)/i;
         const match = html.match(hdslbRegex);
         if (match) {
             coverUrl = match[0];
         } else {
             // Broader fallback for any hdslb image (could be avatar/banner, but better than nothing)
             const hdslbGeneral = /(?:https?:)?\/\/[a-z0-9]+\.hdslb\.com\/bfs\/[^\s"']+\.(?:jpg|png|webp)/gi;
             const matches = html.match(hdslbGeneral);
             if (matches && matches.length > 0) {
                 // Try to filter out small assets if possible by path keywords?
                 // For now, take the first valid one found
                 coverUrl = matches[0];
             }
         }
      }

      // Clean up Bilibili URL (remove query params or resize suffixes like @100w)
      if (coverUrl && coverUrl.includes('@')) {
          coverUrl = coverUrl.split('@')[0];
      }
    }
    // --- Xiaohongshu Handling ---
    else if (platform === Platform.XIAOHONGSHU) {
        coverUrl = regexExtractMeta(html, 'og:image');
        
        if (!coverUrl) {
            // Try to find "url" inside "imageList" structure or generic "images"
            const urlMatch = html.match(/"url":"(https:\/\/[^"]+?)"/);
            if (urlMatch) coverUrl = urlMatch[1].replace(/\\u002F/g, '/');
        }
    }

    // --- General Handling (Fallbacks for all) ---
    if (!coverUrl) coverUrl = regexExtractMeta(html, 'og:image');
    if (!coverUrl) coverUrl = regexExtractMeta(html, 'twitter:image');
    
    // Fallback: Check for <link rel="image_src" href="...">
    if (!coverUrl) {
        const linkMatch = html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);
        if (linkMatch) coverUrl = linkMatch[1];
    }
    
    // Fallback: Check for <link rel="preload" as="image" href="...">
    if (!coverUrl) {
        const preloadMatch = html.match(/<link[^>]+rel=["']preload["'][^>]+as=["']image["'][^>]+href=["']([^"']+)["']/i);
        if (preloadMatch) coverUrl = preloadMatch[1];
    }
    
    // Fallback: Check for itemprop="image" generically
    if (!coverUrl) {
        const itempropMatch = html.match(/itemprop=["']image["']\s+content=["']([^"']+)["']/i);
        if (itempropMatch) coverUrl = itempropMatch[1];
    }

    // --- Last Resort: Generic Scan for Image-like variables ---
    if (!coverUrl) {
        // Look for common keys in JS: cover: "...", poster: "...", thumbnail: "...", pic: "..."
        // limit scan to valid http urls ending in image extensions
        const genericRegex = /["'](?:cover|poster|thumbnail|pic|image|url)["']\s*[:=]\s*["']((?:https?:)?\/\/[^"']+\.(?:jpg|jpeg|png|webp))["']/i;
        const match = html.match(genericRegex);
        if (match && match[1]) {
            coverUrl = match[1].replace(/\\u002F/g, '/').replace(/\\/g, '');
        }
    }

    if (!coverUrl) {
      throw new Error('No cover image detected on this page.');
    }

    // --- URL Cleaning & Upgrade ---
    if (coverUrl.startsWith('//')) {
      coverUrl = 'https:' + coverUrl;
    } else if (coverUrl.startsWith('/')) {
      const urlObj = new URL(validUrl);
      coverUrl = `${urlObj.origin}${coverUrl}`;
    }

    // Fix escaped slashes
    coverUrl = coverUrl.replace(/\\/g, '');

    // Upgrade WeChat images to high res
    if (coverUrl.includes('mmbiz.qpic.cn')) {
        if (/\/640\??/.test(coverUrl)) {
            coverUrl = coverUrl.replace(/\/640\??.*/, '/0');
        }
        if (coverUrl.startsWith('http://')) {
            coverUrl = coverUrl.replace('http://', 'https://');
        }
    }

    return {
      url: coverUrl,
      title: title?.trim() || 'Untitled Article',
      platform,
      originalUrl: validUrl
    };

  } catch (error: any) {
    console.error('Extraction error details:', error);
    if (error.message.includes('No cover image')) {
        throw new Error('No cover image detected on this page.');
    }
    if (error.message.includes('Network error') || error.message.includes('Status 403') || error.message.includes('Status 5')) {
        throw new Error('Network error: Unable to connect to the page. Please check the link.');
    }
    throw new Error('Failed to extract image. Please check the link or try another platform.');
  }
};
