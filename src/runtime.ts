/* eslint-disable import/no-dynamic-require */
import React from 'react';
import { DIR_NAME_IN_TMP } from './constants';

// 运行时文件创建对应的dom
export function rootContainer(container: React.ReactNode) {
  return React.createElement(
    // eslint-disable-next-line global-require
    require(`@tmp/${DIR_NAME_IN_TMP}/Provider`).default,
    null,
    container,
  );
}
