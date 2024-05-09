//一系列属性操作

import { patchAttr } from './modules/attribute'
import { patchClass } from './modules/class'
import { patchEvents } from './modules/event.s'
import { patchStyle } from './modules/style'

export const patchProp = (el, key, prevValue, nextValue) => {
  switch (key) {
    case 'class':
      patchClass(el, nextValue)
      break
    case 'style':
      patchStyle(el, prevValue, nextValue)
      break
    default:
      if (/^on[^a-z]/.test(key)) {//以on开头,下一个大写就是事件
        patchEvents(el,key,nextValue)
      } else {
        patchAttr(el, key, nextValue)
      }
      break
  }
}
