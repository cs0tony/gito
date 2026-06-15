#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

// 解析命令行参数
const args = process.argv.slice(2);
let target = null;
let source = null;
let autoPush = false;
let autoConfirm = false;
let mergeNoFf = false;

// 颜色（跨平台）
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  nc: '\x1b[0m'
};

// 先解析选项参数，再解析位置参数
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--push' || arg === '-p') {
    autoPush = true;
  } else if (arg === '--yes' || arg === '-y') {
    autoConfirm = true;
  } else if (arg === '--help' || arg === '-h') {
    showHelp();
    process.exit(0);
  } else if (arg === '--merge-no-ff') {
    mergeNoFf = true;
  } else {
    // 位置参数：第一个是目标分支，第二个是源分支
    if (target === null) {
      target = arg;
    } else if (source === null) {
      source = arg;
    }
  }
}

// 设置默认值
if (target === null) {
  target = 'test';
}
if (source === null) {
  source = getCurrentBranch();
}

// 如果不是终端，禁用颜色
if (!process.stdout.isTTY) {
  Object.keys(colors).forEach(k => (colors[k] = ''));
}

function showHelp() {
  console.log(`
${colors.cyan}Git 安全合并脚本${colors.nc}

${colors.yellow}用法:${colors.nc}
  node git-merge-to.js [目标分支] [源分支] [选项]

${colors.yellow}参数:${colors.nc}
  目标分支    要合并到的目标分支 (默认: test)
  源分支      要合并的源分支 (默认: 当前分支)

${colors.yellow}选项:${colors.nc}
  -p, --push       自动推送到远程仓库
  -y, --yes        自动确认所有提示（非交互模式）
  -h, --help       显示帮助信息

${colors.yellow}示例:${colors.nc}
  # 将当前分支合并到 test（交互式）
  node git-merge-to.js

  # 将 feature 分支合并到 test（交互式）
  node git-merge-to.js test feature

  # 将当前分支合并到 test，自动推送
  node git-merge-to.js --push

  # 将 feature 合并到 test，自动确认并推送
  node git-merge-to.js test feature --yes --push

  # 将当前分支合并到 develop，自动推送
  node git-merge-to.js develop --push
`);
}

function runGit(args, options = {}) {
  try {
    const result = execSync(`git ${args}`, {
      encoding: 'utf-8',
      stdio: options.capture ? 'pipe' : 'inherit',
      ...options
    });
    return options.capture ? result.trim() : null;
  } catch (error) {
    if (options.capture) return null;
    throw error;
  }
}

function getCurrentBranch() {
  let branch = runGit('branch --show-current', { capture: true });
  if (!branch) {
    branch = runGit('rev-parse --abbrev-ref HEAD', { capture: true });
  }
  return branch;
}

function branchExists(branch) {
  try {
    runGit(`show-ref --verify --quiet refs/heads/${branch}`);
    return true;
  } catch {
    return false;
  }
}

function hasUncommittedChanges() {
  const status = runGit('status --porcelain', { capture: true });
  return status.length > 0;
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function confirm(message) {
  if (autoConfirm) {
    console.log(`${colors.blue}ℹ 自动确认: ${message}${colors.nc}`);
    return true;
  }

  const answer = await ask(`${message} (y/N): `);
  return answer.toLowerCase() === 'y';
}

async function main() {
  // 验证源分支
  if (!source || source === 'HEAD') {
    console.log(`${colors.red}✗ 错误：无法获取当前分支名，请手动指定源分支${colors.nc}`);
    console.log(`使用 --help 查看帮助`);
    process.exit(1);
  }

  // 检查是否相同分支
  if (source === target) {
    console.log(`${colors.red}✗ 错误：源分支和目标分支相同 (${source})${colors.nc}`);
    process.exit(1);
  }

  if (!branchExists(source)) {
    console.log(`${colors.red}✗ 错误：源分支 '${source}' 不存在${colors.nc}`);
    process.exit(1);
  }

  // 显示信息
  console.log();
  console.log(`${colors.magenta}╔════════════════════════════════════════════════════════════╗${colors.nc}`);
  console.log(`${colors.magenta}║  🔀  Git 安全合并脚本 (Node.js)                            ║${colors.nc}`);
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

  // 确认合并
  // const confirmed = await confirm(`确认将 ${source} 合并到 ${target}？`);
  // if (!confirmed) {
  //   console.log(`${colors.blue}ℹ 已取消合并${colors.nc}`);
  //   process.exit(0);
  // }

  const originalBranch = getCurrentBranch();

  // 检查工作区是否有未提交的修改
  if (hasUncommittedChanges()) {
    console.log(`${colors.yellow}⚠ 警告：工作区有未提交的修改${colors.nc}`);
    const continueAny = await confirm('是否继续合并？');
    if (!continueAny) {
      console.log(`${colors.blue}ℹ 已取消${colors.nc}`);
      process.exit(0);
    }
  }

  try {
    // 验证分支是否存在
    if (!branchExists(target)) {
      console.log(`${colors.red}✗ 警告：目标分支 '${target}' 不存在${colors.nc}`);
      const continueAny = await confirm('是否从 master 分支创建并继续？');
      if (!continueAny) {
        console.log(`${colors.blue}ℹ 已取消${colors.nc}`);
        process.exit(0);
      } else {
        runGit(`checkout -b ${target} master`);
        console.log(`${colors.green}✔ 创建并切换到目标分支 '${target}'${colors.nc}`);
        // 发布到远程分支
        runGit(`push --set-upstream origin ${target}`);
        console.log(`${colors.green}✔ 已发布到远程分支${colors.nc}`);
      }
    } else {
      // 切换到目标分支
      console.log(`${colors.blue}ℹ 切换到 ${target}...${colors.nc}`);
      runGit(`checkout ${target}`);
    }

    // 尝试拉取最新代码
    try {
      const hasUpstream = runGit(`rev-parse --abbrev-ref ${target}@{u}`, { capture: true });
      if (hasUpstream) {
        console.log(`${colors.blue}ℹ 拉取远程最新代码...${colors.nc}`);
        runGit(`pull --ff-only`);
      }
    } catch {
      // 没有上游分支或拉取失败，忽略
      console.log(`${colors.yellow}⚠ 无法快进拉取，跳过${colors.nc}`);
    }

    // 执行合并
    console.log(`${colors.blue}ℹ 合并 ${source} 到 ${target}...${colors.nc}`);
    try {
      runGit(`merge ${source} --no-edit${mergeNoFf ? ' --no-ff' : ''}`);
      console.log(`${colors.green}✓ 合并成功！${colors.nc}`);

      // 推送（根据参数决定是否自动推送）
      let shouldPush = autoPush;
      if (!autoPush && !autoConfirm) {
        shouldPush = await confirm(`是否推送 ${target} 和 ${source} 到远程？`);
      } else if (!autoPush && autoConfirm) {
        // 自动确认模式下，如果没有 --push，默认不推送
        shouldPush = false;
        console.log(`${colors.blue}ℹ 自动确认模式，跳过推送（如需推送请使用 --push）${colors.nc}`);
      }

      if (shouldPush) {
        console.log(`${colors.blue}ℹ 推送到远程...${colors.nc}`);
        runGit(`push origin ${target}`);
        console.log(`${colors.green}✓ 已推送到远程${colors.nc}`);
      } else if (!autoPush && !autoConfirm) {
        console.log(`${colors.blue}ℹ 跳过推送${colors.nc}`);
      }

      // 切换目标分支
      console.log(`${colors.blue}ℹ 切换到 ${source}...${colors.nc}`);
      runGit(`checkout ${source}`);
      if (shouldPush) {
        console.log(`${colors.blue}ℹ 推送到远程...${colors.nc}`);
        runGit(`push origin ${source}`);
        console.log(`${colors.green}✓ 已推送到远程${colors.nc}`);
      } else if (!autoPush && !autoConfirm) {
        console.log(`${colors.blue}ℹ 跳过推送${colors.nc}`);
      }

      // 切回原分支
      if (source !== originalBranch) {
        console.log(`${colors.blue}ℹ 切换回 ${originalBranch}...${colors.nc}`);
        runGit(`checkout ${originalBranch}`);
      }
      console.log(`${colors.green}✓ 完成！当前分支: ${getCurrentBranch()}${colors.nc}`);

      console.log();
      console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.nc}`);
      console.log(`${colors.green}✓ 合并操作成功完成！${colors.nc}`);
      console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.nc}`);
    } catch {
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
      process.exit(1);
    }
  } catch (error) {
    console.log(`${colors.red}✗ 错误：${error.message}${colors.nc}`);
    // 尝试切回原分支
    try {
      runGit(`checkout ${originalBranch}`);
    } catch {
      // 忽略
    }
    process.exit(1);
  }
}

// 处理 Ctrl+C
process.on('SIGINT', async () => {
  console.log(`\n${colors.yellow}⚠ 操作已中断${colors.nc}`);
  process.exit(0);
});

main().catch(error => {
  console.error(`${colors.red}✗ 未处理的错误：${error.message}${colors.nc}`);
  process.exit(1);
});
