import { hasChanged, isArray, isObject } from '@vue/shared'
import { track, trigger } from './effect'
import { TrackOrTypes, TriggerOrTypes } from './operators'
import { reactive } from './reactive'

export function ref(value) {
  //深包装
  return createRef(value, false)
}

//ref和reactive的区别，ref用defineProperty，reactive用proxy，ref的本质就是包装成对象

export function shallowRef(value) {
  //浅包装
  return createRef(value, true)
}

function createRef(rawValue, isShallow = false) {
  //值和是否是浅的
  return new RefImpl(rawValue, isShallow) //返回一个RefImpl包装的对象
}

const convert = (val) => (isObject(val) ? reactive(val) : val)
class RefImpl {
  public _value //ts声明一个属性
  public __v_isRef = true
  constructor(public rawValue, public isShallow) {
    //public标识属性放大到了实例上

    this._value = isShallow ? rawValue : convert(rawValue) //把值放到_value上，方便get，set统一操作
  }

  // get和set本质上就是defineProperty
  //value其实就相当于对象的key
  get value() {
    track(this, TrackOrTypes.GET, 'value') //依赖收集
    return this._value
  }
  set value(newValue) {
    if (hasChanged(newValue, this.rawValue)) {
      //判断新老值是否变化
      this.rawValue = newValue
      this._value = this.isShallow ? this.rawValue : convert(this.rawValue)
      trigger(this, TriggerOrTypes.SET, 'value', newValue) //更新依赖内容
    }
  }
}

class ObjectRefImpl {
  public __v_isRef = true
  constructor(public target, public key) {}
  get value() {
    return this.target[this.key]
  }
  set value(newValue) {
    this.target[this.key] = newValue
  }
}
//把对象的key转换成ref类型
export function toRef(target, key) {
  return new ObjectRefImpl(target, key)
}

// 一次性把多个key转换成ref
export function toRefs(object) {
  const ret = isArray(object) ? new Array(object.length) : {}
  for (let key in object) {
    ret[key] = toRef(object, key)
  }
  return ret
}
