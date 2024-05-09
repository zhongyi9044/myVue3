//元素操作

export const nodeOps = {
  //新增元素
  createElement: (tarNanme) => document.createElement(tarNanme),

  //删除元素
  remove: (child) => {
    if (child) {
      const parent = child.parentNode
      if (parent) {
        parent.removeChild(child)
      }
    }
  },

  //插入元素
  insert: (child, parent, anchor = null) => {
    parent.insertBefore(child, anchor) //插入到parent内的anchor之前，anchor为空则等于appendChild
  },

  //获取元素
  querySelector: (selector) => document.querySelector(selector),

  //设置元素内容
  setElementText: (el, text) => (el.textContent = text),

  //创建文本
  createText: (text) => document.createTextNode(text),

  //设置文本内容
  setText: (node, text) => (node.nodeValue = text),

  //获取元素的下一个节点
  nextSibling: (node) => node.nextSibling,
}
