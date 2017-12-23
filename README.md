# MePullRefresh
高性能下拉刷新和无限滚动，丰富的hook，自定义无限可能。

# 使用
html结构要有2层
```
<div class="wrapper">
  <ul>
    ....
  </ul>  
</div>
```
```
new MePullRefresh({
  ...
})
```

# 参数说明
### el  
滚动元素的父级，如上wrapper
 
### classNames
下拉刷新松手后的恢复动画是基于此样式
如：
```
.transitioning {
    -webkit-transition-duration: 300ms;
    transition-duration: 300ms;
    -webkit-transition-property: -webkit-transform;
    transition-property: -webkit-transform;
    transition-property: transform;
    transition-property: transform, -webkit-transform;
}
```
其中transition-property只能写transform，因为后面会用transitionEnd事件监听整个下拉动画结束
  
### usePtr
是否使用下拉刷新，默认false

### ptrDistance
下拉的有效距离

### ptrTime
数据加载完成后延迟时间，默认1s，防止数据加载过快，导致动画一闪而过
  
### useInfinite
是否使用无限滚动，默认false
  
### infiniteDistance
滚动到距离底部的距离

# 实例方法

### ptrStartFn
下拉开始的回调，触发一次

### ptrMoveFn
下拉移动过程中的回调

### ptrWillRefreshFn
下拉距离到达 `ptrDistance` 时触发一次

### ptrRefreshFn
下拉距离大于等于 `ptrDistance`，松手时触发一次

### ptrEndFn
整体下拉动画结束触发一次

### ptrDone
重置下拉刷新，用于数据请求成功后调用
  
### infiniteStartFn
滚动距离到达scrollHeight - `infiniteDistance`触发一次

### infiniteMoveFn
滚动距离介于scrollHeight - `infiniteDistance` 和 bottom

### infiniteEndFn
滚动到最底部，触发一次

### infiniteDone
重置无限滚动，请求数据成功后调用

 
