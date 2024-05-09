import { isArray, isObject } from '@vue/shared'
import { createVnode, isVnode } from './vnode'

export function h(type, propsOrChilden, children) {
  const l = arguments.length

  if (l == 2) {
    //类型+属性 或者 类型+孩子
    if (isObject(propsOrChilden) && !isArray(propsOrChilden)) {
      if (isVnode(propsOrChilden)) {
        // 判断propsOrChilden是不是虚拟节点，因为虚拟节点也是一个对象
        return createVnode(type, null, [propsOrChilden])
      } else {
        // propsOrChilden是属性
        return createVnode(type, propsOrChilden)
      }
    } else {
      //如果propsOrChilden参数不是对象，那一定是孩子
      return createVnode(type, null, propsOrChilden)
    }
  } else {
    if (l > 3) {
      // 孩子一个个写，没有写成数组，变成数组
      children = Array.prototype.slice.call(arguments, 2)
    } else if (l === 3 && isVnode(children)) {
      children = [children]
    }
    return createVnode(type,propsOrChilden,children)
  }
}
