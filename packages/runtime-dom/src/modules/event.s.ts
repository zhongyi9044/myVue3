// 事件
                          //元素,事件名,触发事件的回调函数
export const patchEvents = (el, key, nextValue) => {
  const invokers = el._vei || (el._vei = {})//在元素上创建一个事件列表
  const exists = invokers[key]//看看要绑定的事件存不存在
  if (nextValue && exists) {//如果我要绑定事件,且缓存表里有,那么就直接覆盖
    exists.value = nextValue
  } else {//如果我不绑定事件,或者绑定的事件没有绑定过

    const eventName = key.slice(2).toLowerCase()

    //如果我想绑定事件,但是事件没绑定过
    if (nextValue) {
      // 添加事件
      let invoker = (invokers[key] = createInvoker(nextValue))
      el.addEventListener(eventName, invoker)
    } else {
      //删除事件
      el.removeEventListener(eventName, exists)
      invokers[eventName] = undefined
    }
  }
}

function createInvoker(value) {
  const invoker = (e) => {
    invoker.value(e)
  }
  invoker.value = value
  return invoker
}
