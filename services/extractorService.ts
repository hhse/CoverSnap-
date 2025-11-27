
import { ExtractionResult, Platform } from '../types';

const identifyPlatform = (url: string): Platform => {
  if (url.includes('weixin.qq.com')) return Platform.WECHAT;
  if (url.includes('zhihu.com')) return Platform.ZHIHU;
  if (url.includes('xiaohongshu.com')) return Platform.XIAOHONGSHU;
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
    // Strategy 2: AllOrigins (JSON wrapped) - Reliable fallback
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

  let lastError;
  for (const strategy of strategies) {
    try {
      return await strategy(targetUrl);
    } catch (e) {
      console.warn('Proxy strategy failed:', e);
      lastError = e;
    }
  }
  
  throw new Error('Network error: Unable to connect to the page. Please check the link.');
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

  const platform = identifyPlatform(validUrl);

  try {
    const html = await fetchHtml(validUrl);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    let coverUrl: string | null = null;
    let title: string | undefined = undefined;

    // --- Title Extraction ---
    const ogTitle = doc.querySelector('meta[property="og:title"]');
    title = ogTitle?.getAttribute('content') || doc.title;

    // --- WeChat Special Handling ---
    if (platform === Platform.WECHAT) {
      // 1. Try regex for msg_cdn_url variable (Standard)
      // Matches: var msg_cdn_url = "..." OR msg_cdn_url = "..."
      const varRegex = /(?:var\s+)?msg_cdn_url\s*=\s*["']([^"']+)["']/;
      const match = html.match(varRegex);
      if (match && match[1]) {
        coverUrl = match[1];
      }

      // 2. Try Standard Meta Tags
      if (!coverUrl) {
        const metaImg = doc.querySelector('meta[property="og:image"]') || 
                       doc.querySelector('meta[property="twitter:image"]');
        if (metaImg) coverUrl = metaImg.getAttribute('content');
      }

      // 3. Try Script Regex for "cdn_url" key in JSON-like structures
      if (!coverUrl) {
        const jsonKeyRegex = /["']cdn_url["']\s*:\s*["']([^"']+)["']/;
        const m = html.match(jsonKeyRegex);
        if (m && m[1]) coverUrl = m[1];
      }

      // 4. Brute Force Regex for ANY mmbiz URL ending in /0 (High Res)
      // This catches URLs embedded in the HTML that might not be in the standard variable
      if (!coverUrl) {
        // Look for http://...mmbiz.qpic.cn/.../0 
        // We look for the pattern, ensuring it ends with /0 to get the original image
        const bruteForceOriginal = /https?:\/\/mmbiz\.qpic\.cn\/[^\s"']+\/0/gi;
        const matches = html.match(bruteForceOriginal);
        if (matches && matches.length > 0) {
            coverUrl = matches[0];
        }
      }

      // 5. Brute Force Regex for ANY mmbiz URL (Fallback to non-/0)
      if (!coverUrl) {
         const bruteForceAny = /https?:\/\/mmbiz\.qpic\.cn\/[^\s"']+/gi;
         const matches = html.match(bruteForceAny);
         if (matches && matches.length > 0) {
            // Filter out obviously bad ones (too short)
            const validMatches = matches.filter(m => m.length > 50);
            if (validMatches.length > 0) coverUrl = validMatches[0];
         }
      }
      
      // 6. DOM Fallback: Look for first image in content with data-src
      if (!coverUrl) {
        const contentImg = doc.querySelector('.rich_media_content img[data-src*="mmbiz.qpic.cn"]');
        if (contentImg) coverUrl = contentImg.getAttribute('data-src');
      }

      // Title Fallback for WeChat
      if (!title || title === 'Untitled' || title === 'Untitled Article') {
        const titleMatch = html.match(/var\s+msg_title\s*=\s*["'](.*?)["']/);
        if (titleMatch && titleMatch[1]) title = titleMatch[1];
      }
    } 
    // --- Zhihu Handling ---
    else if (platform === Platform.ZHIHU) {
      const ogImage = doc.querySelector('meta[property="og:image"]');
      if (ogImage) coverUrl = ogImage.getAttribute('content');

      if (!coverUrl) {
         // Fallback: First image in content
         const firstContentImg = doc.querySelector('.RichContent-inner img');
         if (firstContentImg) coverUrl = firstContentImg.getAttribute('src');
      }
      
      // Attempt to extract from embedded JSON data
      if (!coverUrl) {
         const jsonScript = doc.getElementById('js-initialData');
         if (jsonScript && jsonScript.textContent) {
            try {
                // Simple regex to find a likely cover URL in the JSON blob without full parsing
                const jsonMatch = jsonScript.textContent.match(/"(https:[^"]+?(?:jpg|jpeg|png))"/);
                if (jsonMatch) coverUrl = jsonMatch[1];
            } catch(e) {}
         }
      }
    } 
    // --- General Handling ---
    else {
      const ogImage = doc.querySelector('meta[property="og:image"]');
      if (ogImage) coverUrl = ogImage.getAttribute('content');
      
      if (!coverUrl) {
         const twitterImg = doc.querySelector('meta[property="twitter:image"]');
         if (twitterImg) coverUrl = twitterImg.getAttribute('content');
      }
    }

    // --- Final Fallbacks ---
    if (!coverUrl) {
        const linkImage = doc.querySelector('link[rel="image_src"]');
        if (linkImage) coverUrl = linkImage.getAttribute('href');
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

    // Fix escaped slashes (common in raw JSON/JS strings)
    coverUrl = coverUrl.replace(/\\/g, '');

    // Upgrade WeChat images to high res
    if (platform === Platform.WECHAT && coverUrl.includes('mmbiz.qpic.cn')) {
        // Replace /640? or /0? or similar endings with /0 (original)
        // Pattern: /<number>? or /<number> at the end
        if (/\/640\??/.test(coverUrl)) {
            coverUrl = coverUrl.replace(/\/640\??.*/, '/0');
        } else if (!coverUrl.endsWith('/0') && !coverUrl.includes('/0?')) {
            // If it doesn't end in /0, try to append it if it looks like a base path
            if (!coverUrl.split('/').pop()?.includes('.')) { 
               // heuristics: if the last segment isn't a file.ext, it might be a WeChat ID
               // This is risky, so we mostly rely on the /640 replacement
            }
        }
        
        // Ensure https
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
    if (error.message.includes('Network error')) {
        throw new Error('Connection failed. Please check the link.');
    }
    throw new Error('Failed to extract image. Please check the link or try another platform.');
  }
};
