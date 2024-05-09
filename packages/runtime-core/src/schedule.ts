let queue = []
export function queueJob(job) {
  if (!queue.includes(job)) {
    //把不同的同步任务加入数组
    queue.push(job)
    queueFlush() //执行数组的任务
  }
}

let isFlushPending = false
function queueFlush() {
  if (!isFlushPending) {
    //只执行一次上锁
    isFlushPending = true
    Promise.resolve().then(flushJob) //异步执行任务，且完毕解锁
  }
}

function flushJob() {
  isFlushPending = false

  //执行任务保证父组件优先于子组件,根据effect的id排序
  queue.sort((a, b) => a.id - b.id)

  for (let i = 0; i < queue.length; i++) {
    const job = queue[i]
    job()
  }

  queue.length = 0
}
