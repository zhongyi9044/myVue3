export function getSequence(arr) {
  const len = arr.length
  const result = [0]
  const p = arr.slice(0)
  for (let i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      let resultLastIndex = result[result.length - 1]
      if (arr[resultLastIndex] < arrI) {
        p[i] = resultLastIndex
        result.push(i)
        continue
      }
      let start = 0
      let end = result.length - 1
      while (start < end) {
        let middle = ((start + end) / 2) | 0
        if (arr[result[middle]] < arrI) {
          start = middle + 1
        } else {
          end = middle
        }
      }
      if (arrI < arr[result[start]]) {
        if (start > 0) {
          p[i] = result[start - 1]
        }
        result[start] = i
      }
    }
  }
  let length = result.length
  let last = result[length - 1]
  while (length-- > 0) {
    result[length] = last
    last = p[last]
  }
  return result
}