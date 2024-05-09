import { isFunction } from '@vue/shared'
import { effect, track, trigger } from './effect'
import { TrackOrTypes, TriggerOrTypes } from './operators'

//计算属性其实相当于是一个effect，getter的内容更新了，effect就要在调用的时候重新执行

// effect(()=>{
//   console.log(myage)
// })

// 二者极度地相似，只不过myAge不需要立即执行，且只有再次取值才重新更新计算属性的值

// myAge=computed((){
//   return myage  
// })

class ComputedRefImpl {
  public _dirty = true //默认取值不要用缓存
  public _value
  public _effect
  constructor(getter, public setter) {
    this._effect = effect(
      //计算属性创建一个effect，effect返回值就是getter
      getter,
      {
        lazy: true, //不要默认执行effect
        scheduler: () => {
          if (!this._dirty) {
            this._dirty = true//计算属性的值需要修改，在get的时候重新通过effect的返回值获取新值
            trigger(this,TriggerOrTypes.SET,'value')//执行计算属性本身依赖的更新
          }
        },
      }
    )
  }

  get value() {
    if (this._dirty) {
      this._value = this._effect() //取值执行effect,进行依赖收集，effect执行getter以后返回的值就是计算属性的结果
      this._dirty = false//取到一次值以后，以后计算属性取值直接给，不需要再走effect
    }
    track(this,TrackOrTypes.GET,'value')//计算属性本身被effect也要依赖收集

    // effect(()=>{
      // console.log(计算属性)
    // })

    return this._value
  }

  set value(newValue) {
    this.setter(newValue)
  }
}

export function computed(getterOrOptions) {
  // 用户传递的getterOrOptions里可以是一个有返回值作为conputed的结果的函数,或者取值修改方法getter和setter
  let getter
  let setter
  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions
    setter = () => {}
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  return new ComputedRefImpl(getter, setter) //包装成ref模样
}
