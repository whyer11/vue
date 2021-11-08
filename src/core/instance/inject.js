/* @flow */

import { hasOwn } from 'shared/util'
import { warn, hasSymbol } from '../util/index'
import { defineReactive, toggleObserving } from '../observer/index'

export function initProvide (vm: Component) {
  const provide = vm.$options.provide
  if (provide) {
    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide
  }
}

export function initInjections (vm: Component) {
  const result = resolveInject(vm.$options.inject, vm)
  if (result) {
    toggleObserving(false)
    Object.keys(result).forEach(key => {
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
            `overwritten whenever the provided component re-renders. ` +
            `injection being mutated: "${key}"`,
            vm
          )
        })
      } else {
        defineReactive(vm, key, result[key])
      }
    })
    toggleObserving(true)
  }
}

export function resolveInject (inject: any, vm: Component): ?Object {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    const result = Object.create(null)
    /**
     * 这里应该是为了支持以Symbol为key的情况
     * let a = Symbol('a');
     * let b = {
     *   [a]:'1'
     * }
     * Object.keys(b) => []
     * Reflect.ownKeys(b) => [Symbol('a')]
     * 是不是很神奇?
     * 两者的区别 参见 https://262.ecma-international.org/12.0/#sec-object.keys  vs https://262.ecma-international.org/12.0/#sec-reflect.ownkeys
     *
     *
     * @type {Array<*>|Array<string>}
     */
    const keys = hasSymbol
      ? Reflect.ownKeys(inject)
      : Object.keys(inject)

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // #6574 in case the inject object is observed...
      if (key === '__ob__') continue
      /**
       * 这个from 是 开发者手动传的,用于alias一下,一般情况下要求是同名才能inject,  但是吧这里也没有指定没有from的情况怎么办啊
       */
      const provideKey = inject[key].from
      let source = vm
      /**
       * 从自己开始,找每一个父元素的provide上的内容,找到了就添加到result里面去
       */
      while (source) {
        if (source._provided && hasOwn(source._provided, provideKey)) {
          result[key] = source._provided[provideKey]
          break
        }
        source = source.$parent
      }
      if (!source) {
        if ('default' in inject[key]) {
          const provideDefault = inject[key].default
          result[key] = typeof provideDefault === 'function'
            ? provideDefault.call(vm)
            : provideDefault
        } else if (process.env.NODE_ENV !== 'production') {
          warn(`Injection "${key}" not found`, vm)
        }
      }
    }
    return result
  }
}
