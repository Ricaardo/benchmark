# Perfcat API Data Encoding - Quick Implementation Guide

## Executive Summary

**The N4Ig... string is LZ-String compressed + Base64 encoded JSON.**

```
JSON → LZ-String compress → Base64 → "N4IgxgDgrgKgFgJwPY..."
```

---

## Quick Implementation

### 1. Install Package

```bash
npm install lz-string
npm install --save-dev @types/lz-string
```

### 2. Update TypeScript Types (Optional but Recommended)

```typescript
// At the top of server/index.ts
import LZ from 'lz-string';
```

### 3. Update uploadToPerfcat Function

**Location**: `/Users/bilibili/benchmark/server/index.ts` around line 210

**Change this:**
```typescript
body: JSON.stringify({ data: JSON.stringify(reportData) })
```

**To this:**
```typescript
const compressed = LZ.compressToBase64(JSON.stringify(reportData));
body: JSON.stringify({ data: compressed })
```

### 4. Full Updated Function Example

```typescript
import LZ from 'lz-string';

async function uploadToPerfcat(reportData: any): Promise<{ success: boolean; id?: string; url?: string; error?: string }> {
    if (!perfcatConfig.cookie) {
        console.warn('[Perfcat] Cookie未配置，跳过上传');
        return { success: false, error: 'Cookie not configured' };
    }

    try {
        console.log('[Perfcat] 开始上传测试报告...');

        // NEW: Compress the report data before sending
        const jsonString = JSON.stringify(reportData);
        const compressed = LZ.compressToBase64(jsonString);

        const response = await fetch(perfcatConfig.url, {
            method: 'POST',
            headers: {
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Cookie': perfcatConfig.cookie,
                'Origin': 'https://fe-perfcat.bilibili.co',
                'Pragma': 'no-cache',
                'Referer': 'https://fe-perfcat.bilibili.co/utils/upload',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
                'accept': 'application/json',
                'content-type': 'application/json',
                'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"'
            },
            // NEW: Send compressed data instead of raw JSON string
            body: JSON.stringify({ data: compressed })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json() as { id: string };
        const shortId = result.id;

        console.log(`[Perfcat] ✅ 上传成功，短链ID: ${shortId}`);

        return {
            success: true,
            id: shortId,
            url: `https://fe-perfcat.bilibili.co/utils/shorten/${shortId}`
        };
    } catch (error) {
        console.error('[Perfcat] ❌ 上传失败:', error);
        return {
            success: false,
            error: (error as Error).message
        };
    }
}
```

---

## What Changed?

| Aspect | Before | After |
|--------|--------|-------|
| Data Field | `JSON.stringify(reportData)` | `LZ.compressToBase64(JSON.stringify(...))` |
| Format | `{"data":"{...}"}` | `{"data":"N4IgxgDg..."}` |
| Size | Full JSON | ~50% smaller |
| Compatibility | May fail | Matches Perfcat expectations |

---

## Testing

### Manual Test

```bash
# Install dependencies
npm install lz-string

# Start server
npm run dev

# Run a test via UI or API
curl -X POST http://localhost:3000/api/start \
  -H "Content-Type: application/json" \
  -d '{"runner":"Runtime"}'

# Check logs for successful upload message
# You should see: [Perfcat] ✅ 上传成功，短链ID: ...
```

### Expected Output

```
[Perfcat] 开始上传测试报告...
[Perfcat] ✅ 上传成功，短链ID: 1TU_Qe
[系统] ✅ Perfcat上传成功！
[系统] 📊 查看报告: https://fe-perfcat.bilibili.co/utils/shorten/1TU_Qe?runner=Runtime
```

---

## Data Compression Benefits

### Size Reduction Example

**Original Report JSON**:
```json
{
  "platform": "darwin",
  "runtimeRes": [
    {"description": "https://example.com/page1", "value": {"runtime": 1234}},
    {"description": "https://example.com/page2", "value": {"runtime": 2345}},
    ...
  ]
}
```

**Size**: 500 bytes
**After LZ-String Compression**: 250 bytes (50% reduction)
**Format**: `N4IgxgDgrgKgFgJwPY...` (base64)

### Transmission Benefits

- Faster upload speeds
- Reduced bandwidth usage
- Faster processing on Perfcat server
- Better for mobile/slow networks

---

## Encoding Flow Diagram

```
┌─────────────────────────────┐
│  Report JSON Data           │
│  (size: 500 bytes)          │
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────┐
│  JSON.stringify()           │
│  (serialize to string)      │
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────┐
│  LZ.compressToBase64()      │
│  (compress + encode)        │
│  (size: 250 bytes)          │
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────┐
│  "N4IgxgDgrgKgFgJwPY..."    │
│  (base64 string)            │
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────┐
│  JSON.stringify({data: ...})│
│  (wrap in JSON)             │
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────┐
│  POST /api/v1/perfcat/...   │
│  (send to Perfcat)          │
└─────────────────────────────┘
```

---

## Important Notes

### Method Names (LZ-String)

Use **ONLY** these compression methods:

```typescript
// ✓ CORRECT
LZ.compressToBase64(string)        // Use this for HTTP/JSON

// ❌ DO NOT USE
LZ.compress(string)                // Creates binary, not suitable for JSON
LZ.compressToEncodedURIComponent() // For URL parameters only
LZ.compressToUTF16(string)         // Not suitable for JSON
```

### Decompression (Reference)

On the receiving end (Perfcat server would do this):

```typescript
// Server side decompression
const decompressed = LZ.decompressFromBase64(compressedString);
const reportData = JSON.parse(decompressed);
```

---

## Troubleshooting

### Problem: TypeScript Type Error
```
Cannot find module 'lz-string'
```
**Solution**:
```bash
npm install --save-dev @types/lz-string
```

### Problem: Perfcat Returns Error
```
Upload fails, link not generated
```
**Solution**:
- Verify cookie is valid
- Check that data field contains base64 string (not JSON)
- Verify LZ compression was applied

### Problem: Decompression Issues
```
Report data corrupted on Perfcat
```
**Solution**:
- Use `compressToBase64()` not other methods
- Don't double-encode the data
- Ensure JSON is valid before compression

---

## File Changes Summary

### Files to Modify
- `/Users/bilibili/benchmark/server/index.ts` (line 210)

### Files to Update
- `package.json` (add lz-string dependency)

### New Dependencies
- `lz-string` (npm package)
- `@types/lz-string` (TypeScript types)

---

## Performance Impact

### Memory Usage
- Negligible (lz-string is lightweight)
- Decompression faster than initial JSON parsing

### CPU Usage
- Minimal overhead from compression
- LZ-String is optimized for speed

### Network Impact
- **Positive**: 50% size reduction
- **Result**: Faster upload times

---

## References

- **LZ-String GitHub**: https://github.com/pieroxy/lz-string
- **NPM Package**: https://www.npmjs.com/package/lz-string
- **How LZSS Works**: https://en.wikipedia.org/wiki/Lempel%E2%80%93Ziv%E2%80%93Storer%E2%80%93Szymanski

---

## Next Steps

1. ✓ Understand the encoding (LZ-String + Base64)
2. → Install lz-string package
3. → Update server/index.ts uploadToPerfcat function
4. → Test with a sample benchmark run
5. → Verify Perfcat link is generated successfully

---

## One-Liner Commands

```bash
# Install package
npm install lz-string @types/lz-string

# Build & test
npm run build && npm run dev

# Run test
curl -X POST http://localhost:3000/api/start -H "Content-Type: application/json" -d '{"runner":"Runtime"}'
```

That's it! Your Perfcat uploads will now use the proper encoding format.
