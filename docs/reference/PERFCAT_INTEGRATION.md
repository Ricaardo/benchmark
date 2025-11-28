# Perfcat Integration Guide

## Overview

This benchmark system now automatically uploads test results to the Perfcat service after each test completes successfully. Instead of storing reports locally, all test results are uploaded to Perfcat and accessible via short links.

## Features

- **Automatic Upload**: Test results are automatically uploaded to Perfcat when tests complete successfully
- **Short Links**: Each test generates a unique Perfcat short link for easy sharing
- **Multiple Views**: Access reports in standard view or chart view mode
- **Webhook Integration**: Perfcat URLs are included in webhook notifications
- **Real-time Display**: Perfcat links appear in the UI immediately after upload

## Configuration

### 1. Set up Perfcat Cookie

To enable Perfcat uploads, you need to configure your authentication cookie:

```bash
# Edit the perfcat-config.json file
nano perfcat-config.json
```

Add your cookie from the Perfcat website:

```json
{
  "url": "https://fe-perfcat.bilibili.co/api/v1/perfcat/shorten",
  "cookie": "YOUR_COOKIE_HERE"
}
```

#### How to get your cookie:

1. Open Chrome DevTools (F12) on https://fe-perfcat.bilibili.co
2. Go to Network tab
3. Upload a test report manually
4. Find the request to `/api/v1/perfcat/shorten`
5. Copy the entire `Cookie` header value
6. Paste it into `perfcat-config.json`

### 2. API Endpoints

#### Get Perfcat Configuration Status

```bash
GET /api/perfcat
```

Response:
```json
{
  "url": "https://fe-perfcat.bilibili.co/api/v1/perfcat/shorten",
  "enabled": true,
  "hasCookie": true
}
```

#### Update Perfcat Configuration

```bash
POST /api/perfcat
Content-Type: application/json

{
  "url": "https://fe-perfcat.bilibili.co/api/v1/perfcat/shorten",
  "cookie": "YOUR_COOKIE_HERE"
}
```

#### Test Perfcat Upload

```bash
POST /api/perfcat/test
```

This will send a test upload to Perfcat to verify your configuration is working.

## Usage

### Automatic Upload Flow

1. Run a test using the web interface or API
2. When the test completes successfully, the system automatically:
   - Finds the generated JSON report file
   - Uploads it to Perfcat
   - Stores the short link ID
   - Displays the link in the UI
   - Includes the link in webhook notifications

### Viewing Reports

After a test completes, you'll see two links in the task queue:

- **📊 查看报告**: Standard report view
  - Example: `https://fe-perfcat.bilibili.co/utils/shorten/1TU_Qe?runner=Runtime`

- **📈 图表模式**: Chart/visualization mode
  - Example: `https://fe-perfcat.bilibili.co/utils/shorten/1TU_Qe?runner=Runtime&viewType=chart`

### Task API Response

When fetching task details, the response now includes:

```json
{
  "id": "task_abc123",
  "name": "Test Run",
  "runner": "Runtime",
  "status": "completed",
  "perfcatId": "1TU_Qe",
  "perfcatUrl": "https://fe-perfcat.bilibili.co/utils/shorten/1TU_Qe?runner=Runtime",
  ...
}
```

### Webhook Payload

Webhook notifications include Perfcat information:

```json
{
  "event": "task_completed",
  "timestamp": "2025-11-17T13:00:00.000Z",
  "data": {
    "taskId": "task_abc123",
    "name": "Test Run",
    "runner": "Runtime",
    "status": "completed",
    "exitCode": 0,
    "perfcatUrl": "https://fe-perfcat.bilibili.co/utils/shorten/1TU_Qe?runner=Runtime",
    "perfcatId": "1TU_Qe"
  }
}
```

## Troubleshooting

### Upload Fails

If uploads fail, check the server logs for error messages:

```bash
# Check logs
pm2 logs benchmark-web
# or
npm run dev
```

Common issues:

1. **Cookie expired**: Update your cookie in `perfcat-config.json`
2. **Network issues**: Verify connectivity to `fe-perfcat.bilibili.co`
3. **Invalid JSON**: Ensure test reports are generating valid JSON

### Cookie Not Configured

If Perfcat is disabled, you'll see this message in the console:

```
📊 Perfcat: Disabled
```

And in task output:

```
[系统] ⚠️ Perfcat上传失败: Cookie not configured
```

### Manual Upload Test

Test your Perfcat configuration:

```bash
curl -X POST http://localhost:3000/api/perfcat/test
```

## URL Format

Perfcat URLs follow this pattern:

```
https://fe-perfcat.bilibili.co/utils/shorten/{SHORT_ID}?runner={RUNNER_TYPE}&viewType={VIEW_TYPE}
```

Parameters:
- `SHORT_ID`: Unique identifier returned by Perfcat (e.g., `1TU_Qe`)
- `runner`: Test runner type (`Initialization`, `Runtime`, or `MemoryLeak`)
- `viewType`: (optional) View mode (`chart` for chart view, omit for standard view)

## Security Notes

⚠️ **Important**: The cookie contains authentication credentials. Keep it secure:

- Do not commit `perfcat-config.json` to version control
- Restrict file permissions: `chmod 600 perfcat-config.json`
- Rotate cookies periodically
- Use environment variables in production:

```bash
# Set via environment variable
export PERFCAT_COOKIE="your-cookie-here"
```

Then update the server code to read from `process.env.PERFCAT_COOKIE`.

## Disabling Perfcat

To disable Perfcat uploads, simply clear the cookie:

```json
{
  "url": "https://fe-perfcat.bilibili.co/api/v1/perfcat/shorten",
  "cookie": ""
}
```

Or delete the `perfcat-config.json` file. Tests will still run normally, but results won't be uploaded.

## Migration Notes

### From Local Reports

Previously, this system stored JSON reports locally in the `benchmark_report/` directory. With Perfcat integration:

- ✅ Reports are now uploaded to Perfcat
- ✅ Short links are generated for easy sharing
- ✅ Reports persist on Perfcat servers
- ⚠️ Local JSON files are still generated but are no longer the primary viewing method

### Data Format

The system continues to generate Benchmark SDK 2.x format JSON files, which are uploaded directly to Perfcat without modification.

## Example Workflow

```bash
# 1. Configure Perfcat
echo '{
  "url": "https://fe-perfcat.bilibili.co/api/v1/perfcat/shorten",
  "cookie": "your_cookie_here"
}' > perfcat-config.json

# 2. Start server
npm run dev

# 3. Run a test (via UI or API)

# 4. Wait for completion - you'll see:
# [Perfcat] 开始上传测试报告...
# [Perfcat] ✅ 上传成功，短链ID: 1TU_Qe

# 5. Access report at displayed URL
# https://fe-perfcat.bilibili.co/utils/shorten/1TU_Qe?runner=Runtime
```

## API Integration Example

```javascript
// Start a test
const startResponse = await fetch('http://localhost:3000/api/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My Test',
    runner: 'Runtime',
    config: { /* ... */ }
  })
});

const { taskId } = await startResponse.json();

// Poll for completion
const checkTask = async () => {
  const response = await fetch(`http://localhost:3000/api/tasks/${taskId}`);
  const task = await response.json();

  if (task.status === 'completed') {
    console.log('Test completed!');
    console.log('View report:', task.perfcatUrl);
    console.log('Chart view:', task.perfcatUrl + '&viewType=chart');
    return task;
  }

  // Check again in 5 seconds
  setTimeout(checkTask, 5000);
};

checkTask();
```

## Support

For issues related to:
- **Perfcat platform**: Contact Bilibili Perfcat team
- **Integration/upload issues**: Check server logs and this documentation
- **Configuration**: Ensure `perfcat-config.json` is properly formatted

## Changelog

### v2.1.0 (2025-11-17)
- ✨ Added automatic Perfcat upload integration
- ✨ Added Perfcat configuration API endpoints
- ✨ Added Perfcat links to UI task display
- ✨ Added Perfcat URLs to webhook notifications
- ✨ Added upload status to task output
- 📝 Created integration documentation
