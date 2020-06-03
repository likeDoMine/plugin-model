// 声明一个触发事件
export default class Dispatcher {
  callbacks = {};

  // 定义对应的data值
  data = {};


  // 用于设置对应的值
  update = (namespace: string) => {
    (this.callbacks[namespace] || []).forEach((callback: (val: any) => void) => {
      try {
        const data = this.data[namespace];
        callback(data);
      } catch (e) {
        callback(undefined);
      }
    });
  };
}
