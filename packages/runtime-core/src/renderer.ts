import { ShapeFlags } from '@vue/shared'
import { createAppAPI } from './apiCreateApp'
import { createComponentInstance, setupComponent } from './component'
import { effect } from '@vue/reactivity'
import { normalizeVnode, Text } from './vnode'
import { queueJob } from './schedule'
import { getSequence } from './getSequence.js'

export function createRenderer(renderOptions) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    createComment: hostCreateComment,
    setText: hostSetText,
    setElementText: hostSetElementText,
    nextSibling: hostNextSibling,
  } = renderOptions

  const setupRenderEffect = (instance, container) => {
    //创建effect方法，在effect运行render，这样更新的时候就会执行
    instance.update = effect(
      function componentEffect() {
        //每个组件都有自己的effect，对应组件数据变化重新执行对应组件effect
        if (!instance.isMounted) {
          //是否被挂载过，没有则是初渲染
          //初渲染
          let proxyToUse = instance.proxy

          let subTree = (instance.subTree = instance.render(proxyToUse))
          patch(null, subTree, container)
          instance.isMounted = true
        } else {
          // 更新渲染
          const prevtree = instance.subTree
          let proxyToUse = instance.proxy
          const nextTree = instance.render(proxyToUse)
          patch(prevtree, nextTree, container)
        }
      },
      {
        scheduler: queueJob,
      }
    )
  }

  const mountComponent = (initialVNode, container) => {
    //组件渲染流程 最核心就是调用setup拿到返回值，获取render函数进行渲染
    // 1.先有实例
    const instance = (initialVNode.component =
      createComponentInstance(initialVNode))
    // 2.需要的数据解析到实例
    setupComponent(instance)
    // 3.创建一个effect让render运行
    setupRenderEffect(instance, container)
  }

  const processComponent = (n1, n2, container) => {
    if (n1 == null) {
      //组件没有上一次虚拟节点,即第一次渲染
      mountComponent(n2, container)
    } else {
      //组件更新
    }
  }

  function mountChildren(children, container) {
    for (let i = 0; i < children.length; i++) {
      // 避免覆盖，把文本类型的儿子变成对象
      let child = normalizeVnode(children[i])
      patch(null, child, container)
    }
  }

  function mountElement(vnode, container, anchor) {
    //递归渲染
    const { props, shapeFlag, type, children } = vnode
    let el = (vnode.el = hostCreateElement(type)) //创建元素
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]) //创建属性
      }
    }
    //如果儿子是文本
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    }
    //如果儿子是数组

    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el)
    }
    hostInsert(el, container, anchor)
  }

  function patchProps(oldProps, newProps, el) {
    if (oldProps !== newProps) {
      for (let key in newProps) {
        const prev = oldProps[key]
        const next = newProps[key]
        if (prev !== next) {
          hostPatchProp(el, key, prev, next)
        }
      }
      for (const key in newProps) {
        if (!(key in newProps)) {
          hostPatchProp(el, key, oldProps[key], null)
        }
      }
    }
  }
  function unmountChildren(children, el = null) {
    for (let i = 0; i < children.length; i++) {
      unmount(children[i])
    }
  }
  function patchKeyedChildren(c1, c2, el) {
    let i = 0 //默认从头开始比
    let e1 = c1.length - 1
    let e2 = c2.length - 1

    // 尽可能减少比对的区域

    //循环匹配，从头匹配到不同的就停止
    while (i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]
      if (isSameVnodeType(n1, n2)) {
        patch(n1, n2, el)
      } else {
        break
      }
      i++
    }
    //循环匹配，从尾匹配到不同的就停止
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2]
      if (isSameVnodeType(n1, n2)) {
        patch(n1, n2, el)
      } else {
        break
      }
      e1--
      e2--
    }

    //根据i,e1,e2的大小关系推断出新老儿子不同的数量关系
    if (i > e1) {
      //老的少新的多
      if (i <= e2) {
        while (i <= e2) {
          // 根据e2找到添加节点的参照位置
          const nextPos = e2 + 1

          const anchor = nextPos < c2.length ? c2[nextPos].el : null //null就是往后直接加
          //需要添加
          patch(null, c2[i], el, anchor)
          i++
        }
      }
    } else if (i > e2) {
      //老的多新的少
      while (i <= e1) {
        unmount(c1[i])
        i++
      }
    } else {
      //乱序比对，尽可能复用
      let s1 = i
      let s2 = i

      //创建一个映射表
      const keyToNewIndexMap = new Map()

      for (let i = s2; i <= e2; i++) {
        //把新的节点放到映射表
        const childVnode = c2[i]
        keyToNewIndexMap.set(childVnode.key, i)
      }
      // 将新的节点的下标在老的节点下标哪个位置映射出来
      const toBePatched = e2 - s2 + 1
      const newIndexToOldIndexMap = new Array(toBePatched).fill(0)
      //去老的里面找，看有没有可以复用的
      for (let i = s1; i <= e1; i++) {
        const oldVnode = c1[i]
        let newIndex = keyToNewIndexMap.get(oldVnode.key)
        if (newIndex === undefined) {
          //老的不在新的里面,卸载
          unmount(oldVnode)
        } else {
          //新老比对
          newIndexToOldIndexMap[newIndex - s2] = i + 1
          patch(oldVnode, c2[newIndex], el)
        }
      }
      let increasingNewIndexSequence = getSequence(newIndexToOldIndexMap) //最长公共子序列算法
      let j = increasingNewIndexSequence.length - 1
      console.log(increasingNewIndexSequence)
      for (let i = toBePatched - 1; i >= 0; i--) {
        let currentIndex = i + s2
        let child = c2[currentIndex]
        const anchor =
          currentIndex + 1 < c2.length < c2.length
            ? c2[currentIndex + 1].el
            : null
        if (newIndexToOldIndexMap[i] == 0) {
          patch(null, child, el, anchor)
        } else {
          if (i != increasingNewIndexSequence[j]) {
            hostInsert(child.el, el, anchor)
          } else {
            j--
          }
        }
      }
    }
  }
  function patchChild(n1, n2, el) {
    const c1 = n1.children
    const c2 = n2.children

    const prevShapeFlag = n1.shapeFlag
    const shapeFlag = n2.shapeFlag

    // 分别识别儿子的状况

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      //老的有n个孩子，新的是文本
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1, el)
      }

      //两个人都是文本
      if (c2 !== c1) {
        hostSetElementText(el, c2)
      }
    } else {
      // 新是数组，上一次是文本或者数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 上一次是数组，这一次是数组
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          patchKeyedChildren(c1, c2, el)
        } else {
          //没有孩子
          hostSetElementText(el, '')
        }
      } else {
        //上一次是文本或者空
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(el, '')
        }
        //这一次是数组
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, el)
        }
      }
    }
  }
  function patchElement(n1, n2, container) {
    let el = (n2.el = n1.el)
    const oldProps = n1.props || {}
    const newProps = n2.props || {}

    //比属性
    patchProps(oldProps, newProps, el)
    //比儿子
    patchChild(n1, n2, el)
  }
  function processElement(n1, n2, container, anchor) {
    if (n1 == null) {
      mountElement(n2, container, anchor)
    } else {
      patchElement(n1, n2, container)
    }
  }
  const processText = (n1, n2, container) => {
    if (n1 == null) {
      hostInsert((n2.el = hostCreateText(n2.children)), container)
    }
  }

  //看看n1和n2是不是同类元素
  function isSameVnodeType(n1, n2) {
    return n1.type === n2.type && n1.key === n2.key
  }
  //删除元素
  function unmount(n1) {
    hostRemove(n1.el)
  }

  const patch = (n1, n2, container, anchor = null) => {
    //针对不同类型做初始化
    const { shapeFlag, type } = n2

    //如果n1，n2是不一样类型的，可以不用比较直接替换
    if (n1 && !isSameVnodeType(n1, n2)) {
      anchor = hostNextSibling(n1.el) //获取n1的下一个元素，让n2插入的时候有参照位置
      unmount(n1)
      n1 = null //这里n1是null，那么后面直接重新挂载n2
    }

    switch (type) {
      case Text:
        processText(n1, n2, container)
        break
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          //如果是元素
          processElement(n1, n2, container, anchor)
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          //如果是组件
          processComponent(n1, n2, container)
        }
        break
    }
  }

  const render = (vnode, container) => {
    //核心，根据不同的虚拟节点，创建对应的真实元素
    patch(null, vnode, container)
  }
  //怎么渲染
  return {
    createApp: createAppAPI(render),
  }
}
