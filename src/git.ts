/**
 * Git 操作模块
 * 使用 Bun.$ 执行 git 命令
 */
import { $ } from 'bun';

/**
 * 执行 git 命令
 * @param args Git 命令参数
 * @param options 选项
 * @returns 命令输出（如果 capture=true）
 */
export async function runGit(args: string[], options: { capture?: boolean; silent?: boolean } = {}): Promise<string | null> {
  try {
    const result = await $`git ${args}`.quiet(options.silent || false);

    return result.stdout.toString().trim();
  } catch (error: any) {
    if (options.capture) {
      return null;
    }
    throw error;
  }
}

/**
 * 获取当前分支名
 */
export async function getCurrentBranch(): Promise<string> {
  let branch = await runGit(['branch', '--show-current'], { capture: true, silent: true });

  if (!branch) {
    branch = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], { capture: true, silent: true });
  }

  return branch || 'HEAD';
}

/**
 * 检查分支是否存在
 */
export async function branchExists(branch: string): Promise<boolean> {
  try {
    await runGit(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], { silent: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查是否有未提交的修改
 */
export async function hasUncommittedChanges(): Promise<boolean> {
  const status = await runGit(['status', '--porcelain'], { capture: true, silent: true });
  return status ? status.length > 0 : false;
}

/**
 * 切换分支
 * @param branch 目标分支名
 * @param create 是否创建新分支
 * @param fromBranch 创建新分支时的基础分支（默认为当前分支）
 */
export async function checkoutBranch(branch: string, create = false, fromBranch?: string): Promise<void> {
  if (create) {
    const args = fromBranch ? ['checkout', '-b', branch, fromBranch] : ['checkout', '-b', branch];
    await runGit(args);
  } else {
    await runGit(['checkout', branch]);
  }
}

/**
 * 拉取远程最新代码
 */
export async function pullFastForward(): Promise<void> {
  await runGit(['pull', '--ff-only']);
}

/**
 * 执行合并
 */
export async function mergeBranch(source: string, noFF = false): Promise<void> {
  const args = ['merge', source, '--no-edit'];
  if (noFF) {
    args.push('--no-ff');
  }
  await runGit(args);
}

/**
 * 推送到远程
 */
export async function pushBranch(branch: string, setUpstream = false): Promise<void> {
  const args = setUpstream ? ['push', '--set-upstream', 'origin', branch] : ['push', 'origin', branch];
  await runGit(args);
}

/**
 * 检查远程分支是否存在
 */
export async function hasUpstream(branch: string): Promise<boolean> {
  try {
    const result = await runGit(['rev-parse', '--abbrev-ref', `${branch}@{u}`], { capture: true, silent: true });
    return !!result;
  } catch {
    return false;
  }
}

/**
 * 放弃合并
 */
export async function abortMerge(): Promise<void> {
  await runGit(['merge', '--abort']);
}

/**
 * 继续合并
 */
export async function continueMerge(): Promise<void> {
  await runGit(['merge', '--continue']);
}
