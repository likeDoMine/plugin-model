import { join } from 'path';
// need get a  index.js
// eslint-disable-next-line import/no-unresolved
// umi源码中的packages下
//  umi API的类型定义
import { IApi } from 'umi-types';

// 获取正则匹配后的地址
import { winPath } from 'umi-utils';
// 定一个名字“plugin-model”；
import { DIR_NAME_IN_TMP } from './constants';

// 根据全局的models建立的文件，用全局createContext创建对应的model文件
import getProviderContent from './utils/getProviderContent';

// 获取对应的modal值
import getUseModelContent from './utils/getUseModelContent';

// 在运行时添加一些配置，用于被umi调用的时候，注入对应的plugin-model的配置
export default (api: IApi) => {
   // 获取的umi的基础配置
  const { paths, config } = api;

  // 获取对应的model
  function getModelsPath() {
    return join(paths.absSrcPath, config.singular ? 'model' : 'models');
  }

  // Add provider wrapper with rootContainer
  // 添加运行时插件，返回值格式为表示文件路径的字符串。
  api.addRuntimePlugin(join(winPath(__dirname), './runtime'));

  // 生成临时文件，触发时机在 webpack 编译之前。
  api.onGenerateFiles(() => {
    const modelsPath = getModelsPath();
    try {
      const additionalModels = api.applyPlugins('addExtraModels', {
        initialValue: [],
      });
      // Write models/provider.tsx
      // 写入一个临时文件
      api.writeTmpFile(
        `${DIR_NAME_IN_TMP}/Provider.tsx`,
        getProviderContent(modelsPath, additionalModels),
      );
      // Write models/useModel.tsx
      // 写入一个临时文件
      api.writeTmpFile(`${DIR_NAME_IN_TMP}/useModel.tsx`, getUseModelContent());
    } catch (e) {
      api.log.error(e);
    }
  });

  api.addPageWatcher(() => {
    const modelsPath = getModelsPath();
    return [modelsPath];
  });

  // Export useModel and Models from umi
  /**
   * 添加需要 umi 额外导出的内容，
   * 返回值格式为 ``{ source: string, specifiers?: (string | { local: string, exported: string })[], exportAll?: boolean }```。
   * 比如 api.addUmiExports(() => { source: 'dva', specifiers: ['connect'] })，
   * 然后就可以通过 import { connect } from 'umi' 使用 dva 的 connect 方法了。
   */
  api.addUmiExports([
    {
      exportAll: true,
      source: winPath(join(api.paths.absTmpDirPath, DIR_NAME_IN_TMP, 'useModel')),
    },
  ]);
};
