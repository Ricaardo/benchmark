#!/usr/bin/env node

/**
 * 跨平台同机部署启动器
 * 自动检测操作系统并调用对应的脚本
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const platform = process.platform;
const scriptDir = __dirname;

let scriptPath;

if (platform === 'win32') {
  // Windows
  scriptPath = path.join(scriptDir, 'standalone-both.bat');
  console.log('检测到 Windows 系统，使用 .bat 脚本...\n');

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
  // Linux / macOS
  scriptPath = path.join(scriptDir, 'standalone-both.sh');
  console.log(`检测到 ${platform === 'darwin' ? 'macOS' : 'Linux'} 系统，使用 .sh 脚本...\n`);

  try {
    execSync(`bash "${scriptPath}"`, {
      stdio: 'inherit',
      cwd: path.dirname(scriptDir)
    });
  } catch (error) {
    process.exit(error.status || 1);
  }
}
