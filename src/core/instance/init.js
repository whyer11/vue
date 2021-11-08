/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  /**
   * 定义构造函数中调用的this._init函数
   * 这类型定义的有点东西,Object....
   * @param options
   * @private
   */
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    /**
     * 设置一个uid,这里uid就运行时 +1,有点东西,在特定作用域下确实不会重复
     * @type {number}
     * @private
     */
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    vm._isVue = true
    // merge options
    /**
     *
     */
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    /**
     * 这里在开发环境中是加了一层代理,用于增加开发体验,在取实例上变量的时候如果没有的话就进行提示.
     */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      /**
       * 线上的时候就直接使用自己,不存在中间的proxy了.
       * @type {Component}
       * @private
       */
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    /**
     * 开到这里,其实vue的设计思路和 react差别还是很大的.但是用法却想办法靠在一块
     * SFC的写法让我有点难以接受,并且还必须是 default导出,太恶心了
     * 反过来想 SFC这种方式是不是另外一种高内聚的体现呢? React的方式,现在搞出了styled-component这种方式来把样式集成.
     * SFC则是通过编译的方式解决这个问题,如果可以提高开发者体验,我觉得也不是不行.
     */
    /**
     * 初始化生命周期,其实就是把一些变量注册到vm这个实例上
     */
    initLifecycle(vm)
    /**
     * 初始化事件,也没做啥,就初始化个_events变量, 还用了Object.create(null),为啥? 这么搞出来的对象就是纯对象,不继承Object的任何原型方法
     * 连 toString都没有.具体要这么干净的{}用来干啥我也不知道
     */
    initEvents(vm)
    /**
     * 初始化render,我的理解好像犯了个错, SFC下到最终运行还是要编译的,具体编译成啥?
     * 其实还是变成options.render的内容. 蜜汁高内聚
     */
    initRender(vm)
    callHook(vm, 'beforeCreate')
    /**
     * 这里的injection就相当于react的context,意图是要搞一个可以消费指定字段的生产者和消费者,可以贯穿整个树,省得一级级的传递了
     * 当然 vuex 也提供了差不多的能力, 看到这里 vue 做的还是很多,开发者不一定看源码也能把需求完成
     *
     * 这里就是把需要inject的数据全部准备好,这里插个眼 TODO 初始的时候拿到了这些inject,未来provide变化的时候咋整?
     */
    initInjections(vm) // resolve injections before data/props
    
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
