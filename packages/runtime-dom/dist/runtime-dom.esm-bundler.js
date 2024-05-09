const isObject = (value) => typeof value == 'object' && value !== null; //判断是否是对象
const extend = Object.assign; //对象合并
const isArray = Array.isArray;
const isFunction = (value) => typeof value == 'function';
const isString = (value) => typeof value == 'string';
const isIntegerKey = (key) => parseInt(key) + '' === key; //判断是不是数字
let hasOwnProperty = Object.prototype.hasOwnProperty;
const hasOwn = (target, key) => hasOwnProperty.call(target, key); //判断key是不是target属性
const hasChanged = (oldValue, value) => oldValue !== value;

//元素操作
const nodeOps = {
    //新增元素
    createElement: (tarNanme) => document.createElement(tarNanme),
    //删除元素
    remove: (child) => {
        if (child) {
            const parent = child.parentNode;
            if (parent) {
                parent.removeChild(child);
            }
        }
    },
    //插入元素
    insert: (child, parent, anchor = null) => {
        parent.insertBefore(child, anchor); //插入到parent内的anchor之前，anchor为空则等于appendChild
    },
    //获取元素
    querySelector: (selector) => document.querySelector(selector),
    //设置元素内容
    setElementText: (el, text) => (el.textContent = text),
    //创建文本
    createText: (text) => document.createTextNode(text),
    //设置文本内容
    setText: (node, text) => (node.nodeValue = text),
    //获取元素的下一个节点
    nextSibling: (node) => node.nextSibling,
};

//属性
const patchAttr = (el, key, nextValue) => {
    if (nextValue == null) {
        el.removeAttribute(key);
    }
    else {
        el.setAttribute(key, nextValue);
    }
};

// 类
const patchClass = (el, nextValue) => {
    if (nextValue == null) {
        nextValue = '';
    }
    el.calassName = nextValue;
};

// 事件
//元素,事件名,触发事件的回调函数
const patchEvents = (el, key, nextValue) => {
    const invokers = el._vei || (el._vei = {}); //在元素上创建一个事件列表
    const exists = invokers[key]; //看看要绑定的事件存不存在
    if (nextValue && exists) { //如果我要绑定事件,且缓存表里有,那么就直接覆盖
        exists.value = nextValue;
    }
    else { //如果我不绑定事件,或者绑定的事件没有绑定过
        const eventName = key.slice(2).toLowerCase();
        //如果我想绑定事件,但是事件没绑定过
        if (nextValue) {
            // 添加事件
            let invoker = (invokers[key] = createInvoker(nextValue));
            el.addEventListener(eventName, invoker);
        }
        else {
            //删除事件
            el.removeEventListener(eventName, exists);
            invokers[eventName] = undefined;
        }
    }
};
function createInvoker(value) {
    const invoker = (e) => {
        invoker.value(e);
    };
    invoker.value = value;
    return invoker;
}

//样式
const patchStyle = (el, prevValue, nextValue) => {
    const style = el.style;
    if (nextValue == null) {
        el.removeAttribute('style');
    }
    else {
        // 查看新的有没有老的
        if (prevValue) {
            for (let key in prevValue) {
                if (nextValue[key] == null) { //老的有新的没有,删除
                    style[key] = '';
                }
            }
        }
        //新的赋值到老的
        for (let key in nextValue) {
            style[key] = nextValue[key];
        }
    }
};

//一系列属性操作
const patchProp = (el, key, prevValue, nextValue) => {
    switch (key) {
        case 'class':
            patchClass(el, nextValue);
            break;
        case 'style':
            patchStyle(el, prevValue, nextValue);
            break;
        default:
            if (/^on[^a-z]/.test(key)) { //以on开头,下一个大写就是事件
                patchEvents(el, key, nextValue);
            }
            else {
                patchAttr(el, key, nextValue);
            }
            break;
    }
};

//创建虚拟节点
function isVnode(vnode) {
    return vnode.___v_idVnode;
}
const createVnode = (type, props, children = null) => {
    // 根据type判断是元素还是组件,字符串是元素，对象是组件
    const shapeFlag = isString(type)
        ? 1 /* ShapeFlags.ELEMENT */
        : isObject(type)
            ? 4 /* ShapeFlags.STATEFUL_COMPONENT */
            : 0;
    // 虚拟节点
    const vnode = {
        ___v_idVnode: true, //是否是vnode节点
        type,
        props,
        children,
        component: null, //组件的实例
        el: null, //对应的真实节点
        key: props && props.key, //diff算法用的key
        shapeFlag,
    };
    //判断儿子类型，如果有多个节点，那就是数组，
    normalizeChildren(vnode, children);
    return vnode;
};
function normalizeChildren(vnode, children) {
    let type = 0;
    if (children == null) ;
    else if (isArray(children)) {
        type = 16 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    else {
        type = 8 /* ShapeFlags.TEXT_CHILDREN */;
    }
    //根据孩子类型，改变shapFlag，|的作用就是说明他既是某个类型又是某个类型，这是根据位运算的特性得出的结论算法
    vnode.shapeFlag = vnode.shapeFlag | type;
}
const Text = Symbol('TEXT');
function normalizeVnode(child) {
    if (isObject(child)) {
        return child;
    }
    return createVnode(Text, null, String(child));
}

function createAppAPI(render) {
    return function createApp(rootComponent, rootProps) {
        //渲染哪个组件哪个属性
        const app = {
            __prop: rootProps,
            __component: rootComponent,
            __container: null,
            mount(container) {
                // 创建虚拟节点
                let vnode = createVnode(rootComponent, rootProps);
                render(vnode, container);
            },
        };
        return app;
    };
}

const PublicInstanceProxyJandlers = {
    get({ _: instance }, key) {
        //取值的时候就可以访问setUpState，props，data里的内容了
        const { setupState, props, data } = instance;
        if ((key[0] == '$')) {
            return '';
        }
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        else if (hasOwn(data, key)) {
            return data[key];
        }
        else {
            return undefined;
        }
    },
    set({ _: instance }, key, value) {
        const { setupState, props, data } = instance;
        if (hasOwn(setupState, key)) {
            setupState[key] = value;
        }
        else if (hasOwn(props, key)) {
            props[key] = value;
        }
        else if (hasOwn(data, key)) {
            data[key] = value;
        }
        return true;
    },
};

//关于组件的方法
function createComponentInstance(vnode) {
    //创建组件实例
    const instance = {
        vnode,
        type: vnode.type,
        props: { a: 1 },
        attrs: {},
        slots: {},
        data: { b: 2 },
        ctx: {},
        setupState: { c: 3 }, //setup返回一个对象，这个对象会作为setUpState
        isMounted: false, //是否挂载过
    };
    instance.ctx = { _: instance };
    return instance;
}
function setupComponent(instance) {
    //解析实例
    const { props, children } = instance.vnode;
    instance.props = props;
    instance.children = children;
    // 根据位运算，看当前组件类型
    let isStateFul = instance.vnode.shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */;
    if (isStateFul) {
        //如果是带状态组件
        //调用当前实例的setup方法填充setupState和render
        setupStatefulComponent(instance);
    }
}
function setupStatefulComponent(instance) {
    // 1.代理 传递给render函数的参数
    instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyJandlers);
    // 2.获取组件类型，拿到组件setup方法
    let Component = instance.type;
    let { setup } = Component;
    if (setup) {
        createSetupContext(instance);
        const setupResult = setup(instance.props, setupComponent); //执行setup，并且传递参数
        handlerSetupResult(instance, setupResult);
    }
    else {
        finishComponentSetup(instance); //完成组件的启动
    }
}
function handlerSetupResult(instance, setupResult) {
    // 根据setup返回结果，把结果放到不同的地方
    if (isFunction(setupResult)) {
        instance.render = setupResult;
    }
    else if (isObject(setupResult)) {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    let Component = instance.type;
    if (!instance.render) {
        //对template模板进行编译，产生render函数
        if (!Component.render && Component.template) ;
        instance.render = Component.render;
    }
}
//创建上下文
function createSetupContext(instance) {
    return {
        attrs: instance.attrs,
        slots: instance.slots,
        emit: () => { },
        expose: () => { },
    };
}

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
            effect.options.scheduler(effect);
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

let queue = [];
function queueJob(job) {
    if (!queue.includes(job)) {
        //把不同的同步任务加入数组
        queue.push(job);
        queueFlush(); //执行数组的任务
    }
}
let isFlushPending = false;
function queueFlush() {
    if (!isFlushPending) {
        //只执行一次上锁
        isFlushPending = true;
        Promise.resolve().then(flushJob); //异步执行任务，且完毕解锁
    }
}
function flushJob() {
    isFlushPending = false;
    //执行任务保证父组件优先于子组件,根据effect的id排序
    queue.sort((a, b) => a.id - b.id);
    for (let i = 0; i < queue.length; i++) {
        const job = queue[i];
        job();
    }
    queue.length = 0;
}

function getSequence(arr) {
    const len = arr.length;
    const result = [0];
    const p = arr.slice(0);
    for (let i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            let resultLastIndex = result[result.length - 1];
            if (arr[resultLastIndex] < arrI) {
                p[i] = resultLastIndex;
                result.push(i);
                continue;
            }
            let start = 0;
            let end = result.length - 1;
            while (start < end) {
                let middle = ((start + end) / 2) | 0;
                if (arr[result[middle]] < arrI) {
                    start = middle + 1;
                }
                else {
                    end = middle;
                }
            }
            if (arrI < arr[result[start]]) {
                if (start > 0) {
                    p[i] = result[start - 1];
                }
                result[start] = i;
            }
        }
    }
    let length = result.length;
    let last = result[length - 1];
    while (length-- > 0) {
        result[length] = last;
        last = p[last];
    }
    return result;
}

function createRenderer(renderOptions) {
    const { insert: hostInsert, remove: hostRemove, patchProp: hostPatchProp, createElement: hostCreateElement, createText: hostCreateText, createComment: hostCreateComment, setText: hostSetText, setElementText: hostSetElementText, nextSibling: hostNextSibling, } = renderOptions;
    const setupRenderEffect = (instance, container) => {
        //创建effect方法，在effect运行render，这样更新的时候就会执行
        instance.update = effect(function componentEffect() {
            //每个组件都有自己的effect，对应组件数据变化重新执行对应组件effect
            if (!instance.isMounted) {
                //是否被挂载过，没有则是初渲染
                //初渲染
                let proxyToUse = instance.proxy;
                let subTree = (instance.subTree = instance.render(proxyToUse));
                patch(null, subTree, container);
                instance.isMounted = true;
            }
            else {
                // 更新渲染
                const prevtree = instance.subTree;
                let proxyToUse = instance.proxy;
                const nextTree = instance.render(proxyToUse);
                patch(prevtree, nextTree, container);
            }
        }, {
            scheduler: queueJob,
        });
    };
    const mountComponent = (initialVNode, container) => {
        //组件渲染流程 最核心就是调用setup拿到返回值，获取render函数进行渲染
        // 1.先有实例
        const instance = (initialVNode.component =
            createComponentInstance(initialVNode));
        // 2.需要的数据解析到实例
        setupComponent(instance);
        // 3.创建一个effect让render运行
        setupRenderEffect(instance, container);
    };
    const processComponent = (n1, n2, container) => {
        if (n1 == null) {
            //组件没有上一次虚拟节点,即第一次渲染
            mountComponent(n2, container);
        }
    };
    function mountChildren(children, container) {
        for (let i = 0; i < children.length; i++) {
            // 避免覆盖，把文本类型的儿子变成对象
            let child = normalizeVnode(children[i]);
            patch(null, child, container);
        }
    }
    function mountElement(vnode, container, anchor) {
        //递归渲染
        const { props, shapeFlag, type, children } = vnode;
        let el = (vnode.el = hostCreateElement(type)); //创建元素
        if (props) {
            for (const key in props) {
                hostPatchProp(el, key, null, props[key]); //创建属性
            }
        }
        //如果儿子是文本
        if (shapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
            hostSetElementText(el, children);
        }
        //如果儿子是数组
        if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(children, el);
        }
        hostInsert(el, container, anchor);
    }
    function patchProps(oldProps, newProps, el) {
        if (oldProps !== newProps) {
            for (let key in newProps) {
                const prev = oldProps[key];
                const next = newProps[key];
                if (prev !== next) {
                    hostPatchProp(el, key, prev, next);
                }
            }
            for (const key in newProps) {
                if (!(key in newProps)) {
                    hostPatchProp(el, key, oldProps[key], null);
                }
            }
        }
    }
    function unmountChildren(children, el = null) {
        for (let i = 0; i < children.length; i++) {
            unmount(children[i]);
        }
    }
    function patchKeyedChildren(c1, c2, el) {
        let i = 0; //默认从头开始比
        let e1 = c1.length - 1;
        let e2 = c2.length - 1;
        // 尽可能减少比对的区域
        //循环匹配，从头匹配到不同的就停止
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSameVnodeType(n1, n2)) {
                patch(n1, n2, el);
            }
            else {
                break;
            }
            i++;
        }
        //循环匹配，从尾匹配到不同的就停止
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSameVnodeType(n1, n2)) {
                patch(n1, n2, el);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        //根据i,e1,e2的大小关系推断出新老儿子不同的数量关系
        if (i > e1) {
            //老的少新的多
            if (i <= e2) {
                while (i <= e2) {
                    // 根据e2找到添加节点的参照位置
                    const nextPos = e2 + 1;
                    const anchor = nextPos < c2.length ? c2[nextPos].el : null; //null就是往后直接加
                    //需要添加
                    patch(null, c2[i], el, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) {
            //老的多新的少
            while (i <= e1) {
                unmount(c1[i]);
                i++;
            }
        }
        else {
            //乱序比对，尽可能复用
            let s1 = i;
            let s2 = i;
            //创建一个映射表
            const keyToNewIndexMap = new Map();
            for (let i = s2; i <= e2; i++) {
                //把新的节点放到映射表
                const childVnode = c2[i];
                keyToNewIndexMap.set(childVnode.key, i);
            }
            // 将新的节点的下标在老的节点下标哪个位置映射出来
            const toBePatched = e2 - s2 + 1;
            const newIndexToOldIndexMap = new Array(toBePatched).fill(0);
            //去老的里面找，看有没有可以复用的
            for (let i = s1; i <= e1; i++) {
                const oldVnode = c1[i];
                let newIndex = keyToNewIndexMap.get(oldVnode.key);
                if (newIndex === undefined) {
                    //老的不在新的里面,卸载
                    unmount(oldVnode);
                }
                else {
                    //新老比对
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    patch(oldVnode, c2[newIndex], el);
                }
            }
            let increasingNewIndexSequence = getSequence(newIndexToOldIndexMap); //最长公共子序列算法
            let j = increasingNewIndexSequence.length - 1;
            console.log(increasingNewIndexSequence);
            for (let i = toBePatched - 1; i >= 0; i--) {
                let currentIndex = i + s2;
                let child = c2[currentIndex];
                const anchor = currentIndex + 1 < c2.length < c2.length
                    ? c2[currentIndex + 1].el
                    : null;
                if (newIndexToOldIndexMap[i] == 0) {
                    patch(null, child, el, anchor);
                }
                else {
                    if (i != increasingNewIndexSequence[j]) {
                        hostInsert(child.el, el, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    function patchChild(n1, n2, el) {
        const c1 = n1.children;
        const c2 = n2.children;
        const prevShapeFlag = n1.shapeFlag;
        const shapeFlag = n2.shapeFlag;
        // 分别识别儿子的状况
        if (shapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
            //老的有n个孩子，新的是文本
            if (prevShapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
                unmountChildren(c1, el);
            }
            //两个人都是文本
            if (c2 !== c1) {
                hostSetElementText(el, c2);
            }
        }
        else {
            // 新是数组，上一次是文本或者数组
            if (prevShapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
                // 上一次是数组，这一次是数组
                if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
                    patchKeyedChildren(c1, c2, el);
                }
                else {
                    //没有孩子
                    hostSetElementText(el, '');
                }
            }
            else {
                //上一次是文本或者空
                if (prevShapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
                    hostSetElementText(el, '');
                }
                //这一次是数组
                if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
                    mountChildren(c2, el);
                }
            }
        }
    }
    function patchElement(n1, n2, container) {
        let el = (n2.el = n1.el);
        const oldProps = n1.props || {};
        const newProps = n2.props || {};
        //比属性
        patchProps(oldProps, newProps, el);
        //比儿子
        patchChild(n1, n2, el);
    }
    function processElement(n1, n2, container, anchor) {
        if (n1 == null) {
            mountElement(n2, container, anchor);
        }
        else {
            patchElement(n1, n2);
        }
    }
    const processText = (n1, n2, container) => {
        if (n1 == null) {
            hostInsert((n2.el = hostCreateText(n2.children)), container);
        }
    };
    //看看n1和n2是不是同类元素
    function isSameVnodeType(n1, n2) {
        return n1.type === n2.type && n1.key === n2.key;
    }
    //删除元素
    function unmount(n1) {
        hostRemove(n1.el);
    }
    const patch = (n1, n2, container, anchor = null) => {
        //针对不同类型做初始化
        const { shapeFlag, type } = n2;
        //如果n1，n2是不一样类型的，可以不用比较直接替换
        if (n1 && !isSameVnodeType(n1, n2)) {
            anchor = hostNextSibling(n1.el); //获取n1的下一个元素，让n2插入的时候有参照位置
            unmount(n1);
            n1 = null; //这里n1是null，那么后面直接重新挂载n2
        }
        switch (type) {
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    //如果是元素
                    processElement(n1, n2, container, anchor);
                }
                else if (shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    //如果是组件
                    processComponent(n1, n2, container);
                }
                break;
        }
    };
    const render = (vnode, container) => {
        //核心，根据不同的虚拟节点，创建对应的真实元素
        patch(null, vnode, container);
    };
    //怎么渲染
    return {
        createApp: createAppAPI(render),
    };
}

function h(type, propsOrChilden, children) {
    const l = arguments.length;
    if (l == 2) {
        //类型+属性 或者 类型+孩子
        if (isObject(propsOrChilden) && !isArray(propsOrChilden)) {
            if (isVnode(propsOrChilden)) {
                // 判断propsOrChilden是不是虚拟节点，因为虚拟节点也是一个对象
                return createVnode(type, null, [propsOrChilden]);
            }
            else {
                // propsOrChilden是属性
                return createVnode(type, propsOrChilden);
            }
        }
        else {
            //如果propsOrChilden参数不是对象，那一定是孩子
            return createVnode(type, null, propsOrChilden);
        }
    }
    else {
        if (l > 3) {
            // 孩子一个个写，没有写成数组，变成数组
            children = Array.prototype.slice.call(arguments, 2);
        }
        else if (l === 3 && isVnode(children)) {
            children = [children];
        }
        return createVnode(type, propsOrChilden, children);
    }
}

const renderOptions = extend({ patchProp }, nodeOps);
function createApp(rootComponent, rootProps = null) {
    //createRenderer(怎么渲染)是高阶函数,创建一个渲染器,返回createApp(渲染什么属性什么组件),createApp返回mount(挂载目的地)
    const app = createRenderer(renderOptions).createApp(rootComponent, rootProps);
    let { mount } = app;
    app.mount = function (container) {
        //清空容器
        container = document.querySelector(container);
        container.innerHTML = '';
        mount(container);
        // 渲染,挂载
    };
    return app;
}

export { computed, createApp, createRenderer, effect, h, reactive, readonly, ref, renderOptions, shallowReactive, shallowReadonly, shallowRef, toRef, toRefs };
//# sourceMappingURL=runtime-dom.esm-bundler.js.map
