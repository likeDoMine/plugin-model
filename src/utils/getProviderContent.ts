// node的地址管理
import { join } from 'path';

/**
 * 用户友好的全局匹配
 */
import globby from 'globby';
/**
 * NodeJS核心模块扩展 
 * EOL： 特定于操作系统的行尾标记。
 * \n on POSIX
 * \r\n on Windows
 */

import { EOL } from 'os';

// 正则处理path
import { winPath } from 'umi-utils';

import { genImports, genModels, genExtraModels, ModelItem, getValidFiles } from './index';

// 获取文件
function getFiles(cwd: string) {
  return globby
    .sync('./**/*.{ts,tsx,js,jsx}', {
      cwd,
    })
    .filter(
      (file: string) =>
        !file.endsWith('.d.ts') &&
        !file.endsWith('.test.js') &&
        !file.endsWith('.test.jsx') &&
        !file.endsWith('.test.ts') &&
        !file.endsWith('.test.tsx'),
    );
}

// 获取所有的models
function getModels(files: string[]) {
  const sortedModels = genModels(files);
  return sortedModels
    .map(ele => `'${ele.namespace.replace(/'/g, "\\'")}': ${ele.importName}`)
    .join(', ');
}

// 获取modal的基础信息
/**
 * models
 * importPath： 地址
 * importName： 名字
 * namespace： 定义的namespace名称
 * 
 */
function getExtraModels(models: ModelItem[] = []) {
  const extraModels = genExtraModels(models);
  return extraModels
    .map(ele => `'${ele.namespace}': ${winPath(ele.importName)}`)
    .join(', ');
}

// 组件成对应的代码： import文件地址
function getExtraImports(models: ModelItem[] = []) {
  const extraModels = genExtraModels(models);
  return extraModels
    .map(
      ele =>
        `import ${ele.importName} from '${winPath(
          ele.importPath.replace(/'/g, "\\'"),
        )}';`,
    )
    .join(EOL);
}

// 将对应的文件组件成一个js文件
export default function(modelsDir: string, extra: ModelItem[] = []) {
  const files = getValidFiles(getFiles(modelsDir), modelsDir);
  const imports = genImports(files);
  const userModels = getModels(files);
  const extraModels = getExtraModels(extra);
  const extraImports = getExtraImports(extra);
  return `import React from 'react';
${extraImports}
${imports}
// @ts-ignore
import Dispatcher from '${winPath(join(__dirname, '..', 'helpers', 'dispatcher'))}';
// @ts-ignore
import Executor from '${winPath(join(__dirname, '..', 'helpers', 'executor'))}';
// @ts-ignore
import { UmiContext } from '${winPath(join(__dirname, '..', 'helpers', 'constant'))}';

export const models = { ${extraModels ? `${extraModels}, ` : ''}${userModels} };

export type Model<T extends keyof typeof models> = {
  [key in keyof typeof models]: ReturnType<typeof models[T]>;
};

export type Models<T extends keyof typeof models> = Model<T>[T]

const dispatcher = new Dispatcher!();
const Exe = Executor!;

export default ({ children }: { children: React.ReactNode }) => {

  return (
    <UmiContext.Provider value={dispatcher}>
      {
        Object.entries(models).map(pair => (
          <Exe key={pair[0]} namespace={pair[0]} hook={pair[1] as any} onUpdate={(val: any) => {
            const [ns] = pair as [keyof typeof models, any];
            dispatcher.data[ns] = val;
            dispatcher.update(ns);
          }} />
        ))
      }
      {children}
    </UmiContext.Provider>
  )
}
`;
}
