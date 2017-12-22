(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], function () {
            return (root.returnExportsGlobal = factory());
        });
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root['MePullRefresh'] = factory();
    }
}(this, function () {
    function MePullRefresh(opts) {
        this.init(opts);
        this.eventBind();
    }

    MePullRefresh.prototype = {
        constructor: 'MePullRefresh',
        noop: function () {},
        init: function (opts) {
            this.$container = opts.el;
            this.$el = opts.el.children[0];
            this.classNames = opts.classNames;

            this.usePtr = opts.usePtr;
            this.useInfinite = opts.useInfinite;

            // 下拉刷新
            this.refresh = false; // 下拉到有效距离
            this.isPullDown = false; // 下拉状态
            this.triggerDistance = opts.ptrDistance || 50; // 触发callback距离
            this.touchStartInfo = null;
            this.timer = null;
            this.ptrTime = opts.ptrTime || 1000; // 在有效距离停顿时间，防止数据加载过快导致动画一闪而过
            this.isScrolling = false;

            this.ptrStartFn = opts.ptrStartFn || this.noop; // 下拉开始
            this.ptrMoveFn = opts.ptrMoveFn || this.noop; // 下拉move 一直触发
            this.ptrWillRefreshFn = opts.ptrWillRefreshFn || this.noop; // 下拉超过triggerDistance,执行一次
            this.ptrRefreshFn = opts.ptrRefreshFn || this.noop; // 下拉超过triggerDistance, 松手后
            this.ptrEndFn = opts.ptrEndFn || this.noop; // 下拉刷新整体动画结束后

            // 无限滚动
            // infinite-scroll-top
            this.isBottomStart = false; // 滚动到底部
            this.isBottom = false;
            this.currentScrollTop = 0;
            this.infiniteTriggerDistance = opts.infiniteDistance || 50; // 距离底部还有50px的时候,也可以看成底部动画的高度
            this.infiniteStartFn = opts.infiniteStartFn || this.noop;
            this.infiniteMoveFn = opts.infiniteMoveFn || this.noop;
            this.infiniteEndFn = opts.infiniteEndFn || this.noop;

            this.eventArgs = this.checkPassive();

            return this;
        },
        checkPassive: function () {
            var supportsPassive = false;
            try {
                var opts = Object.defineProperty({}, 'passive', {
                    get: function () {
                        supportsPassive = true;
                    },
                });
                window.addEventListener('testPassiveListener', null, opts);
            } catch (e) {}
            return supportsPassive;
        },
        transitionEnd: function (el, callback) {
            var self = this;
            var events = ['webkitTransitionEnd', 'transitionend', 'otransitionend'];

            function fireCallBack(ev) {
                if (ev.target !== el) {
                    return;
                }
                callback.call(self, ev);
                for (var i = 0; i < events.length; i++) {
                    el.removeEventListener(events[i], fireCallBack);
                }
            }

            if (callback) {
                for (var i = 0; i < events.length; i++) {
                    el.addEventListener(events[i], fireCallBack);
                }
            }
        },
        throttle: function (callback, delay, maxRunDelay) {
            var timer = null;
            var last = 0;
            return function () {
                var self = this;
                var args = arguments;
                var now = Date.now();
                clearTimeout(timer);
                if (!last) {
                    last = now;
                }
                if (now - last >= maxRunDelay) {
                    callback.apply(self, arguments);
                } else {
                    timer = setTimeout(function () {
                        callback.apply(self, arguments);
                    }, delay);
                }
            }
        },
        addClass: function (el, classNameList) {
            var args = [].slice.call(arguments, 1);
            for (var i = 0; i < args.length; i++) {
                el.classList.add(args[i]);
            }
        },
        removeClass: function (el, classNameList) {
            var args = [].slice.call(arguments, 1);
            for (var i = 0; i < args.length; i++) {
                el.classList.remove(args[i]);
            }
        },
        setTransform: function (el, transform) {
            el.style.webkitTransform = transform;
            el.style.transform = transform;
        },
        handleTouchStart: function (ev) {
            this.touchStartInfo = {
                x: ev.type === 'touchstart' ? ev.targetTouches[0].pageX : ev.pageX,
                y: ev.type === 'touchstart' ? ev.targetTouches[0].pageY : ev.pageY
            };
        },
        handleTouchMove: function (ev) {
            var touchesDiff;
            var scrollTop;
            var translateValue;
            var pageX;
            var pageY;
            var touch;

            touch = ev.targetTouches[0];

            if (ev.type === 'touchmove') {
                pageX = touch.pageX;
                pageY = touch.pageY;
            } else {
                pageX = ev.pageX;
                pageY = ev.pageY;
            }

            if (!pageX || !pageY) {
                return;
            }

            // 判断是否上下滚动, 没有滚动直接return
            this.isScrolling = !!(Math.abs(pageY - this.touchStartInfo.y) > Math.abs(pageX - this.touchStartInfo.x));
            if (!this.isScrolling) {
                return;
            }

            touchesDiff = pageY - this.touchStartInfo.y;

            scrollTop = this.$container.scrollTop;

            // 向下有效拉动
            if (touchesDiff > 0 && scrollTop <= 0 || scrollTop < 0) {
                ev.preventDefault();

                if (this.timer) {
                    return;
                }

                translateValue = Math.pow(touchesDiff, 0.85);

                this.setTransform(this.$el, ("translate3d(0," + translateValue + "px, 0)"));

                if (translateValue > this.triggerDistance) {
                    if (!this.refresh) {
                        this.ptrWillRefreshFn();
                    }
                    this.refresh = true;
                } else {
                    this.refresh = false;
                }

                // 刚拉动的callback
                if (!this.isPullDown) {
                    this.isPullDown = true;
                    this.ptrStartFn();
                }

                // 拉动过程中的回调(todo 节流)
                this.ptrMoveFn();

            } else {
                // 不是下拉刷新的时候
                this.isPullDown = false;
            }
        },
        handleTouchEnd: function (ev) {
            if (this.timer) {
                return;
            }

            if (this.isPullDown) {
                this.lock();
                this.addClass(this.$el, this.classNames);
                if (this.refresh) {
                    this.setTransform(this.$el, ("translate3d(0,  " + this.triggerDistance + "px, 0)"));
                    this.ptrRefreshFn();
                } else {
                    this.ptrDone(true);
                }
            } else {
                this.removeClass(this.$el, this.classNames);
            }
        },
        checkDirect: function (scrollTopValue) {
            // 往上滑true
            var dir = scrollTopValue - this.currentScrollTop;
            this.currentScrollTop = scrollTopValue;
            if (dir > 0) {
                return true;
            } else {
                return false;
            }
        },
        handleScroll: function (ev) {
            var scrollTop = this.$container.scrollTop;
            var scrollHeight = this.$container.scrollHeight;
            var clientHeight = this.$container.clientHeight;
            var bottomDiff = clientHeight + scrollTop;

            if (bottomDiff >= scrollHeight - this.infiniteTriggerDistance) {

                if (this.checkDirect(scrollTop) && !this.isBottomStart) {
                    this.isBottomStart = true;
                    this.infiniteStartFn();
                }

                if (clientHeight + scrollTop >= scrollHeight) {
                    if (!this.isBottom) {
                        this.isBottom = true;
                        this.infiniteEndFn();
                    }
                } else {
                    // 下拉状态将不执行infiniteMoveFn事件
                    if (!this.isPullDown) {
                        this.infiniteMoveFn();
                    }
                }
            }
        },
        eventBind: function (ev) {
            var result = this.checkPassive();
            var passiveListener = result ? {
                passive: true
            } : false;
            var activeListener = result ? {
                passive: false
            } : false;
            if (this.usePtr) {
                this.$el.addEventListener('touchstart', this.handleTouchStart.bind(this), activeListener);
                this.$el.addEventListener('touchmove', this.handleTouchMove.bind(this), activeListener);
                this.$el.addEventListener('touchend', this.handleTouchEnd.bind(this), activeListener);
            }

            if (this.usePtr) {
                this.$container.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), 50, 100), passiveListener);
            }
        },
        lock: function () {
            if (!this.timer) {
                this.timer = true;
            }
        },
        doneCallback: function () {
            this.removeClass(this.$el, this.classNames);
            this.ptrEndFn();
            this.refresh = false; // 是否是有效下拉
            this.isPullDown = false; // 是否是下拉
            clearTimeout(this.timer);
            this.timer = null;
        },
        ptrDone: function (exec, timeStamp) {
            var self = this;
            if (exec) {
                this.ptrTime = 0;
            }

            this.timer = setTimeout(function () {
                self.setTransform(self.$el, ("translate3d(0, 0, 0)"));
                self.transitionEnd(self.$el, self.doneCallback);
            }, this.ptrTime);
        },
        infiniteDone: function () {
            this.isBottomStart = false;
            this.isBottom = false;
        }
    }

    return MePullRefresh;
}));