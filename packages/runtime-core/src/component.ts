//关于组件的方法

import { isFunction, isObject, ShapeFlags } from '@vue/shared'
import { PublicInstanceProxyJandlers } from './componentPublicInstanceProxyJandlers'

export function createComponentInstance(vnode) {
  //创建组件实例
  const instance = {
    vnode,
    type: vnode.type,
    props: { a: 1 },
    attrs: {},
    slots: {},
    data: { b: 2 },
    ctx: {},
    setupState: { c: 3 }, //setup返回一个对象，这个对象会作为setUpState
    isMounted: false, //是否挂载过
  }
  instance.ctx = { _: instance }
  return instance
}

export function setupComponent(instance) {
  //解析实例
  const { props, children } = instance.vnode

  instance.props = props
  instance.children = children

  // 根据位运算，看当前组件类型
  let isStateFul = instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
  if (isStateFul) {
    //如果是带状态组件
    //调用当前实例的setup方法填充setupState和render
    setupStatefulComponent(instance)
  }
}

export let currentInstance=null
export let setCurrentInstance=(instance)=>{
  currentInstance=instance
}
export let getCurrentInstance=()=>{
  return currentInstance
}
function setupStatefulComponent(instance) {
  // 1.代理 传递给render函数的参数
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyJandlers as any)
  // 2.获取组件类型，拿到组件setup方法
  let Component = instance.type
  let { setup } = Component

  if (setup) {
    currentInstance=instance
    let setupContext = createSetupContext(instance)
    const setupResult = setup(instance.props, setupContext) //执行setup，并且传递参数
    currentInstance=null
    handlerSetupResult(instance, setupResult)
  } else {
    finishComponentSetup(instance) //完成组件的启动
  }
}
function handlerSetupResult(instance, setupResult) {
  // 根据setup返回结果，把结果放到不同的地方
  if (isFunction(setupResult)) {
    instance.render = setupResult
  } else if (isObject(setupResult)) {
    instance.setupState = setupResult
  }
  finishComponentSetup(instance)
}
function finishComponentSetup(instance) {
  let Component = instance.type
  if (!instance.render) {
    //对template模板进行编译，产生render函数
    if (!Component.render && Component.template) {
    }
    instance.render = Component.render
  }
}

//创建上下文
function createSetupContext(instance) {
  return {
    attrs: instance.attrs,
    slots: instance.slots,

    emit: () => {},
    expose: () => {},
  }
}
