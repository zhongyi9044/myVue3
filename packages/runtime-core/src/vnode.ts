//创建虚拟节点

import { isArray, isObject, isString, ShapeFlags } from '@vue/shared'

export function isVnode(vnode) {
  return vnode.___v_idVnode
}

export const createVnode = (type, props, children = null) => {
  // 根据type判断是元素还是组件,字符串是元素，对象是组件
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : 0

  // 虚拟节点
  const vnode = {
    ___v_idVnode: true, //是否是vnode节点
    type,
    props,
    children,
    component: null, //组件的实例
    el: null, //对应的真实节点
    key: props && props.key, //diff算法用的key
    shapeFlag,
  }
  //判断儿子类型，如果有多个节点，那就是数组，
  normalizeChildren(vnode, children)

  return vnode
}

function normalizeChildren(vnode, children) {
  let type = 0
  if (children == null) {
  } else if (isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN
  } else {
    type = ShapeFlags.TEXT_CHILDREN
  }
  //根据孩子类型，改变shapFlag，|的作用就是说明他既是某个类型又是某个类型，这是根据位运算的特性得出的结论算法
  vnode.shapeFlag = vnode.shapeFlag | type
}

export const Text = Symbol('TEXT')
export function normalizeVnode(child) {
  if (isObject(child)) {
    return child
  }
  return createVnode(Text, null, String(child))
}
