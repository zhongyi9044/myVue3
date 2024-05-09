import { isArray, isIntegerKey } from '@vue/shared'
import { TriggerOrTypes } from './operators'

export function effect(fn, options: any = {}) {
  //effect变成响应式的，数据变化重新执行

  const effect = createReactiveEffect(fn, options)

  if (!options.lazy) {
    effect() //默认会自动执行一次
  }
  return effect //有点类似vue2的watcher
}

let uid = 0 //每个effect都有一个id
let activeEffect //存储当前effect，像是vue2全局存储的watcher一样
const effectStack = [] //熟悉的watcher栈，先入后出，先执行最后一个
function createReactiveEffect(fn, options) {
  const effect = function reactiveEffect() {
    if (!effectStack.includes(effect)) {
      //先看看栈里有没有一样的，有过就不执行了(防止 变量++ 这样的情况等)
      try {
        effectStack.push(effect) //通过全局栈，拿到effect本身存入栈
        activeEffect = effect //通过全局变量，拿到effect本身，在track就能用effect了
        return fn()
      } finally {
        effectStack.pop() //执行完抛出栈
        activeEffect = effectStack[effectStack.length - 1] //重新指向最外一个
      }
    }
  }
  effect.id = uid++ //effect的id
  effect._isEffect = true //标识是响应式effect
  effect.raw = fn //保留对应的原函数
  effect.options = options //保存用户选项
  return effect
}

//track类似vue2的dep
const targetMap = new WeakMap()
export function track(target, type, key) {
  if (activeEffect === undefined) {
    return
  }
  // 往当前weaWap查找有没有相同的键值对
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    //没有相同的，设立一个键，并且值是一个map
    targetMap.set(target, (depsMap = new Map()))
  }
  let dep = depsMap.get(key)
  if (!dep) {
    //往刚刚从weakmap取出的map查找有没有相同的键值对
    depsMap.set(key, (dep = new Set())) //没有相同的，设立一个键，并且值是一个set
  }
  //如果map里找到的set里没有当前effect，那就加入
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
  }
}

export function trigger(target, type, key?, newValue?, oldValue?) {
  //没收集过，直接返回
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  //把所有要执行的effect放到集合，最后一起执行
  const effects = new Set()
  const add = (effectToAdd) => {
    if (effectToAdd) {
      effectToAdd.forEach((effect) => effects.add(effect))
    }
  }
  //对修改数组的length属性特殊处理
  if (key === 'length' && isArray(target)) {
    depsMap.forEach((dep, key) => {
      debugger
      console.log(depsMap, dep, key)
      if (key === 'length' || key > newValue) {
        //如果依赖收集过的值是‘length’或者[2]这样的，且修改的length小于了收集过的索引
        add(dep) //加到集合
      }
    })
  } else {
    if (key !== undefined) {
      //修改
      add(depsMap.get(key))
    }
    switch (type) {
      case TriggerOrTypes.ADD:
        if (Array.isArray(target) && isIntegerKey(key)) {
          //如果是通过下标索引添加，注意只能是添加，那就通过length触发
          add(depsMap.get('length'))
        }
    }
  }
  effects.forEach((effect: any) => {

    if (effect.options.scheduler) {
      effect.options.scheduler(effect)
    } else {
      effect()
    }
  })
}
