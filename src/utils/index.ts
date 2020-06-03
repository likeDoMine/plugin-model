import path from 'path';
import { EOL } from 'os';
import { readFileSync } from 'fs';
import { winPath } from 'umi-utils';

// JavaScript解析器
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { Identifier, ArrowFunctionExpression } from '@babel/types';

export type ModelItem = { absPath: string; namespace: string } | string;

// 获取文件的名字
export const getName = (absPath: string) => path.basename(absPath, path.extname(absPath));

// 地址组装
export const getPath = (absPath: string) => {
  const info = path.parse(absPath);
  return winPath(path.join(info.dir, info.name).replace(/'/, "'"));
};

// 组装model
export const genImports = (imports: string[]) =>
  imports
    .map((ele, index) => `import model${index} from "${winPath(getPath(ele))}";`)
    .join(EOL);

export const genExtraModels = (models: ModelItem[] = []) =>
  models.map(ele => {
    if (typeof ele === 'string') {
      return {
        importPath: getPath(ele),
        importName: getName(ele),
        namespace: getName(ele),
      };
    }
    return {
      importPath: getPath(ele.absPath),
      importName: getName(ele.absPath),
      namespace: ele.namespace,
    };
  });

type HookItem = { namespace: string; use: string[] };

export const sort = (ns: HookItem[]) => {
  let final: string[] = [];
  ns.forEach((item, index) => {
    if (item.use && item.use.length) {
      const itemGroup = [...item.use, item.namespace];

      const cannotUse = [item.namespace];
      for (let i = 0; i <= index; i += 1) {
        if (ns[i].use.filter(v => cannotUse.includes(v)).length) {
          if (!cannotUse.includes(ns[i].namespace)) {
            cannotUse.push(ns[i].namespace);
            i = -1;
          }
        }
      }

      const errorList = item.use.filter(v => cannotUse.includes(v));
      if (errorList.length) {
        throw Error(
          `Circular dependencies: ${item.namespace} can't use ${errorList.join(', ')}`,
        );
      }

      const intersection = final.filter(v => itemGroup.includes(v));
      if (intersection.length) {
        // first intersection
        const finalIndex = final.indexOf(intersection[0]);
        // replace with groupItem
        final = final
          .slice(0, finalIndex)
          .concat(itemGroup)
          .concat(final.slice(finalIndex + 1));
      } else {
        final.push(...itemGroup);
      }
    }
    if (!final.includes(item.namespace)) {
      // first occurance append to the end
      final.push(item.namespace);
    }
  });

  return [...new Set(final)];
};

export const genModels = (imports: string[]) => {
  const contents = imports.map(absPath => ({
    // 将文件的名字定义成namespace
    namespace: getName(absPath),
    // 根据地址获取对应的文件内容
    content: readFileSync(absPath).toString(),
  }));

  // 获取所有的Model
  const allUserModel = imports.map(getName);

  const checkDuplicates = (list: string[]) => new Set(list).size !== list.length;

  const raw = contents.map((ele, index) => {
   
    // 将对应的model的内容转化成ast语法树
    /**
     * 通过@babel/parser去解析javascript语法
     * sourceType：
     * 1. script： 基于ES6，除开module的导入用script
     * 2. module：基于ES6导入或导出语句的存在。考虑带有ES6导入和导出的文件（import， export, imports, exports）
     * 3. unambiguous: 不确定的情况下、使@ babel / parser尝试猜测
     * defaults： script
     * 
     * plugins: 包含要启用的插件的数组
     */
    const ast = parse(ele.content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    const use: string[] = [];

    // Babel Traverse模块维护整个树状态，并负责替换，删除和添加节点
    traverse(ast, {
      enter(astPath) {
        if (astPath.isIdentifier({ name: 'useModel' })) {
          try {
            // string literal
            const ns = (astPath.parentPath.node as any).arguments[0].value;
            if (allUserModel.includes(ns)) {
              use.push(ns);
            }
          } catch (e) {
            // console.log(e)
          }
        }
      },
    });
  
    // 返回对应的根据文件组装好的model
    return { namespace: ele.namespace, use, importName: `model${index}` };
  });

  const models = sort(raw);

  // 验证models中是否有重复的namespace
  if (checkDuplicates(contents.map(ele => ele.namespace))) {
    throw Error('umi: models 中包含重复的 namespace！');
  }
  // 按照models的namespace做一个排序输出
  return raw.sort((a, b) => models.indexOf(a.namespace) - models.indexOf(b.namespace));
};

export const isValidHook = (filePath: string) => {
  const ast = parse(readFileSync(filePath, { encoding: 'utf-8' }).toString(), {
    sourceType: "module",
    plugins: ["jsx", "typescript"]
  });
  let valid = false;
  let identifierName = '';
  traverse(ast, {
    enter(p) {
      if (p.isExportDefaultDeclaration()) {
        const { type } = p.node.declaration;
        try {
          if (
            type === 'ArrowFunctionExpression' ||
            type === 'FunctionDeclaration'
          ) {
            valid = true;
          } else if (type === 'Identifier') {
            identifierName = (p.node.declaration as Identifier).name;
          }
        } catch (e) {
          console.error(e);
        };
      }
    }
  });

  try {
    if (identifierName) {
      ast.program.body.forEach(ele => {
        if (ele.type === 'FunctionDeclaration') {
          if (ele.id?.name === identifierName) {
            valid = true;
          }
        }
        if (ele.type === 'VariableDeclaration') {
          if ((ele.declarations[0].id as Identifier).name === identifierName &&
            (ele.declarations[0].init as ArrowFunctionExpression).type === 'ArrowFunctionExpression') {
            valid = true;
          }
        }
      })
    }
  } catch (e) {
    valid = false;
  }

  return valid;
}

//  获取符合条件的文件地址

export const getValidFiles = (files: string[], modelsDir: string) => files.map(file => {
  const filePath = path.join(modelsDir, file);
  const valid = isValidHook(filePath);
  if (valid) {
    return filePath;
  }
  return '';
}).filter(ele => !!ele) as string[];
