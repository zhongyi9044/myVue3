import { isObject } from '@vue/shared'

import {
  mutableHandlers,
  shallowReactiveHandlers,
  readOnlyHandlers,
  shallowReadonlyHandlers,
} from './baseHandlers'

export function reactive(target) {
  //可读可写，深度响应式
  return createReactiveObject(target, false, mutableHandlers)
}

export function shallowReactive(target) {
  //可读可写，浅度响应式
  return createReactiveObject(target, false, shallowReactiveHandlers)
}

export function readonly(target) {
  //仅可读，深度响应式
  return createReactiveObject(target, true, readOnlyHandlers)
}

export function shallowReadonly(target) {
  //仅可读，浅度响应式
  return createReactiveObject(target, true, shallowReadonlyHandlers)
}

/*
  如果一个对象只被WeakMap引用就会垃圾回收，不会造成内存泄，且键能是对象
*/
const reactiveMap = new WeakMap() //存放可读写的的数据
const readonlyMap = new WeakMap() //存放只可读的数据
// 函数柯里化，不同要求，不同参数，不同处理
export function createReactiveObject(target, isReadonly, baseHandlers) {
  //reactive只能拦截对象
  if (!isObject(target)) {
    return target
  }

  //根据参数判断需要用到哪个Map
  const proxyMap = isReadonly ? readonlyMap : reactiveMap

  //判断一下当前需要代理的数据有没有被代理过
  const exisitProxy = proxyMap.get(target)

  //代理过直接返回
  if (exisitProxy) {
    return exisitProxy
  }

  //响应式代理核心 如果被代理过就不要再代理
  const proxy = new Proxy(target, baseHandlers)
  //放入对应Map
  proxyMap.set(target, proxy)

  return proxy
}
