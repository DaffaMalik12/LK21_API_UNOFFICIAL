# Series Scraping Debug Guide

## Problem Summary

The local API is returning correct data for `reason-we-fall-love-2024`, but the production VPS is returning mostly empty values:

**Local (Working)**:
- Title: "The Reason We Fall in Love (2024)" ✅
- Poster: Valid URL ✅
- Synopsis: Full text ✅
- All metadata fields populated ✅

**Production (Broken)**:
- Title: "" (empty) ❌
- Poster: "https:undefined" ❌
- Synopsis: "" (empty) ❌
- Arrays empty ❌

## Root Cause Analysis

The production responses show `"https:undefined"` and `"undefined"` strings, which indicates:
1. The scraper IS running
2. The HTML elements are NOT being found
3. The fallback values (`undefined`) are being stringified

## Possible Causes

### 1. **Anti-Bot / IP Blocking** (Most Likely)
The NontonDrama website (tv3.nontondrama.my) may be:
- Blocking your VPS IP address
- Detecting automated requests
- Using Cloudflare or similar protection
- Requiring specific headers/user-agent

### 2. **Different HTML Response**
The website might serve different HTML based on:
- Geolocation (VPS location vs your local location)
- User-Agent string
- Request headers
- Cookies/sessions

### 3. **Environment Variable Mismatch**
The `ND_URL` in production `.env` might be:
- Pointing to a different URL
- Missing or misconfigured
- Pointing to an outdated mirror

## Debug Steps for Production

### Step 1: Use the Debug Endpoint

I've created a new debug endpoint that tests all HTML selectors:

```bash
curl "https://lk21-apimangadoom.my.id/debug/series/reason-we-fall-love-2024?api_key=YOUR_API_KEY"
```

This will return detailed information about:
- Which HTML selectors are found/not found
- How many elements match each selector
- Preview of the actual HTML content
- All extracted values

### Step 2: Check Environment Variables

On your VPS, verify:
```bash
cat .env | grep ND_URL
```

Should be: `ND_URL = https://tv3.nontondrama.my`

### Step 3: Test Direct Access

Try accessing the source directly from your VPS:

```bash
curl -v "https://tv3.nontondrama.my/reason-we-fall-love-2024"
```

Check if:
- The request succeeds (200 status)
- You get actual HTML (not a Cloudflare challenge page)
- The HTML length is reasonable (>10000 bytes)

### Step 4: Test with Headers

Try adding headers to bypass bot detection:

```bash
curl -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
     -H "Accept: text/html,application/xhtml+xml" \
     -H "Accept-Language: en-US,en;q=0.9" \
     "https://tv3.nontondrama.my/reason-we-fall-love-2024"
```

## Solutions

### Solution 1: Add User-Agent to Axios Requests

If bot detection is the issue, update the series controller to include proper headers:

```typescript
const axiosRequest = await axios.get(`${process.env.ND_URL}/${id}`, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }
});
```

### Solution 2: Use a Proxy Service

If the VPS IP is blocked, consider using:
- ScraperAPI
- Bright Data
- Residential proxies
- Rotating proxies

### Solution 3: Add Rate Limiting & Delays

To avoid detection:
- Add delays between requests
- Implement rate limiting
- Cache results
- Respect robots.txt

### Solution 4: Use Puppeteer/Playwright

If JavaScript rendering is required:
- Switch from axios to Puppeteer
- Use headless browser scraping
- Handle JavaScript-rendered content

## Immediate Action Items

1. **Run the debug endpoint** on production to see what's being detected
2. **Compare the htmlPreview** from debug endpoint with local
3. **Check if Cloudflare** or similar protection is active
4. **Add proper headers** to all axios requests
5. **Monitor VPS logs** for any blocking patterns

## Debug Logs Added

I've added console.log statements to track:
- Title extraction (raw and cleaned)
- Poster URL detection
- Synopsis length
- Final object summary with counts

Check your VPS logs after making a request to see these debug messages.

## Testing Checklist

- [ ] Verify `.env` has correct `ND_URL`
- [ ] Test debug endpoint: `/debug/series/reason-we-fall-love-2024`
- [ ] Compare debug output between local and production
- [ ] Check if HTML is actually being fetched (htmlLength > 0)
- [ ] Verify selectors are finding elements (found: true)
- [ ] Test with curl from VPS to rule out blocking
- [ ] Add User-Agent headers if needed
- [ ] Check VPS logs for debug output

## Contact Points

If you need help:
1. Share the output of the debug endpoint from production
2. Share any error messages from VPS logs
3. Confirm the `ND_URL` value in production
4. Test the curl command from your VPS

---

**Files Modified:**
- `src/scrapers/series.ts` - Added debug logging
- `src/controllers/debug.ts` - New debug controller
- `src/routes/index.ts` - Added `/debug/series/:id` route
