'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const isObject = (value) => typeof value == 'object' && value !== null; //判断是否是对象
const extend = Object.assign; //对象合并
const isArray = Array.isArray;
const isFunction = (value) => typeof value == 'function';
const isIntegerKey = (key) => parseInt(key) + '' === key; //判断是不是数字
let hasOwnProperty = Object.prototype.hasOwnProperty;
const hasOwn = (target, key) => hasOwnProperty.call(target, key); //判断key是不是target属性
const hasChanged = (oldValue, value) => oldValue !== value;

function effect(fn, options = {}) {
    //effect变成响应式的，数据变化重新执行
    const effect = createReactiveEffect(fn, options);
    if (!options.lazy) {
        effect(); //默认会自动执行一次
    }
    return effect; //有点类似vue2的watcher
}
let uid = 0; //每个effect都有一个id
let activeEffect; //存储当前effect，像是vue2全局存储的watcher一样
const effectStack = []; //熟悉的watcher栈，先入后出，先执行最后一个
function createReactiveEffect(fn, options) {
    const effect = function reactiveEffect() {
        if (!effectStack.includes(effect)) {
            //先看看栈里有没有一样的，有过就不执行了(防止 变量++ 这样的情况等)
            try {
                effectStack.push(effect); //通过全局栈，拿到effect本身存入栈
                activeEffect = effect; //通过全局变量，拿到effect本身，在track就能用effect了
                return fn();
            }
            finally {
                effectStack.pop(); //执行完抛出栈
                activeEffect = effectStack[effectStack.length - 1]; //重新指向最外一个
            }
        }
    };
    effect.id = uid++; //effect的id
    effect._isEffect = true; //标识是响应式effect
    effect.raw = fn; //保留对应的原函数
    effect.options = options; //保存用户选项
    return effect;
}
//track类似vue2的dep
const targetMap = new WeakMap();
function track(target, type, key) {
    if (activeEffect === undefined) {
        return;
    }
    // 往当前weaWap查找有没有相同的键值对
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        //没有相同的，设立一个键，并且值是一个map
        targetMap.set(target, (depsMap = new Map()));
    }
    let dep = depsMap.get(key);
    if (!dep) {
        //往刚刚从weakmap取出的map查找有没有相同的键值对
        depsMap.set(key, (dep = new Set())); //没有相同的，设立一个键，并且值是一个set
    }
    //如果map里找到的set里没有当前effect，那就加入
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect);
    }
}
function trigger(target, type, key, newValue, oldValue) {
    //没收集过，直接返回
    const depsMap = targetMap.get(target);
    if (!depsMap)
        return;
    //把所有要执行的effect放到集合，最后一起执行
    const effects = new Set();
    const add = (effectToAdd) => {
        if (effectToAdd) {
            effectToAdd.forEach((effect) => effects.add(effect));
        }
    };
    //对修改数组的length属性特殊处理
    if (key === 'length' && isArray(target)) {
        depsMap.forEach((dep, key) => {
            debugger;
            console.log(depsMap, dep, key);
            if (key === 'length' || key > newValue) {
                //如果依赖收集过的值是‘length’或者[2]这样的，且修改的length小于了收集过的索引
                add(dep); //加到集合
            }
        });
    }
    else {
        if (key !== undefined) {
            //修改
            add(depsMap.get(key));
        }
        switch (type) {
            case 0 /* TriggerOrTypes.ADD */:
                if (Array.isArray(target) && isIntegerKey(key)) {
                    //如果是通过下标索引添加，注意只能是添加，那就通过length触发
                    add(depsMap.get('length'));
                }
        }
    }
    effects.forEach((effect) => {
        if (effect.options.scheduler) {
            effect.options.scheduler();
        }
        else {
            effect();
        }
    });
}

//实现new Proxy(target,baseHandler)的各handler
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
        const res = Reflect.get(target, key, receiver);
        if (!isReadonly) {
            //不是只读的，进行依赖收集
            //传递三个参数，第二个表示操作的类型
            track(target, 0 /* TrackOrTypes.GET */, key);
        }
        if (isShallow) {
            //是浅的
            return res;
        }
        // ！！！！！！！vue3比vue2性能好就是vue3用懒代理，取到了再递归代理，没取到不理
        if (isObject(res)) {
            //如果是对象，还得进去循环一下
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter(isShallow = false) {
    //根据是不是只可读和是不是浅的造出不同的用于代理的set方法
    return function set(target, key, value, receiver) {
        const oldValue = target[key]; //获取老值
        let hadKey = isArray(target) && isIntegerKey(key)
            ? Number(key) < target.length
            : hasOwn(target, key); //看看是不是数组，并且通过索引修改,如果是那就比比长度和下标，看看是新增还是修改，如果不是数组那就是对象，看看有没有这个属性。这段代码判断是不是更新
        const result = Reflect.set(target, key, value, receiver);
        if (!hadKey) { //新增
            trigger(target, 0 /* TriggerOrTypes.ADD */, key, value);
        }
        else if (hasChanged(oldValue, value)) { //修改
            trigger(target, 1 /* TriggerOrTypes.SET */, key, value);
        }
        return result;
    };
}
const get = createGetter(false, false); //可读可写，深
const shallowGet = createGetter(false, true); //可读可写，浅
const readonlyGet = createGetter(true, false); //只可读，深
const shallowReadonlyGet = createGetter(true, true); //只可读，浅
const set = createSetter(false); //可读可写，深
const shallowSet = createSetter(true); //可读可写，浅
const mutableHandlers = {
    get,
    set,
};
const shallowReactiveHandlers = {
    get: shallowGet,
    set: shallowSet,
};
let readonlyObj = {
    set: (target, key) => {
        console.warn(`set on key ${key} failed`);
    },
};
//set都是警告，直接合并对象
const readOnlyHandlers = extend({
    get: readonlyGet,
}, readonlyObj);
const shallowReadonlyHandlers = extend({
    get: shallowReadonlyGet,
}, readonlyObj);

function reactive(target) {
    //可读可写，深度响应式
    return createReactiveObject(target, false, mutableHandlers);
}
function shallowReactive(target) {
    //可读可写，浅度响应式
    return createReactiveObject(target, false, shallowReactiveHandlers);
}
function readonly(target) {
    //仅可读，深度响应式
    return createReactiveObject(target, true, readOnlyHandlers);
}
function shallowReadonly(target) {
    //仅可读，浅度响应式
    return createReactiveObject(target, true, shallowReadonlyHandlers);
}
/*
  如果一个对象只被WeakMap引用就会垃圾回收，不会造成内存泄，且键能是对象
*/
const reactiveMap = new WeakMap(); //存放可读写的的数据
const readonlyMap = new WeakMap(); //存放只可读的数据
// 函数柯里化，不同要求，不同参数，不同处理
function createReactiveObject(target, isReadonly, baseHandlers) {
    //reactive只能拦截对象
    if (!isObject(target)) {
        return target;
    }
    //根据参数判断需要用到哪个Map
    const proxyMap = isReadonly ? readonlyMap : reactiveMap;
    //判断一下当前需要代理的数据有没有被代理过
    const exisitProxy = proxyMap.get(target);
    //代理过直接返回
    if (exisitProxy) {
        return exisitProxy;
    }
    //响应式代理核心 如果被代理过就不要再代理
    const proxy = new Proxy(target, baseHandlers);
    //放入对应Map
    proxyMap.set(target, proxy);
    return proxy;
}

function ref(value) {
    //深包装
    return createRef(value, false);
}
//ref和reactive的区别，ref用defineProperty，reactive用proxy，ref的本质就是包装成对象
function shallowRef(value) {
    //浅包装
    return createRef(value, true);
}
function createRef(rawValue, isShallow = false) {
    //值和是否是浅的
    return new RefImpl(rawValue, isShallow); //返回一个RefImpl包装的对象
}
const convert = (val) => (isObject(val) ? reactive(val) : val);
class RefImpl {
    rawValue;
    isShallow;
    _value; //ts声明一个属性
    __v_isRef = true;
    constructor(rawValue, isShallow) {
        //public标识属性放大到了实例上
        this.rawValue = rawValue;
        this.isShallow = isShallow;
        this._value = isShallow ? rawValue : convert(rawValue); //把值放到_value上，方便get，set统一操作
    }
    // get和set本质上就是defineProperty
    //value其实就相当于对象的key
    get value() {
        track(this, 0 /* TrackOrTypes.GET */, 'value'); //依赖收集
        return this._value;
    }
    set value(newValue) {
        if (hasChanged(newValue, this.rawValue)) {
            //判断新老值是否变化
            this.rawValue = newValue;
            this._value = this.isShallow ? this.rawValue : convert(this.rawValue);
            trigger(this, 1 /* TriggerOrTypes.SET */, 'value', newValue); //更新依赖内容
        }
    }
}
class ObjectRefImpl {
    target;
    key;
    __v_isRef = true;
    constructor(target, key) {
        this.target = target;
        this.key = key;
    }
    get value() {
        return this.target[this.key];
    }
    set value(newValue) {
        this.target[this.key] = newValue;
    }
}
//把对象的key转换成ref类型
function toRef(target, key) {
    return new ObjectRefImpl(target, key);
}
// 一次性把多个key转换成ref
function toRefs(object) {
    const ret = isArray(object) ? new Array(object.length) : {};
    for (let key in object) {
        ret[key] = toRef(object, key);
    }
    return ret;
}

//计算属性其实相当于是一个effect，getter的内容更新了，effect就要在调用的时候重新执行
// effect(()=>{
//   console.log(myage)
// })
// 二者极度地相似，只不过myAge不需要立即执行，且只有再次取值才重新更新计算属性的值
// myAge=computed((){
//   return myage  
// })
class ComputedRefImpl {
    setter;
    _dirty = true; //默认取值不要用缓存
    _value;
    _effect;
    constructor(getter, setter) {
        this.setter = setter;
        this._effect = effect(
        //计算属性创建一个effect，effect返回值就是getter
        getter, {
            lazy: true, //不要默认执行effect
            scheduler: () => {
                if (!this._dirty) {
                    this._dirty = true; //计算属性的值需要修改，在get的时候重新通过effect的返回值获取新值
                    trigger(this, 1 /* TriggerOrTypes.SET */, 'value'); //执行计算属性本身依赖的更新
                }
            },
        });
    }
    get value() {
        if (this._dirty) {
            this._value = this._effect(); //取值执行effect,进行依赖收集，effect执行getter以后返回的值就是计算属性的结果
            this._dirty = false; //取到一次值以后，以后计算属性取值直接给，不需要再走effect
        }
        track(this, 0 /* TrackOrTypes.GET */, 'value'); //计算属性本身被effect也要依赖收集
        // effect(()=>{
        // console.log(计算属性)
        // })
        return this._value;
    }
    set value(newValue) {
        this.setter(newValue);
    }
}
function computed(getterOrOptions) {
    // 用户传递的getterOrOptions里可以是一个有返回值作为conputed的结果的函数,或者取值修改方法getter和setter
    let getter;
    let setter;
    if (isFunction(getterOrOptions)) {
        getter = getterOrOptions;
        setter = () => { };
    }
    else {
        getter = getterOrOptions.get;
        setter = getterOrOptions.set;
    }
    return new ComputedRefImpl(getter, setter); //包装成ref模样
}

exports.computed = computed;
exports.effect = effect;
exports.reactive = reactive;
exports.readonly = readonly;
exports.ref = ref;
exports.shallowReactive = shallowReactive;
exports.shallowReadonly = shallowReadonly;
exports.shallowRef = shallowRef;
exports.toRef = toRef;
exports.toRefs = toRefs;
//# sourceMappingURL=reactivity.cjs.js.map
