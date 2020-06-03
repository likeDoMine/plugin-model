import React from 'react';

interface ExecutorProps {
  hook: () => any;
  onUpdate: (val: any) => void;
  namespace: string;
}

// 定义的一个执行方法，
// 设置对应的值
export default (props: ExecutorProps) => {
  const { hook, onUpdate, namespace } = props;
  try {
    const data = hook();
    onUpdate(data);
  } catch (e) {
    console.error(`plugin-model: Invoking '${namespace || 'unknown'}' model failed:`, e);
  }

  return <></>;
};
