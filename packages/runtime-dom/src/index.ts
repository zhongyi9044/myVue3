import { extend } from '@vue/shared'
import { nodeOps } from './nodeOps'
import { patchProp } from './patchProp'
import { createRenderer } from '@vue/runtime-core'

const renderOptions = extend({ patchProp }, nodeOps)

export { renderOptions }

export function createApp(rootComponent, rootProps = null) {
  //createRenderer(怎么渲染)是高阶函数,创建一个渲染器,返回createApp(渲染什么属性什么组件),createApp返回mount(挂载目的地)
  const app = createRenderer(renderOptions).createApp(rootComponent, rootProps)
  let { mount } = app
  app.mount = function (container) {
    //清空容器
    container = document.querySelector(container)
    container.innerHTML = ''
    mount(container)
    // 渲染,挂载
  }
  return app
}

export * from '@vue/runtime-core'
