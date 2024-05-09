import { createVnode } from "./vnode"

export function createAppAPI(render) {
  return function createApp(rootComponent, rootProps) {
    //渲染哪个组件哪个属性
    const app = {
      __prop: rootProps,
      __component: rootComponent,
      __container: null,
      mount(container) {//挂载目的地
        
        // 创建虚拟节点
        let vnode = createVnode(rootComponent,rootProps)
        render(vnode, container)

      },
    }
    return app
  }
}
