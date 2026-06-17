#!/usr/bin/env bun
import { $, main as bun_main } from 'bun';

import {
  loadConfig,
  setConfigValue,
  getConfigValue,
  resetConfig,
  listConfig,
  isValidConfigKey,
  type Config,
  getConfigPath
} from './config';
import {
  getCurrentBranch,
  branchExists,
  hasUncommittedChanges,
  checkoutBranch,
  pullFastForward,
  mergeBranch,
  pushBranch,
  hasUpstream
} from './git';
import {
  initColors,
  showHelp,
  showVersion,
  confirm,
  ask,
  showHeader,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showMergeConflict,
  showComplete,
  showConfigList,
  showConfigValue,
  colors
} from './ui';

/**
 * CLI 选项接口
 */
interface CliOptions {
  command: string | null; // 'mergeto' 或 'config'
  target: string | null;
  source: string | null;
  autoPush: boolean | null;
  autoConfirm: boolean | null;
  mergeNoFf: boolean | null;
  showHelp: boolean;
  showVersion: boolean;
  configSubCommand: string | null; // config 的子命令: set/get/list/reset/edit
  configKey: string | null;
  configValue: string | null;
}

/**
 * 解析命令行参数
 * 新格式: gito mergeto [target] [source] [options]
 *        gito config <command> [options]
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    command: null,
    target: null,
    source: null,
    autoPush: null,
    autoConfirm: null,
    mergeNoFf: null,
    showHelp: false,
    showVersion: false,
    configSubCommand: null,
    configKey: null,
    configValue: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--push' || arg === '-p') {
      options.autoPush = true;
    } else if (arg === '--yes' || arg === '-y') {
      options.autoConfirm = true;
    } else if (arg === '--no-ff') {
      options.mergeNoFf = true;
    } else if (arg === '--help' || arg === '-h') {
      options.showHelp = true;
    } else if (arg === '--version' || arg === '-V') {
      options.showVersion = true;
    } else if (arg && !arg.startsWith('-')) {
      // 位置参数
      if (options.command === null) {
        options.command = arg;
      } else if (options.command === 'mergeto') {
        if (options.target === null) {
          options.target = arg;
        } else if (options.source === null) {
          options.source = arg;
        }
      } else if (options.command === 'config') {
        if (options.configSubCommand === null) {
          options.configSubCommand = arg;
        } else if (options.configKey === null) {
          options.configKey = arg;
        } else if (options.configValue === null) {
          options.configValue = arg;
        }
      }
    }
  }

  return options;
}

/**
 * 处理配置命令
 */
async function handleConfigCommand(subCommand: string | null, key: string | null, value: string | null): Promise<boolean> {
  if (!subCommand) {
    showError('用法: gito config <set|get|list|reset|edit> [options]');
    return true;
  }

  switch (subCommand) {
    case 'set':
      if (!key || !value) {
        showError('用法: gito config set <key> <value>');
        console.log('\n可用的配置项:');
        console.log('  defaultTarget, autoPush, autoConfirm, mergeNoFf');
        return true;
      }

      if (!isValidConfigKey(key)) {
        showError(`无效的配置项: ${key}`);
        return true;
      }

      await setConfigValue(key as any, value);
      showSuccess(`配置已更新: ${key} = ${value}`);
      return true;

    case 'get':
      if (!key) {
        showError('用法: gito config get <key>');
        return true;
      }

      if (!isValidConfigKey(key)) {
        showError(`无效的配置项: ${key}`);
        return true;
      }

      const configValue = await getConfigValue(key as any);
      showConfigValue(key, configValue);
      return true;

    case 'list':
      const configList = await listConfig();
      showConfigList(configList);
      return true;

    case 'reset':
      await resetConfig();
      showSuccess('配置已重置为默认值');
      return true;

    case 'edit':
      const editor = process.env.EDITOR || 'vim';
      showInfo(`打开编辑器: ${editor}`);
      await $`${editor} ${getConfigPath()}`;
      return true;

    default:
      showError(`未知的配置命令: ${subCommand}`);
      console.log('\n可用的命令: set, get, list, reset, edit');
      return true;
  }
}

/**
 * 主合并流程
 */
async function mainMergeFlow(
  target: string,
  source: string,
  autoPush: boolean,
  autoConfirm: boolean,
  mergeNoFf: boolean
): Promise<void> {
  // 验证源分支
  if (!source || source === 'HEAD') {
    showError('错误：无法获取当前分支名，请手动指定源分支');
    showInfo('使用 --help 查看帮助');
    process.exit(1);
  }

  // 检查是否相同分支
  if (source === target) {
    showError(`错误：源分支和目标分支相同 (${source})`);
    process.exit(1);
  }

  if (!(await branchExists(source))) {
    showError(`错误：源分支 '${source}' 不存在`);
    process.exit(1);
  }

  // 显示信息
  showHeader(source, target, autoPush, autoConfirm);

  const originalBranch = await getCurrentBranch();

  // 检查工作区是否有未提交的修改
  if (await hasUncommittedChanges()) {
    showWarning('工作区有未提交的修改');
    const continueAny = await confirm('是否继续合并？', autoConfirm);
    if (!continueAny) {
      showInfo('已取消');
      process.exit(0);
    }
  }

  try {
    // 验证分支是否存在
    if (!(await branchExists(target))) {
      showWarning(`目标分支 '${target}' 不存在`);

      // 交互模式：询问用户从哪个分支创建
      console.log(`请选择创建 '${target}' 的基础分支：`);
      console.log(`  1. 从当前分支创建`);
      console.log(`  2. 从 master 分支创建`);
      console.log(`  3. 从 main 分支创建`);
      console.log(`  4. 从其他分支创建`);
      console.log(`  5. 取消操作`);

      const choice = await ask('请输入选择 (1-5): ');

      switch (choice.trim()) {
        case '1': {
          const currentBranch = await getCurrentBranch();
          await checkoutBranch(target, true);
          showSuccess(`从当前分支 '${currentBranch}' 创建目标分支 '${target}'`);
          break;
        }
        case '2': {
          // 尝试从 main 创建
          if (await branchExists('main')) {
            await checkoutBranch(target, true, 'main');
            showSuccess(`从 main 创建目标分支 '${target}'`);
          } else {
            showError(`基础分支 'main' 不存在`);
            showInfo('已取消');
            process.exit(0);
          }
          break;
        }
        case '3': {
          // 尝试从 master 创建
          if (await branchExists('master')) {
            await checkoutBranch(target, true, 'master');
            showSuccess(`从 master 创建目标分支 '${target}'`);
          } else {
            showError(`基础分支 'master' 不存在`);
            showInfo('已取消');
            process.exit(0);
          }
          break;
        }
        case '4': {
          const fromBranch = await ask('请输入基础分支名: ');
          if (fromBranch.trim() && (await branchExists(fromBranch.trim()))) {
            await checkoutBranch(target, true, fromBranch.trim());
            showSuccess(`从 ${fromBranch} 创建目标分支 '${target}'`);
          } else {
            showError(`基础分支 '${fromBranch}' 不存在`);
            showInfo('已取消');
            process.exit(0);
          }
          break;
        }
        case '5':
        default:
          showInfo('已取消');
          process.exit(0);
      }

      // 发布到远程分支
      await pushBranch(target, true);
      showSuccess('已发布到远程分支');
    } else {
      // 切换到目标分支
      showInfo(`切换到 ${target}...`);
      await checkoutBranch(target);
    }

    // 尝试拉取最新代码
    try {
      if (await hasUpstream(target)) {
        showInfo('拉取远程最新代码...');
        await pullFastForward();
      }
    } catch {
      // 没有上游分支或拉取失败，忽略
      showWarning('无法快进拉取，跳过');
    }

    // 执行合并
    showInfo(`合并 ${source} 到 ${target}...`);
    try {
      await mergeBranch(source, mergeNoFf);
      showSuccess('合并成功！');

      // 推送（根据参数决定是否自动推送）
      let shouldPush = autoPush;
      if (!autoPush && !autoConfirm) {
        shouldPush = await confirm(`是否推送 ${target} 和 ${source} 到远程？`, autoConfirm);
      }

      if (shouldPush) {
        showInfo('推送到远程...');
        const targetHasUpstream = await hasUpstream(target);
        await pushBranch(target, !targetHasUpstream);
        showSuccess('已推送到远程');
      } else if (!autoPush && !autoConfirm) {
        showInfo('跳过推送');
      }

      // 切换目标分支
      showInfo(`切换到 ${source}...`);
      await checkoutBranch(source);
      if (shouldPush) {
        showInfo('推送到远程...');
        const sourceHasUpstream = await hasUpstream(source);
        await pushBranch(source, !sourceHasUpstream);
        showSuccess('已推送到远程');
      } else if (!autoPush && !autoConfirm) {
        showInfo('跳过推送');
      }

      // 切回原分支
      if (source !== originalBranch) {
        showInfo(`切换回 ${originalBranch}...`);
        await checkoutBranch(originalBranch);
      }

      showComplete(await getCurrentBranch());
    } catch {
      showMergeConflict(target, originalBranch);
      process.exit(1);
    }
  } catch (error: any) {
    showError(`错误：${error.message}`);
    // 尝试切回原分支
    try {
      await checkoutBranch(originalBranch);
    } catch {
      // 忽略
    }
    process.exit(1);
  }
}

/**
 * 主函数
 */
async function main() {
  initColors();

  const args = process.argv.slice(2);
  const options = parseArgs(args);

  // 显示帮助
  if (options.showHelp) {
    showHelp();
    process.exit(0);
  }

  // 显示版本
  if (options.showVersion) {
    showVersion();
    process.exit(0);
  }

  // 如果没有指定命令，默认使用 mergeto
  const command = options.command || 'mergeto';

  // 处理 config 命令
  if (command === 'config') {
    const handled = await handleConfigCommand(options.configSubCommand, options.configKey, options.configValue);
    if (handled) {
      process.exit(0);
    }
  }

  // 处理 mergeto 命令
  if (command === 'mergeto') {
    // 加载配置
    const config = await loadConfig();

    // 合并配置和命令行参数
    // 优先级：命令行参数 > 配置文件 > 默认值
    const target = options.target || config.defaultTarget;
    const source = options.source || (await getCurrentBranch());
    const autoPush = options.autoPush !== null ? options.autoPush : config.autoPush;
    const autoConfirm = options.autoConfirm !== null ? options.autoConfirm : config.autoConfirm;
    const mergeNoFf = options.mergeNoFf !== null ? options.mergeNoFf : config.mergeNoFf;

    // 执行合并流程
    await mainMergeFlow(target, source, autoPush, autoConfirm, mergeNoFf);
  } else {
    showError(`未知的命令: ${command}`);
    console.log('\n可用的命令: mergeto, config');
    showInfo('使用 --help 查看帮助');
    process.exit(1);
  }
}

// 处理 Ctrl+C
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}⚠ 操作已中断${colors.nc}`);
  process.exit(0);
});

// 处理未捕获的错误
process.on('unhandledRejection', (error: any) => {
  showError(`未处理的错误：${error.message}`);
  process.exit(1);
});

// 运行主函数（只在直接运行时执行）
if (import.meta.path === bun_main) {
  main().catch(error => {
    showError(`未处理的错误：${error.message}`);
    process.exit(1);
  });
}

// 导出 main 函数供 index.ts 使用
export { main };
