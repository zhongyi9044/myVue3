//样式

export const patchStyle = (el, prevValue, nextValue) => {
  const style = el.style
  if (nextValue == null) {
    el.removeAttribute('style')
  } else {
    // 查看新的有没有老的
    if (prevValue) {
      for (let key in prevValue) {
        if (nextValue[key] == null) {//老的有新的没有,删除
          style[key] = ''
        }
      }
    }

    //新的赋值到老的
    for (let key in nextValue) {
      style[key] = nextValue[key]
    }
  }
}
