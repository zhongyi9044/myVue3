
export const isObject = (value) => typeof value == 'object' && value !== null //判断是否是对象

export const extend = Object.assign //对象合并

export const isArray = Array.isArray
export const isFunction = (value) => typeof value == 'function'
export const isNumber = (value) => typeof value == 'number'
export const isString = (value) => typeof value == 'string'

export const isIntegerKey = (key) => parseInt(key) + '' === key //判断是不是数字

let hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (target, key) => hasOwnProperty.call(target, key) //判断key是不是target属性

export const hasChanged = (oldValue, value) => oldValue !== value

export { ShapeFlags } from "./shapeFlag"
