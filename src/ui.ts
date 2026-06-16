/**
 * 终端 UI 模块
 * 处理颜色输出和用户交互
 */

/**
 * 颜色代码
 */
export const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  nc: '\x1b[0m'
};

/**
 * 如果不是终端，禁用颜色
 */
export function initColors(): void {
  if (!process.stdout.isTTY) {
    Object.keys(colors).forEach(k => {
      (colors as any)[k] = '';
    });
  }
}

/**
 * 显示帮助信息
 */
export function showHelp(): void {
  console.log(`
${colors.cyan}Git 安全合并工具${colors.nc}

${colors.yellow}用法:${colors.nc}
  gito mergeto [目标分支] [源分支] [选项]
  gito config <命令> [选项]

${colors.yellow}命令:${colors.nc}
  mergeto         执行分支合并操作
  config          管理配置

${colors.yellow}mergeto 参数:${colors.nc}
  目标分支    要合并到的目标分支 (默认: 从配置读取，否则为 test)
  源分支      要合并的源分支 (默认: 当前分支)

${colors.yellow}mergeto 选项:${colors.nc}
  -p, --push       自动推送到远程仓库
  -y, --yes        自动确认所有提示（非交互模式）
  --no-ff          使用 --no-ff 进行合并
  -h, --help       显示帮助信息
  -V, --version    显示版本信息

${colors.yellow}config 命令:${colors.nc}
  set <key> <value>   设置配置值
  get <key>           获取配置值
  list                列出所有配置
  reset               重置为默认配置
  edit                在编辑器中打开配置文件

${colors.yellow}配置项:${colors.nc}
  defaultTarget   默认目标分支 (默认: test)
  autoPush        是否自动推送 (默认: false)
  autoConfirm     是否自动确认 (默认: false)
  mergeNoFf       是否使用 --no-ff (默认: false)

${colors.yellow}示例:${colors.nc}
  # 将当前分支合并到 test（交互式）
  gito mergeto

  # 将 feature 分支合并到 develop（交互式）
  gito mergeto develop feature

  # 将当前分支合并到 test，自动推送
  gito mergeto --push

  # 将 feature 合并到 test，自动确认并推送
  gito mergeto test feature --yes --push

  # 设置默认目标分支为 main
  gito config set defaultTarget main

  # 查看所有配置
  gito config list
`);
}

/**
 * 显示版本信息
 */
export function showVersion(): void {
  console.log('gito version 0.0.1');
}

/**
 * 提示用户确认
 */
export async function confirm(message: string, autoConfirm: boolean): Promise<boolean> {
  if (autoConfirm) {
    console.log(`${colors.blue}ℹ 自动确认: ${message}${colors.nc}`);
    return true;
  }

  const answer = await ask(`${message} (y/N): `);
  return answer.toLowerCase() === 'y';
}

/**
 * 向用户提问
 * Bun 完全支持 node:readline/promises，使用现代 Promise API
 */
export async function ask(question: string): Promise<string> {
  const readline = await import('node:readline/promises');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const answer = await rl.question(question);
    rl.close();
    return answer;
  } catch (error) {
    rl.close();
    throw error;
  }
}

/**
 * 显示信息头部
 */
export function showHeader(source: string, target: string, autoPush: boolean, autoConfirm: boolean): void {
  console.log();
  console.log(`${colors.magenta}╔════════════════════════════════════════════════════════════╗${colors.nc}`);
  console.log(`${colors.magenta}║  🔀  Git 安全合并脚本 (Bun CLI)                           ║${colors.nc}`);
  console.log(`${colors.magenta}╠════════════════════════════════════════════════════════════╣${colors.nc}`);
  console.log(
    `${colors.magenta}║${colors.nc}  ${colors.cyan}源分支:   ${source.padEnd(48)}${colors.nc}${colors.magenta}║${colors.nc}`
  );
  console.log(
    `${colors.magenta}║${colors.nc}  ${colors.cyan}目标分支: ${target.padEnd(48)}${colors.nc}${colors.magenta}║${colors.nc}`
  );
  console.log(
    `${colors.magenta}║${colors.nc}  ${colors.cyan}自动推送: ${autoPush ? 'true'.padEnd(48) : 'false'.padEnd(48)}${colors.nc}${
      colors.magenta
    }║${colors.nc}`
  );
  console.log(
    `${colors.magenta}║${colors.nc}  ${colors.cyan}自动确认: ${autoConfirm ? 'true'.padEnd(48) : 'false'.padEnd(48)}${
      colors.nc
    }${colors.magenta}║${colors.nc}`
  );
  console.log(`${colors.magenta}╚════════════════════════════════════════════════════════════╝${colors.nc}`);
  console.log();
}

/**
 * 显示成功消息
 */
export function showSuccess(message: string): void {
  console.log(`${colors.green}✓ ${message}${colors.nc}`);
}

/**
 * 显示错误消息
 */
export function showError(message: string): void {
  console.log(`${colors.red}✗ ${message}${colors.nc}`);
}

/**
 * 显示警告消息
 */
export function showWarning(message: string): void {
  console.log(`${colors.yellow}⚠ ${message}${colors.nc}`);
}

/**
 * 显示信息消息
 */
export function showInfo(message: string): void {
  console.log(`${colors.blue}ℹ ${message}${colors.nc}`);
}

/**
 * 显示合并冲突信息
 */
export function showMergeConflict(target: string, originalBranch: string): void {
  console.log();
  console.log(`${colors.red}✗ 合并冲突！${colors.nc}`);
  console.log();
  console.log(`${colors.yellow}当前在 ${target} 分支，请手动解决冲突：${colors.nc}`);
  console.log(`  1. 查看冲突文件: ${colors.cyan}git status${colors.nc}`);
  console.log(`  2. 解决冲突后: ${colors.cyan}git add <文件>${colors.nc}`);
  console.log(`  3. 完成合并: ${colors.cyan}git merge --continue${colors.nc}`);
  console.log(`  4. 切换回原分支: ${colors.cyan}git checkout ${originalBranch}${colors.nc}`);
  console.log();
  console.log(`或者放弃合并: ${colors.cyan}git merge --abort${colors.nc}`);
}

/**
 * 显示完成消息
 */
export function showComplete(currentBranch: string): void {
  showSuccess(`完成！当前分支: ${currentBranch}`);

  console.log();
  console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.nc}`);
  console.log(`${colors.green}✓ 合并操作成功完成！${colors.nc}`);
  console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.nc}`);
}

/**
 * 显示配置列表
 */
export function showConfigList(config: any): void {
  console.log();
  console.log(`${colors.cyan}当前配置:${colors.nc}`);
  console.log();
  for (const [key, value] of Object.entries(config)) {
    console.log(`  ${colors.yellow}${key}:${colors.nc} ${value}`);
  }
  console.log();
}

/**
 * 显示配置值
 */
export function showConfigValue(key: string, value: any): void {
  console.log();
  console.log(`${colors.cyan}${key}:${colors.nc} ${value}`);
  console.log();
}
