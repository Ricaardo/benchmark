#!/usr/bin/env node

/**
 * 跨平台 Master 部署启动器
 */

const { execSync } = require('child_process');
const path = require('path');

const platform = process.platform;
const scriptDir = __dirname;

let scriptPath;

if (platform === 'win32') {
  scriptPath = path.join(scriptDir, 'standalone-deploy.bat');
  console.log('检测到 Windows 系统...\n');

  try {
    execSync(`"${scriptPath}"`, {
      stdio: 'inherit',
      shell: true,
      cwd: path.dirname(scriptDir)
    });
  } catch (error) {
    process.exit(error.status || 1);
  }
} else {
  scriptPath = path.join(scriptDir, 'standalone-deploy.sh');
  console.log(`检测到 ${platform === 'darwin' ? 'macOS' : 'Linux'} 系统...\n`);

  try {
    execSync(`bash "${scriptPath}"`, {
      stdio: 'inherit',
      cwd: path.dirname(scriptDir)
    });
  } catch (error) {
    process.exit(error.status || 1);
  }
}
