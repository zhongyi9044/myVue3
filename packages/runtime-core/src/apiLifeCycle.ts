import { currentInstance, setCurrentInstance } from './component'

const enum LifeCycleHooks {
  BEFORE_MOUNT = '"bm',
  MOUNTED = 'm',
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u',
}

function injectHook(type,hook,target){
  if(!target){
    return 'error'
  }else{
    const hooks=target[type]||(target[type]=[])
    const wrap=()=>{
      setCurrentInstance(target)
      hook.call(target)
      setCurrentInstance(null)
    }
    hooks.push(wrap)
  }
}

function createHook(lifeCycle) {
  return function (hook, target = currentInstance) {
    injectHook(lifeCycle,hook,target)
  }
}

export const onBeforeMount = createHook(LifeCycleHooks.BEFORE_MOUNT)

export const onMounted = createHook(LifeCycleHooks.MOUNTED)

export const onBeforeUpdate = createHook(LifeCycleHooks.BEFORE_UPDATE)

export const onUpdated = createHook(LifeCycleHooks.UPDATED)
