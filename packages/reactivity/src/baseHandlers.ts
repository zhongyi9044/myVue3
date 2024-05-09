//实现new Proxy(target,baseHandler)的各handler

import { extend, hasChanged, hasOwn, isArray, isIntegerKey, isObject } from '@vue/shared'
import { reactive, readonly } from './reactive'
import { track, trigger } from './effect'
import { TrackOrTypes, TriggerOrTypes } from './operators'

/*
后续Object的方法会迁移到Reflect.getProptypeof()
Reflect的操作会有返回值，会报异常
新es6语法

target：原对象
key：属性
receiver：代理对象本身
*/

function createGetter(isReadonly = false, isShallow = false) {
  //根据是不是只可读和是不是浅的造出不同的用于代理的get方法
  return function get(target, key, receiver) {
    const res = Reflect.get(target, key, receiver)

    if (!isReadonly) {
      //不是只读的，进行依赖收集

      //传递三个参数，第二个表示操作的类型
      track(target, TrackOrTypes.GET, key)
    }
    if (isShallow) {
      //是浅的
      return res
    }
    // ！！！！！！！vue3比vue2性能好就是vue3用懒代理，取到了再递归代理，没取到不理
    if (isObject(res)) {
      //如果是对象，还得进去循环一下
      return isReadonly ? readonly(res) : reactive(res)
    }

    return res
  }
}
function createSetter(isShallow = false) {
  //根据是不是只可读和是不是浅的造出不同的用于代理的set方法
  return function set(target, key, value, receiver) {
    const oldValue = target[key] //获取老值

    let hadKey=isArray(target) && isIntegerKey(key)
      ? Number(key) < target.length
      : hasOwn(target, key) //看看是不是数组，并且通过索引修改,如果是那就比比长度和下标，看看是新增还是修改，如果不是数组那就是对象，看看有没有这个属性。这段代码判断是不是更新

    const result = Reflect.set(target, key, value, receiver)

    if(!hadKey){//新增
      trigger(target,TriggerOrTypes.ADD,key,value)
    }else if(hasChanged(oldValue,value)){//修改
      trigger(target,TriggerOrTypes.SET,key,value,oldValue)
    }

    return result
  }
}

const get = createGetter(false, false) //可读可写，深
const shallowGet = createGetter(false, true) //可读可写，浅
const readonlyGet = createGetter(true, false) //只可读，深
const shallowReadonlyGet = createGetter(true, true) //只可读，浅

const set = createSetter(false) //可读可写，深
const shallowSet = createSetter(true) //可读可写，浅

export const mutableHandlers = {
  get,
  set,
}
export const shallowReactiveHandlers = {
  get: shallowGet,
  set: shallowSet,
}
let readonlyObj = {
  set: (target, key) => {
    console.warn(`set on key ${key} failed`)
  },
}
//set都是警告，直接合并对象
export const readOnlyHandlers = extend(
  {
    get: readonlyGet,
  },
  readonlyObj
)
export const shallowReadonlyHandlers = extend(
  {
    get: shallowReadonlyGet,
  },
  readonlyObj
)
