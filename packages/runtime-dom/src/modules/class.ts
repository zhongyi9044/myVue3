// 类

export const patchClass = (el, nextValue) => {
  if (nextValue == null) {
    nextValue = ''
  }
  el.calassName = nextValue
}
