# Perfcat API Encoding - Quick Reference

## The Answer

**"N4IgxgDgrgKgFgJwPY..." is LZ-String compressed + Base64 encoded JSON**

```
JSON → Compress (LZ-String) → Base64 → "N4IgxgDg..."
```

---

## 3-Line Implementation

```javascript
import LZ from 'lz-string';
const compressed = LZ.compressToBase64(JSON.stringify(reportData));
body: JSON.stringify({ data: compressed })
```

---

## Install & Test

```bash
npm install lz-string @types/lz-string
npm run dev
```

---

## File to Modify

**Location**: `/Users/bilibili/benchmark/server/index.ts` (line 210)

**Find**:
```typescript
body: JSON.stringify({ data: JSON.stringify(reportData) })
```

**Replace with**:
```typescript
const compressed = LZ.compressToBase64(JSON.stringify(reportData));
body: JSON.stringify({ data: compressed })
```

---

## Why LZ-String?

| Feature | Benefit |
|---------|---------|
| Compression | ~50% size reduction |
| Format | Base64 (web-friendly) |
| Speed | Fast compression/decompression |
| Compatibility | Pure JavaScript, no dependencies |

---

## Before & After

**Before** (uncompressed):
```json
{
  "data": "{\"platform\":\"linux\",\"results\":[...]}"
}
```
Size: 500 bytes

**After** (compressed):
```json
{
  "data": "N4IgxgDgrgKgFgJwPYKogDKgGgU2gFwAdGnGgFIBmUA2rqgEoAGAX..."
}
```
Size: 250 bytes (50% smaller)

---

## Key Methods

```typescript
// ✓ CORRECT
LZ.compressToBase64(string)

// ✗ WRONG
LZ.compress(string)                    // Binary, not base64
LZ.compressToEncodedURIComponent()     // For URLs only
```

---

## Testing

```bash
# After making changes
npm run dev

# Run test via UI or:
curl -X POST http://localhost:3000/api/start \
  -H "Content-Type: application/json" \
  -d '{"runner":"Runtime"}'

# Look for log output:
# [Perfcat] ✅ 上传成功，短链ID: xxxxx
```

---

## Documentation Files Created

- `ENCODING_ANALYSIS.md` - Detailed analysis and evidence
- `PERFCAT_ENCODING_IMPLEMENTATION.md` - Complete implementation guide
- `ENCODING_FINDINGS.txt` - Text summary of all findings

---

## References

- **LZ-String**: https://github.com/pieroxy/lz-string
- **NPM Package**: https://www.npmjs.com/package/lz-string

