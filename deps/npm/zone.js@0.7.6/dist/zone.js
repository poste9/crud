/* */ 
"format cjs";
(function(process) {
  (function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory() : typeof define === 'function' && define.amd ? define(factory) : (factory());
  }(this, (function() {
    'use strict';
    var Zone$1 = (function(global) {
      if (global['Zone']) {
        throw new Error('Zone already loaded.');
      }
      var Zone = (function() {
        function Zone(parent, zoneSpec) {
          this._properties = null;
          this._parent = parent;
          this._name = zoneSpec ? zoneSpec.name || 'unnamed' : '<root>';
          this._properties = zoneSpec && zoneSpec.properties || {};
          this._zoneDelegate = new ZoneDelegate(this, this._parent && this._parent._zoneDelegate, zoneSpec);
        }
        Zone.assertZonePatched = function() {
          if (global.Promise !== ZoneAwarePromise) {
            throw new Error('Zone.js has detected that ZoneAwarePromise `(window|global).Promise` ' + 'has been overwritten.\n' + 'Most likely cause is that a Promise polyfill has been loaded ' + 'after Zone.js (Polyfilling Promise api is not necessary when zone.js is loaded. ' + 'If you must load one, do so before loading zone.js.)');
          }
        };
        Object.defineProperty(Zone, "current", {
          get: function() {
            return _currentZoneFrame.zone;
          },
          enumerable: true,
          configurable: true
        });
        Object.defineProperty(Zone, "currentTask", {
          get: function() {
            return _currentTask;
          },
          enumerable: true,
          configurable: true
        });
        Object.defineProperty(Zone.prototype, "parent", {
          get: function() {
            return this._parent;
          },
          enumerable: true,
          configurable: true
        });
        Object.defineProperty(Zone.prototype, "name", {
          get: function() {
            return this._name;
          },
          enumerable: true,
          configurable: true
        });
        Zone.prototype.get = function(key) {
          var zone = this.getZoneWith(key);
          if (zone)
            return zone._properties[key];
        };
        Zone.prototype.getZoneWith = function(key) {
          var current = this;
          while (current) {
            if (current._properties.hasOwnProperty(key)) {
              return current;
            }
            current = current._parent;
          }
          return null;
        };
        Zone.prototype.fork = function(zoneSpec) {
          if (!zoneSpec)
            throw new Error('ZoneSpec required!');
          return this._zoneDelegate.fork(this, zoneSpec);
        };
        Zone.prototype.wrap = function(callback, source) {
          if (typeof callback !== 'function') {
            throw new Error('Expecting function got: ' + callback);
          }
          var _callback = this._zoneDelegate.intercept(this, callback, source);
          var zone = this;
          return function() {
            return zone.runGuarded(_callback, this, arguments, source);
          };
        };
        Zone.prototype.run = function(callback, applyThis, applyArgs, source) {
          if (applyThis === void 0) {
            applyThis = null;
          }
          if (applyArgs === void 0) {
            applyArgs = null;
          }
          if (source === void 0) {
            source = null;
          }
          _currentZoneFrame = new ZoneFrame(_currentZoneFrame, this);
          try {
            return this._zoneDelegate.invoke(this, callback, applyThis, applyArgs, source);
          } finally {
            _currentZoneFrame = _currentZoneFrame.parent;
          }
        };
        Zone.prototype.runGuarded = function(callback, applyThis, applyArgs, source) {
          if (applyThis === void 0) {
            applyThis = null;
          }
          if (applyArgs === void 0) {
            applyArgs = null;
          }
          if (source === void 0) {
            source = null;
          }
          _currentZoneFrame = new ZoneFrame(_currentZoneFrame, this);
          try {
            try {
              return this._zoneDelegate.invoke(this, callback, applyThis, applyArgs, source);
            } catch (error) {
              if (this._zoneDelegate.handleError(this, error)) {
                throw error;
              }
            }
          } finally {
            _currentZoneFrame = _currentZoneFrame.parent;
          }
        };
        Zone.prototype.runTask = function(task, applyThis, applyArgs) {
          task.runCount++;
          if (task.zone != this)
            throw new Error('A task can only be run in the zone which created it! (Creation: ' + task.zone.name + '; Execution: ' + this.name + ')');
          var previousTask = _currentTask;
          _currentTask = task;
          _currentZoneFrame = new ZoneFrame(_currentZoneFrame, this);
          try {
            if (task.type == 'macroTask' && task.data && !task.data.isPeriodic) {
              task.cancelFn = null;
            }
            try {
              return this._zoneDelegate.invokeTask(this, task, applyThis, applyArgs);
            } catch (error) {
              if (this._zoneDelegate.handleError(this, error)) {
                throw error;
              }
            }
          } finally {
            _currentZoneFrame = _currentZoneFrame.parent;
            _currentTask = previousTask;
          }
        };
        Zone.prototype.scheduleMicroTask = function(source, callback, data, customSchedule) {
          return this._zoneDelegate.scheduleTask(this, new ZoneTask('microTask', this, source, callback, data, customSchedule, null));
        };
        Zone.prototype.scheduleMacroTask = function(source, callback, data, customSchedule, customCancel) {
          return this._zoneDelegate.scheduleTask(this, new ZoneTask('macroTask', this, source, callback, data, customSchedule, customCancel));
        };
        Zone.prototype.scheduleEventTask = function(source, callback, data, customSchedule, customCancel) {
          return this._zoneDelegate.scheduleTask(this, new ZoneTask('eventTask', this, source, callback, data, customSchedule, customCancel));
        };
        Zone.prototype.cancelTask = function(task) {
          var value = this._zoneDelegate.cancelTask(this, task);
          task.runCount = -1;
          task.cancelFn = null;
          return value;
        };
        return Zone;
      }());
      Zone.__symbol__ = __symbol__;
      var ZoneDelegate = (function() {
        function ZoneDelegate(zone, parentDelegate, zoneSpec) {
          this._taskCounts = {
            microTask: 0,
            macroTask: 0,
            eventTask: 0
          };
          this.zone = zone;
          this._parentDelegate = parentDelegate;
          this._forkZS = zoneSpec && (zoneSpec && zoneSpec.onFork ? zoneSpec : parentDelegate._forkZS);
          this._forkDlgt = zoneSpec && (zoneSpec.onFork ? parentDelegate : parentDelegate._forkDlgt);
          this._forkCurrZone = zoneSpec && (zoneSpec.onFork ? this.zone : parentDelegate.zone);
          this._interceptZS = zoneSpec && (zoneSpec.onIntercept ? zoneSpec : parentDelegate._interceptZS);
          this._interceptDlgt = zoneSpec && (zoneSpec.onIntercept ? parentDelegate : parentDelegate._interceptDlgt);
          this._interceptCurrZone = zoneSpec && (zoneSpec.onIntercept ? this.zone : parentDelegate.zone);
          this._invokeZS = zoneSpec && (zoneSpec.onInvoke ? zoneSpec : parentDelegate._invokeZS);
          this._invokeDlgt = zoneSpec && (zoneSpec.onInvoke ? parentDelegate : parentDelegate._invokeDlgt);
          this._invokeCurrZone = zoneSpec && (zoneSpec.onInvoke ? this.zone : parentDelegate.zone);
          this._handleErrorZS = zoneSpec && (zoneSpec.onHandleError ? zoneSpec : parentDelegate._handleErrorZS);
          this._handleErrorDlgt = zoneSpec && (zoneSpec.onHandleError ? parentDelegate : parentDelegate._handleErrorDlgt);
          this._handleErrorCurrZone = zoneSpec && (zoneSpec.onHandleError ? this.zone : parentDelegate.zone);
          this._scheduleTaskZS = zoneSpec && (zoneSpec.onScheduleTask ? zoneSpec : parentDelegate._scheduleTaskZS);
          this._scheduleTaskDlgt = zoneSpec && (zoneSpec.onScheduleTask ? parentDelegate : parentDelegate._scheduleTaskDlgt);
          this._scheduleTaskCurrZone = zoneSpec && (zoneSpec.onScheduleTask ? this.zone : parentDelegate.zone);
          this._invokeTaskZS = zoneSpec && (zoneSpec.onInvokeTask ? zoneSpec : parentDelegate._invokeTaskZS);
          this._invokeTaskDlgt = zoneSpec && (zoneSpec.onInvokeTask ? parentDelegate : parentDelegate._invokeTaskDlgt);
          this._invokeTaskCurrZone = zoneSpec && (zoneSpec.onInvokeTask ? this.zone : parentDelegate.zone);
          this._cancelTaskZS = zoneSpec && (zoneSpec.onCancelTask ? zoneSpec : parentDelegate._cancelTaskZS);
          this._cancelTaskDlgt = zoneSpec && (zoneSpec.onCancelTask ? parentDelegate : parentDelegate._cancelTaskDlgt);
          this._cancelTaskCurrZone = zoneSpec && (zoneSpec.onCancelTask ? this.zone : parentDelegate.zone);
          this._hasTaskZS = zoneSpec && (zoneSpec.onHasTask ? zoneSpec : parentDelegate._hasTaskZS);
          this._hasTaskDlgt = zoneSpec && (zoneSpec.onHasTask ? parentDelegate : parentDelegate._hasTaskDlgt);
          this._hasTaskCurrZone = zoneSpec && (zoneSpec.onHasTask ? this.zone : parentDelegate.zone);
        }
        ZoneDelegate.prototype.fork = function(targetZone, zoneSpec) {
          return this._forkZS ? this._forkZS.onFork(this._forkDlgt, this.zone, targetZone, zoneSpec) : new Zone(targetZone, zoneSpec);
        };
        ZoneDelegate.prototype.intercept = function(targetZone, callback, source) {
          return this._interceptZS ? this._interceptZS.onIntercept(this._interceptDlgt, this._interceptCurrZone, targetZone, callback, source) : callback;
        };
        ZoneDelegate.prototype.invoke = function(targetZone, callback, applyThis, applyArgs, source) {
          return this._invokeZS ? this._invokeZS.onInvoke(this._invokeDlgt, this._invokeCurrZone, targetZone, callback, applyThis, applyArgs, source) : callback.apply(applyThis, applyArgs);
        };
        ZoneDelegate.prototype.handleError = function(targetZone, error) {
          return this._handleErrorZS ? this._handleErrorZS.onHandleError(this._handleErrorDlgt, this._handleErrorCurrZone, targetZone, error) : true;
        };
        ZoneDelegate.prototype.scheduleTask = function(targetZone, task) {
          try {
            if (this._scheduleTaskZS) {
              return this._scheduleTaskZS.onScheduleTask(this._scheduleTaskDlgt, this._scheduleTaskCurrZone, targetZone, task);
            } else if (task.scheduleFn) {
              task.scheduleFn(task);
            } else if (task.type == 'microTask') {
              scheduleMicroTask(task);
            } else {
              throw new Error('Task is missing scheduleFn.');
            }
            return task;
          } finally {
            if (targetZone == this.zone) {
              this._updateTaskCount(task.type, 1);
            }
          }
        };
        ZoneDelegate.prototype.invokeTask = function(targetZone, task, applyThis, applyArgs) {
          try {
            return this._invokeTaskZS ? this._invokeTaskZS.onInvokeTask(this._invokeTaskDlgt, this._invokeTaskCurrZone, targetZone, task, applyThis, applyArgs) : task.callback.apply(applyThis, applyArgs);
          } finally {
            if (targetZone == this.zone && (task.type != 'eventTask') && !(task.data && task.data.isPeriodic)) {
              this._updateTaskCount(task.type, -1);
            }
          }
        };
        ZoneDelegate.prototype.cancelTask = function(targetZone, task) {
          var value;
          if (this._cancelTaskZS) {
            value = this._cancelTaskZS.onCancelTask(this._cancelTaskDlgt, this._cancelTaskCurrZone, targetZone, task);
          } else if (!task.cancelFn) {
            throw new Error('Task does not support cancellation, or is already canceled.');
          } else {
            value = task.cancelFn(task);
          }
          if (targetZone == this.zone) {
            this._updateTaskCount(task.type, -1);
          }
          return value;
        };
        ZoneDelegate.prototype.hasTask = function(targetZone, isEmpty) {
          return this._hasTaskZS && this._hasTaskZS.onHasTask(this._hasTaskDlgt, this._hasTaskCurrZone, targetZone, isEmpty);
        };
        ZoneDelegate.prototype._updateTaskCount = function(type, count) {
          var counts = this._taskCounts;
          var prev = counts[type];
          var next = counts[type] = prev + count;
          if (next < 0) {
            throw new Error('More tasks executed then were scheduled.');
          }
          if (prev == 0 || next == 0) {
            var isEmpty = {
              microTask: counts.microTask > 0,
              macroTask: counts.macroTask > 0,
              eventTask: counts.eventTask > 0,
              change: type
            };
            try {
              this.hasTask(this.zone, isEmpty);
            } finally {
              if (this._parentDelegate) {
                this._parentDelegate._updateTaskCount(type, count);
              }
            }
          }
        };
        return ZoneDelegate;
      }());
      var ZoneTask = (function() {
        function ZoneTask(type, zone, source, callback, options, scheduleFn, cancelFn) {
          this.runCount = 0;
          this.type = type;
          this.zone = zone;
          this.source = source;
          this.data = options;
          this.scheduleFn = scheduleFn;
          this.cancelFn = cancelFn;
          this.callback = callback;
          var self = this;
          this.invoke = function() {
            _numberOfNestedTaskFrames++;
            try {
              return zone.runTask(self, this, arguments);
            } finally {
              if (_numberOfNestedTaskFrames == 1) {
                drainMicroTaskQueue();
              }
              _numberOfNestedTaskFrames--;
            }
          };
        }
        ZoneTask.prototype.toString = function() {
          if (this.data && typeof this.data.handleId !== 'undefined') {
            return this.data.handleId;
          } else {
            return Object.prototype.toString.call(this);
          }
        };
        ZoneTask.prototype.toJSON = function() {
          return {
            type: this.type,
            source: this.source,
            data: this.data,
            zone: this.zone.name,
            invoke: this.invoke,
            scheduleFn: this.scheduleFn,
            cancelFn: this.cancelFn,
            runCount: this.runCount,
            callback: this.callback
          };
        };
        return ZoneTask;
      }());
      var ZoneFrame = (function() {
        function ZoneFrame(parent, zone) {
          this.parent = parent;
          this.zone = zone;
        }
        return ZoneFrame;
      }());
      function __symbol__(name) {
        return '__zone_symbol__' + name;
      }
      var symbolSetTimeout = __symbol__('setTimeout');
      var symbolPromise = __symbol__('Promise');
      var symbolThen = __symbol__('then');
      var _currentZoneFrame = new ZoneFrame(null, new Zone(null, null));
      var _currentTask = null;
      var _microTaskQueue = [];
      var _isDrainingMicrotaskQueue = false;
      var _uncaughtPromiseErrors = [];
      var _numberOfNestedTaskFrames = 0;
      function scheduleQueueDrain() {
        if (_numberOfNestedTaskFrames === 0 && _microTaskQueue.length === 0) {
          if (global[symbolPromise]) {
            global[symbolPromise].resolve(0)[symbolThen](drainMicroTaskQueue);
          } else {
            global[symbolSetTimeout](drainMicroTaskQueue, 0);
          }
        }
      }
      function scheduleMicroTask(task) {
        scheduleQueueDrain();
        _microTaskQueue.push(task);
      }
      function consoleError(e) {
        var rejection = e && e.rejection;
        if (rejection) {
          console.error('Unhandled Promise rejection:', rejection instanceof Error ? rejection.message : rejection, '; Zone:', e.zone.name, '; Task:', e.task && e.task.source, '; Value:', rejection, rejection instanceof Error ? rejection.stack : undefined);
        }
        console.error(e);
      }
      function drainMicroTaskQueue() {
        if (!_isDrainingMicrotaskQueue) {
          _isDrainingMicrotaskQueue = true;
          while (_microTaskQueue.length) {
            var queue = _microTaskQueue;
            _microTaskQueue = [];
            for (var i = 0; i < queue.length; i++) {
              var task = queue[i];
              try {
                task.zone.runTask(task, null, null);
              } catch (e) {
                consoleError(e);
              }
            }
          }
          while (_uncaughtPromiseErrors.length) {
            var _loop_1 = function() {
              var uncaughtPromiseError = _uncaughtPromiseErrors.shift();
              try {
                uncaughtPromiseError.zone.runGuarded(function() {
                  throw uncaughtPromiseError;
                });
              } catch (e) {
                consoleError(e);
              }
            };
            while (_uncaughtPromiseErrors.length) {
              _loop_1();
            }
          }
          _isDrainingMicrotaskQueue = false;
        }
      }
      function isThenable(value) {
        return value && value.then;
      }
      function forwardResolution(value) {
        return value;
      }
      function forwardRejection(rejection) {
        return ZoneAwarePromise.reject(rejection);
      }
      var symbolState = __symbol__('state');
      var symbolValue = __symbol__('value');
      var source = 'Promise.then';
      var UNRESOLVED = null;
      var RESOLVED = true;
      var REJECTED = false;
      var REJECTED_NO_CATCH = 0;
      function makeResolver(promise, state) {
        return function(v) {
          resolvePromise(promise, state, v);
        };
      }
      function resolvePromise(promise, state, value) {
        if (promise[symbolState] === UNRESOLVED) {
          if (value instanceof ZoneAwarePromise && value.hasOwnProperty(symbolState) && value.hasOwnProperty(symbolValue) && value[symbolState] !== UNRESOLVED) {
            clearRejectedNoCatch(value);
            resolvePromise(promise, value[symbolState], value[symbolValue]);
          } else if (isThenable(value)) {
            value.then(makeResolver(promise, state), makeResolver(promise, false));
          } else {
            promise[symbolState] = state;
            var queue = promise[symbolValue];
            promise[symbolValue] = value;
            for (var i = 0; i < queue.length; ) {
              scheduleResolveOrReject(promise, queue[i++], queue[i++], queue[i++], queue[i++]);
            }
            if (queue.length == 0 && state == REJECTED) {
              promise[symbolState] = REJECTED_NO_CATCH;
              try {
                throw new Error('Uncaught (in promise): ' + value + (value && value.stack ? '\n' + value.stack : ''));
              } catch (e) {
                var error_1 = e;
                error_1.rejection = value;
                error_1.promise = promise;
                error_1.zone = Zone.current;
                error_1.task = Zone.currentTask;
                _uncaughtPromiseErrors.push(error_1);
                scheduleQueueDrain();
              }
            }
          }
        }
        return promise;
      }
      function clearRejectedNoCatch(promise) {
        if (promise[symbolState] === REJECTED_NO_CATCH) {
          promise[symbolState] = REJECTED;
          for (var i = 0; i < _uncaughtPromiseErrors.length; i++) {
            if (promise === _uncaughtPromiseErrors[i].promise) {
              _uncaughtPromiseErrors.splice(i, 1);
              break;
            }
          }
        }
      }
      function scheduleResolveOrReject(promise, zone, chainPromise, onFulfilled, onRejected) {
        clearRejectedNoCatch(promise);
        var delegate = promise[symbolState] ? onFulfilled || forwardResolution : onRejected || forwardRejection;
        zone.scheduleMicroTask(source, function() {
          try {
            resolvePromise(chainPromise, true, zone.run(delegate, null, [promise[symbolValue]]));
          } catch (error) {
            resolvePromise(chainPromise, false, error);
          }
        });
      }
      var ZoneAwarePromise = (function() {
        function ZoneAwarePromise(executor) {
          var promise = this;
          if (!(promise instanceof ZoneAwarePromise)) {
            throw new Error('Must be an instanceof Promise.');
          }
          promise[symbolState] = UNRESOLVED;
          promise[symbolValue] = [];
          try {
            executor && executor(makeResolver(promise, RESOLVED), makeResolver(promise, REJECTED));
          } catch (e) {
            resolvePromise(promise, false, e);
          }
        }
        ZoneAwarePromise.toString = function() {
          return 'function ZoneAwarePromise() { [native code] }';
        };
        ZoneAwarePromise.resolve = function(value) {
          return resolvePromise(new this(null), RESOLVED, value);
        };
        ZoneAwarePromise.reject = function(error) {
          return resolvePromise(new this(null), REJECTED, error);
        };
        ZoneAwarePromise.race = function(values) {
          var resolve;
          var reject;
          var promise = new this(function(res, rej) {
            _a = [res, rej], resolve = _a[0], reject = _a[1];
            var _a;
          });
          function onResolve(value) {
            promise && (promise = null || resolve(value));
          }
          function onReject(error) {
            promise && (promise = null || reject(error));
          }
          for (var _i = 0,
              values_1 = values; _i < values_1.length; _i++) {
            var value = values_1[_i];
            if (!isThenable(value)) {
              value = this.resolve(value);
            }
            value.then(onResolve, onReject);
          }
          return promise;
        };
        ZoneAwarePromise.all = function(values) {
          var resolve;
          var reject;
          var promise = new this(function(res, rej) {
            resolve = res;
            reject = rej;
          });
          var count = 0;
          var resolvedValues = [];
          for (var _i = 0,
              values_2 = values; _i < values_2.length; _i++) {
            var value = values_2[_i];
            if (!isThenable(value)) {
              value = this.resolve(value);
            }
            value.then((function(index) {
              return function(value) {
                resolvedValues[index] = value;
                count--;
                if (!count) {
                  resolve(resolvedValues);
                }
              };
            })(count), reject);
            count++;
          }
          if (!count)
            resolve(resolvedValues);
          return promise;
        };
        ZoneAwarePromise.prototype.then = function(onFulfilled, onRejected) {
          var chainPromise = new this.constructor(null);
          var zone = Zone.current;
          if (this[symbolState] == UNRESOLVED) {
            this[symbolValue].push(zone, chainPromise, onFulfilled, onRejected);
          } else {
            scheduleResolveOrReject(this, zone, chainPromise, onFulfilled, onRejected);
          }
          return chainPromise;
        };
        ZoneAwarePromise.prototype.catch = function(onRejected) {
          return this.then(null, onRejected);
        };
        return ZoneAwarePromise;
      }());
      ZoneAwarePromise['resolve'] = ZoneAwarePromise.resolve;
      ZoneAwarePromise['reject'] = ZoneAwarePromise.reject;
      ZoneAwarePromise['race'] = ZoneAwarePromise.race;
      ZoneAwarePromise['all'] = ZoneAwarePromise.all;
      var NativePromise = global[__symbol__('Promise')] = global['Promise'];
      global['Promise'] = ZoneAwarePromise;
      function patchThen(NativePromise) {
        var NativePromiseProtototype = NativePromise.prototype;
        var NativePromiseThen = NativePromiseProtototype[__symbol__('then')] = NativePromiseProtototype.then;
        NativePromiseProtototype.then = function(onResolve, onReject) {
          var nativePromise = this;
          return new ZoneAwarePromise(function(resolve, reject) {
            NativePromiseThen.call(nativePromise, resolve, reject);
          }).then(onResolve, onReject);
        };
      }
      if (NativePromise) {
        patchThen(NativePromise);
        if (typeof global['fetch'] !== 'undefined') {
          var fetchPromise = void 0;
          try {
            fetchPromise = global['fetch']();
          } catch (e) {
            fetchPromise = global['fetch']('about:blank');
          }
          fetchPromise.then(function() {
            return null;
          }, function() {
            return null;
          });
          if (fetchPromise.constructor != NativePromise && fetchPromise.constructor != ZoneAwarePromise) {
            patchThen(fetchPromise.constructor);
          }
        }
      }
      Promise[Zone.__symbol__('uncaughtPromiseErrors')] = _uncaughtPromiseErrors;
      var FrameType;
      (function(FrameType) {
        FrameType[FrameType["blackList"] = 0] = "blackList";
        FrameType[FrameType["transition"] = 1] = "transition";
      })(FrameType || (FrameType = {}));
      var NativeError = global[__symbol__('Error')] = global.Error;
      var blackListedStackFrames = {};
      var zoneAwareFrame;
      global.Error = ZoneAwareError;
      var frameParserStrategy = null;
      var stackRewrite = 'stackRewrite';
      var createProperty = function(props, key) {
        if (props[key]) {
          return;
        }
        var name = __symbol__(key);
        props[key] = {
          configurable: true,
          enumerable: true,
          get: function() {
            if (!this[name]) {
              var error_2 = this[__symbol__('error')];
              if (error_2) {
                this[name] = error_2[key];
              }
            }
            return this[name];
          },
          set: function(value) {
            this[name] = value;
          }
        };
      };
      var createMethodProperty = function(props, key) {
        if (props[key]) {
          return;
        }
        props[key] = {
          configurable: true,
          enumerable: true,
          writable: true,
          value: function() {
            var error = this[__symbol__('error')];
            var errorMethod = (error && error[key]) || this[key];
            if (errorMethod) {
              return errorMethod.apply(error, arguments);
            }
          }
        };
      };
      var createErrorProperties = function() {
        var props = Object.create(null);
        var error = new NativeError();
        var keys = Object.getOwnPropertyNames(error);
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          if (Object.prototype.hasOwnProperty.call(error, key)) {
            createProperty(props, key);
          }
        }
        var proto = NativeError.prototype;
        if (proto) {
          var pKeys = Object.getOwnPropertyNames(proto);
          for (var i = 0; i < pKeys.length; i++) {
            var key = pKeys[i];
            if (key !== 'constructor' && key !== 'toString' && key !== 'toSource') {
              createProperty(props, key);
            }
          }
        }
        createProperty(props, 'originalStack');
        createProperty(props, 'zoneAwareStack');
        createMethodProperty(props, 'toString');
        createMethodProperty(props, 'toSource');
        return props;
      };
      var errorProperties = createErrorProperties();
      var getErrorPropertiesForPrototype = function(prototype) {
        if (prototype === ZoneAwareError.prototype) {
          return errorProperties;
        }
        var newProps = Object.create(null);
        var cKeys = Object.getOwnPropertyNames(errorProperties);
        var keys = Object.getOwnPropertyNames(prototype);
        cKeys.forEach(function(cKey) {
          if (keys.filter(function(key) {
            return key === cKey;
          }).length === 0) {
            newProps[cKey] = errorProperties[cKey];
          }
        });
        return newProps;
      };
      function ZoneAwareError() {
        if (!(this instanceof ZoneAwareError)) {
          return ZoneAwareError.apply(Object.create(ZoneAwareError.prototype), arguments);
        }
        var error = NativeError.apply(this, arguments);
        this[__symbol__('error')] = error;
        error.originalStack = error.stack;
        if (ZoneAwareError[stackRewrite] && error.originalStack) {
          var frames_1 = error.originalStack.split('\n');
          var zoneFrame = _currentZoneFrame;
          var i = 0;
          while (frames_1[i] !== zoneAwareFrame && i < frames_1.length) {
            i++;
          }
          for (; i < frames_1.length && zoneFrame; i++) {
            var frame = frames_1[i];
            if (frame.trim()) {
              var frameType = blackListedStackFrames.hasOwnProperty(frame) && blackListedStackFrames[frame];
              if (frameType === FrameType.blackList) {
                frames_1.splice(i, 1);
                i--;
              } else if (frameType === FrameType.transition) {
                if (zoneFrame.parent) {
                  frames_1[i] += " [" + zoneFrame.parent.zone.name + " => " + zoneFrame.zone.name + "]";
                  zoneFrame = zoneFrame.parent;
                } else {
                  zoneFrame = null;
                }
              } else {
                frames_1[i] += " [" + zoneFrame.zone.name + "]";
              }
            }
          }
          error.stack = error.zoneAwareStack = frames_1.join('\n');
        }
        Object.defineProperties(this, getErrorPropertiesForPrototype(Object.getPrototypeOf(this)));
        return this;
      }
      ZoneAwareError.prototype = NativeError.prototype;
      ZoneAwareError[Zone.__symbol__('blacklistedStackFrames')] = blackListedStackFrames;
      ZoneAwareError[stackRewrite] = false;
      if (NativeError.hasOwnProperty('stackTraceLimit')) {
        NativeError.stackTraceLimit = Math.max(NativeError.stackTraceLimit, 15);
        Object.defineProperty(ZoneAwareError, 'stackTraceLimit', {
          get: function() {
            return NativeError.stackTraceLimit;
          },
          set: function(value) {
            return NativeError.stackTraceLimit = value;
          }
        });
      }
      if (NativeError.hasOwnProperty('captureStackTrace')) {
        Object.defineProperty(ZoneAwareError, 'captureStackTrace', {value: function zoneCaptureStackTrace(targetObject, constructorOpt) {
            NativeError.captureStackTrace(targetObject, constructorOpt);
          }});
      }
      Object.defineProperty(ZoneAwareError, 'prepareStackTrace', {
        get: function() {
          return NativeError.prepareStackTrace;
        },
        set: function(value) {
          if (!value || typeof value !== 'function') {
            return NativeError.prepareStackTrace = value;
          }
          return NativeError.prepareStackTrace = function(error, structuredStackTrace) {
            if (structuredStackTrace) {
              for (var i = 0; i < structuredStackTrace.length; i++) {
                var st = structuredStackTrace[i];
                if (st.getFunctionName() === 'zoneCaptureStackTrace') {
                  structuredStackTrace.splice(i, 1);
                  break;
                }
              }
            }
            return value.apply(this, [error, structuredStackTrace]);
          };
        }
      });
      var detectZone = Zone.current.fork({
        name: 'detect',
        onInvoke: function(parentZoneDelegate, currentZone, targetZone, delegate, applyThis, applyArgs, source) {
          return parentZoneDelegate.invoke(targetZone, delegate, applyThis, applyArgs, source);
        },
        onHandleError: function(parentZD, current, target, error) {
          if (error.originalStack && Error === ZoneAwareError) {
            var frames_2 = error.originalStack.split(/\n/);
            var runFrame = false,
                runGuardedFrame = false,
                runTaskFrame = false;
            while (frames_2.length) {
              var frame = frames_2.shift();
              if (/:\d+:\d+/.test(frame)) {
                var fnName = frame.split('(')[0].split('@')[0];
                var frameType = FrameType.transition;
                if (fnName.indexOf('ZoneAwareError') !== -1) {
                  zoneAwareFrame = frame;
                }
                if (fnName.indexOf('runGuarded') !== -1) {
                  runGuardedFrame = true;
                } else if (fnName.indexOf('runTask') !== -1) {
                  runTaskFrame = true;
                } else if (fnName.indexOf('run') !== -1) {
                  runFrame = true;
                } else {
                  frameType = FrameType.blackList;
                }
                blackListedStackFrames[frame] = frameType;
                if (runFrame && runGuardedFrame && runTaskFrame) {
                  ZoneAwareError[stackRewrite] = true;
                  break;
                }
              }
            }
          }
          return false;
        }
      });
      var detectRunFn = function() {
        detectZone.run(function() {
          detectZone.runGuarded(function() {
            throw new Error('blacklistStackFrames');
          });
        });
      };
      detectZone.runTask(detectZone.scheduleMacroTask('detect', detectRunFn, null, function() {
        return null;
      }, null));
      return global['Zone'] = Zone;
    })(typeof window === 'object' && window || typeof self === 'object' && self || global);
    var zoneSymbol = function(n) {
      return "__zone_symbol__" + n;
    };
    var _global$1 = typeof window === 'object' && window || typeof self === 'object' && self || global;
    function bindArguments(args, source) {
      for (var i = args.length - 1; i >= 0; i--) {
        if (typeof args[i] === 'function') {
          args[i] = Zone.current.wrap(args[i], source + '_' + i);
        }
      }
      return args;
    }
    function patchPrototype(prototype, fnNames) {
      var source = prototype.constructor['name'];
      var _loop_1 = function(i) {
        var name_1 = fnNames[i];
        var delegate = prototype[name_1];
        if (delegate) {
          prototype[name_1] = (function(delegate) {
            return function() {
              return delegate.apply(this, bindArguments(arguments, source + '.' + name_1));
            };
          })(delegate);
        }
      };
      for (var i = 0; i < fnNames.length; i++) {
        _loop_1(i);
      }
    }
    var isWebWorker = (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope);
    var isNode = (!('nw' in _global$1) && typeof process !== 'undefined' && {}.toString.call(process) === '[object process]');
    var isBrowser = !isNode && !isWebWorker && !!(typeof window !== 'undefined' && window['HTMLElement']);
    function patchProperty(obj, prop) {
      var desc = Object.getOwnPropertyDescriptor(obj, prop) || {
        enumerable: true,
        configurable: true
      };
      var originalDesc = Object.getOwnPropertyDescriptor(obj, 'original' + prop);
      if (!originalDesc && desc.get) {
        Object.defineProperty(obj, 'original' + prop, {
          enumerable: false,
          configurable: true,
          get: desc.get
        });
      }
      delete desc.writable;
      delete desc.value;
      var eventName = prop.substr(2);
      var _prop = '_' + prop;
      desc.set = function(fn) {
        if (this[_prop]) {
          this.removeEventListener(eventName, this[_prop]);
        }
        if (typeof fn === 'function') {
          var wrapFn = function(event) {
            var result;
            result = fn.apply(this, arguments);
            if (result != undefined && !result)
              event.preventDefault();
          };
          this[_prop] = wrapFn;
          this.addEventListener(eventName, wrapFn, false);
        } else {
          this[_prop] = null;
        }
      };
      desc.get = function() {
        var r = this[_prop] || null;
        if (r === null) {
          if (originalDesc && originalDesc.get) {
            r = originalDesc.get.apply(this, arguments);
            if (r) {
              desc.set.apply(this, [r]);
              if (typeof this['removeAttribute'] === 'function') {
                this.removeAttribute(prop);
              }
            }
          }
        }
        return this[_prop] || null;
      };
      Object.defineProperty(obj, prop, desc);
    }
    function patchOnProperties(obj, properties) {
      var onProperties = [];
      for (var prop in obj) {
        if (prop.substr(0, 2) == 'on') {
          onProperties.push(prop);
        }
      }
      for (var j = 0; j < onProperties.length; j++) {
        patchProperty(obj, onProperties[j]);
      }
      if (properties) {
        for (var i = 0; i < properties.length; i++) {
          patchProperty(obj, 'on' + properties[i]);
        }
      }
    }
    var EVENT_TASKS = zoneSymbol('eventTasks');
    var ADD_EVENT_LISTENER = 'addEventListener';
    var REMOVE_EVENT_LISTENER = 'removeEventListener';
    function findExistingRegisteredTask(target, handler, name, capture, remove) {
      var eventTasks = target[EVENT_TASKS];
      if (eventTasks) {
        for (var i = 0; i < eventTasks.length; i++) {
          var eventTask = eventTasks[i];
          var data = eventTask.data;
          var listener = data.handler;
          if ((data.handler === handler || listener.listener === handler) && data.useCapturing === capture && data.eventName === name) {
            if (remove) {
              eventTasks.splice(i, 1);
            }
            return eventTask;
          }
        }
      }
      return null;
    }
    function findAllExistingRegisteredTasks(target, name, capture, remove) {
      var eventTasks = target[EVENT_TASKS];
      if (eventTasks) {
        var result = [];
        for (var i = eventTasks.length - 1; i >= 0; i--) {
          var eventTask = eventTasks[i];
          var data = eventTask.data;
          if (data.eventName === name && data.useCapturing === capture) {
            result.push(eventTask);
            if (remove) {
              eventTasks.splice(i, 1);
            }
          }
        }
        return result;
      }
      return null;
    }
    function attachRegisteredEvent(target, eventTask, isPrepend) {
      var eventTasks = target[EVENT_TASKS];
      if (!eventTasks) {
        eventTasks = target[EVENT_TASKS] = [];
      }
      if (isPrepend) {
        eventTasks.unshift(eventTask);
      } else {
        eventTasks.push(eventTask);
      }
    }
    var defaultListenerMetaCreator = function(self, args) {
      return {
        useCapturing: args[2],
        eventName: args[0],
        handler: args[1],
        target: self || _global$1,
        name: args[0],
        invokeAddFunc: function(addFnSymbol, delegate) {
          if (delegate && delegate.invoke) {
            return this.target[addFnSymbol](this.eventName, delegate.invoke, this.useCapturing);
          } else {
            return this.target[addFnSymbol](this.eventName, delegate, this.useCapturing);
          }
        },
        invokeRemoveFunc: function(removeFnSymbol, delegate) {
          if (delegate && delegate.invoke) {
            return this.target[removeFnSymbol](this.eventName, delegate.invoke, this.useCapturing);
          } else {
            return this.target[removeFnSymbol](this.eventName, delegate, this.useCapturing);
          }
        }
      };
    };
    function makeZoneAwareAddListener(addFnName, removeFnName, useCapturingParam, allowDuplicates, isPrepend, metaCreator) {
      if (useCapturingParam === void 0) {
        useCapturingParam = true;
      }
      if (allowDuplicates === void 0) {
        allowDuplicates = false;
      }
      if (isPrepend === void 0) {
        isPrepend = false;
      }
      if (metaCreator === void 0) {
        metaCreator = defaultListenerMetaCreator;
      }
      var addFnSymbol = zoneSymbol(addFnName);
      var removeFnSymbol = zoneSymbol(removeFnName);
      var defaultUseCapturing = useCapturingParam ? false : undefined;
      function scheduleEventListener(eventTask) {
        var meta = eventTask.data;
        attachRegisteredEvent(meta.target, eventTask, isPrepend);
        return meta.invokeAddFunc(addFnSymbol, eventTask);
      }
      function cancelEventListener(eventTask) {
        var meta = eventTask.data;
        findExistingRegisteredTask(meta.target, eventTask.invoke, meta.eventName, meta.useCapturing, true);
        return meta.invokeRemoveFunc(removeFnSymbol, eventTask);
      }
      return function zoneAwareAddListener(self, args) {
        var data = metaCreator(self, args);
        data.useCapturing = data.useCapturing || defaultUseCapturing;
        var delegate = null;
        if (typeof data.handler == 'function') {
          delegate = data.handler;
        } else if (data.handler && data.handler.handleEvent) {
          delegate = function(event) {
            return data.handler.handleEvent(event);
          };
        }
        var validZoneHandler = false;
        try {
          validZoneHandler = data.handler && data.handler.toString() === '[object FunctionWrapper]';
        } catch (e) {
          return;
        }
        if (!delegate || validZoneHandler) {
          return data.invokeAddFunc(addFnSymbol, data.handler);
        }
        if (!allowDuplicates) {
          var eventTask = findExistingRegisteredTask(data.target, data.handler, data.eventName, data.useCapturing, false);
          if (eventTask) {
            return data.invokeAddFunc(addFnSymbol, eventTask);
          }
        }
        var zone = Zone.current;
        var source = data.target.constructor['name'] + '.' + addFnName + ':' + data.eventName;
        zone.scheduleEventTask(source, delegate, data, scheduleEventListener, cancelEventListener);
      };
    }
    function makeZoneAwareRemoveListener(fnName, useCapturingParam, metaCreator) {
      if (useCapturingParam === void 0) {
        useCapturingParam = true;
      }
      if (metaCreator === void 0) {
        metaCreator = defaultListenerMetaCreator;
      }
      var symbol = zoneSymbol(fnName);
      var defaultUseCapturing = useCapturingParam ? false : undefined;
      return function zoneAwareRemoveListener(self, args) {
        var data = metaCreator(self, args);
        data.useCapturing = data.useCapturing || defaultUseCapturing;
        var eventTask = findExistingRegisteredTask(data.target, data.handler, data.eventName, data.useCapturing, true);
        if (eventTask) {
          eventTask.zone.cancelTask(eventTask);
        } else {
          data.invokeRemoveFunc(symbol, data.handler);
        }
      };
    }
    var zoneAwareAddEventListener = makeZoneAwareAddListener(ADD_EVENT_LISTENER, REMOVE_EVENT_LISTENER);
    var zoneAwareRemoveEventListener = makeZoneAwareRemoveListener(REMOVE_EVENT_LISTENER);
    function patchEventTargetMethods(obj, addFnName, removeFnName, metaCreator) {
      if (addFnName === void 0) {
        addFnName = ADD_EVENT_LISTENER;
      }
      if (removeFnName === void 0) {
        removeFnName = REMOVE_EVENT_LISTENER;
      }
      if (metaCreator === void 0) {
        metaCreator = defaultListenerMetaCreator;
      }
      if (obj && obj[addFnName]) {
        patchMethod(obj, addFnName, function() {
          return makeZoneAwareAddListener(addFnName, removeFnName, true, false, false, metaCreator);
        });
        patchMethod(obj, removeFnName, function() {
          return makeZoneAwareRemoveListener(removeFnName, true, metaCreator);
        });
        return true;
      } else {
        return false;
      }
    }
    var originalInstanceKey = zoneSymbol('originalInstance');
    function patchClass(className) {
      var OriginalClass = _global$1[className];
      if (!OriginalClass)
        return;
      _global$1[className] = function() {
        var a = bindArguments(arguments, className);
        switch (a.length) {
          case 0:
            this[originalInstanceKey] = new OriginalClass();
            break;
          case 1:
            this[originalInstanceKey] = new OriginalClass(a[0]);
            break;
          case 2:
            this[originalInstanceKey] = new OriginalClass(a[0], a[1]);
            break;
          case 3:
            this[originalInstanceKey] = new OriginalClass(a[0], a[1], a[2]);
            break;
          case 4:
            this[originalInstanceKey] = new OriginalClass(a[0], a[1], a[2], a[3]);
            break;
          default:
            throw new Error('Arg list too long.');
        }
      };
      var instance = new OriginalClass(function() {});
      var prop;
      for (prop in instance) {
        if (className === 'XMLHttpRequest' && prop === 'responseBlob')
          continue;
        (function(prop) {
          if (typeof instance[prop] === 'function') {
            _global$1[className].prototype[prop] = function() {
              return this[originalInstanceKey][prop].apply(this[originalInstanceKey], arguments);
            };
          } else {
            Object.defineProperty(_global$1[className].prototype, prop, {
              set: function(fn) {
                if (typeof fn === 'function') {
                  this[originalInstanceKey][prop] = Zone.current.wrap(fn, className + '.' + prop);
                } else {
                  this[originalInstanceKey][prop] = fn;
                }
              },
              get: function() {
                return this[originalInstanceKey][prop];
              }
            });
          }
        }(prop));
      }
      for (prop in OriginalClass) {
        if (prop !== 'prototype' && OriginalClass.hasOwnProperty(prop)) {
          _global$1[className][prop] = OriginalClass[prop];
        }
      }
    }
    function createNamedFn(name, delegate) {
      try {
        return (Function('f', "return function " + name + "(){return f(this, arguments)}"))(delegate);
      } catch (e) {
        return function() {
          return delegate(this, arguments);
        };
      }
    }
    function patchMethod(target, name, patchFn) {
      var proto = target;
      while (proto && Object.getOwnPropertyNames(proto).indexOf(name) === -1) {
        proto = Object.getPrototypeOf(proto);
      }
      if (!proto && target[name]) {
        proto = target;
      }
      var delegateName = zoneSymbol(name);
      var delegate;
      if (proto && !(delegate = proto[delegateName])) {
        delegate = proto[delegateName] = proto[name];
        proto[name] = createNamedFn(name, patchFn(delegate, delegateName, name));
      }
      return delegate;
    }
    function patchTimer(window, setName, cancelName, nameSuffix) {
      var setNative = null;
      var clearNative = null;
      setName += nameSuffix;
      cancelName += nameSuffix;
      var tasksByHandleId = {};
      function scheduleTask(task) {
        var data = task.data;
        data.args[0] = function() {
          task.invoke.apply(this, arguments);
          delete tasksByHandleId[data.handleId];
        };
        data.handleId = setNative.apply(window, data.args);
        tasksByHandleId[data.handleId] = task;
        return task;
      }
      function clearTask(task) {
        delete tasksByHandleId[task.data.handleId];
        return clearNative(task.data.handleId);
      }
      setNative = patchMethod(window, setName, function(delegate) {
        return function(self, args) {
          if (typeof args[0] === 'function') {
            var zone = Zone.current;
            var options = {
              handleId: null,
              isPeriodic: nameSuffix === 'Interval',
              delay: (nameSuffix === 'Timeout' || nameSuffix === 'Interval') ? args[1] || 0 : null,
              args: args
            };
            var task = zone.scheduleMacroTask(setName, args[0], options, scheduleTask, clearTask);
            if (!task) {
              return task;
            }
            var handle = task.data.handleId;
            if (handle.ref && handle.unref) {
              task.ref = handle.ref.bind(handle);
              task.unref = handle.unref.bind(handle);
            }
            return task;
          } else {
            return delegate.apply(window, args);
          }
        };
      });
      clearNative = patchMethod(window, cancelName, function(delegate) {
        return function(self, args) {
          var task = typeof args[0] === 'number' ? tasksByHandleId[args[0]] : args[0];
          if (task && typeof task.type === 'string') {
            if (task.cancelFn && task.data.isPeriodic || task.runCount === 0) {
              task.zone.cancelTask(task);
            }
          } else {
            delegate.apply(window, args);
          }
        };
      });
    }
    var _defineProperty = Object[zoneSymbol('defineProperty')] = Object.defineProperty;
    var _getOwnPropertyDescriptor = Object[zoneSymbol('getOwnPropertyDescriptor')] = Object.getOwnPropertyDescriptor;
    var _create = Object.create;
    var unconfigurablesKey = zoneSymbol('unconfigurables');
    function propertyPatch() {
      Object.defineProperty = function(obj, prop, desc) {
        if (isUnconfigurable(obj, prop)) {
          throw new TypeError('Cannot assign to read only property \'' + prop + '\' of ' + obj);
        }
        var originalConfigurableFlag = desc.configurable;
        if (prop !== 'prototype') {
          desc = rewriteDescriptor(obj, prop, desc);
        }
        return _tryDefineProperty(obj, prop, desc, originalConfigurableFlag);
      };
      Object.defineProperties = function(obj, props) {
        Object.keys(props).forEach(function(prop) {
          Object.defineProperty(obj, prop, props[prop]);
        });
        return obj;
      };
      Object.create = function(obj, proto) {
        if (typeof proto === 'object' && !Object.isFrozen(proto)) {
          Object.keys(proto).forEach(function(prop) {
            proto[prop] = rewriteDescriptor(obj, prop, proto[prop]);
          });
        }
        return _create(obj, proto);
      };
      Object.getOwnPropertyDescriptor = function(obj, prop) {
        var desc = _getOwnPropertyDescriptor(obj, prop);
        if (isUnconfigurable(obj, prop)) {
          desc.configurable = false;
        }
        return desc;
      };
    }
    function _redefineProperty(obj, prop, desc) {
      var originalConfigurableFlag = desc.configurable;
      desc = rewriteDescriptor(obj, prop, desc);
      return _tryDefineProperty(obj, prop, desc, originalConfigurableFlag);
    }
    function isUnconfigurable(obj, prop) {
      return obj && obj[unconfigurablesKey] && obj[unconfigurablesKey][prop];
    }
    function rewriteDescriptor(obj, prop, desc) {
      desc.configurable = true;
      if (!desc.configurable) {
        if (!obj[unconfigurablesKey]) {
          _defineProperty(obj, unconfigurablesKey, {
            writable: true,
            value: {}
          });
        }
        obj[unconfigurablesKey][prop] = true;
      }
      return desc;
    }
    function _tryDefineProperty(obj, prop, desc, originalConfigurableFlag) {
      try {
        return _defineProperty(obj, prop, desc);
      } catch (e) {
        if (desc.configurable) {
          if (typeof originalConfigurableFlag == 'undefined') {
            delete desc.configurable;
          } else {
            desc.configurable = originalConfigurableFlag;
          }
          try {
            return _defineProperty(obj, prop, desc);
          } catch (e) {
            var descJson = null;
            try {
              descJson = JSON.stringify(desc);
            } catch (e) {
              descJson = descJson.toString();
            }
            console.log("Attempting to configure '" + prop + "' with descriptor '" + descJson + "' on object '" + obj + "' and got error, giving up: " + e);
          }
        } else {
          throw e;
        }
      }
    }
    var WTF_ISSUE_555 = 'Anchor,Area,Audio,BR,Base,BaseFont,Body,Button,Canvas,Content,DList,Directory,Div,Embed,FieldSet,Font,Form,Frame,FrameSet,HR,Head,Heading,Html,IFrame,Image,Input,Keygen,LI,Label,Legend,Link,Map,Marquee,Media,Menu,Meta,Meter,Mod,OList,Object,OptGroup,Option,Output,Paragraph,Pre,Progress,Quote,Script,Select,Source,Span,Style,TableCaption,TableCell,TableCol,Table,TableRow,TableSection,TextArea,Title,Track,UList,Unknown,Video';
    var NO_EVENT_TARGET = 'ApplicationCache,EventSource,FileReader,InputMethodContext,MediaController,MessagePort,Node,Performance,SVGElementInstance,SharedWorker,TextTrack,TextTrackCue,TextTrackList,WebKitNamedFlow,Window,Worker,WorkerGlobalScope,XMLHttpRequest,XMLHttpRequestEventTarget,XMLHttpRequestUpload,IDBRequest,IDBOpenDBRequest,IDBDatabase,IDBTransaction,IDBCursor,DBIndex,WebSocket'.split(',');
    var EVENT_TARGET = 'EventTarget';
    function eventTargetPatch(_global) {
      var apis = [];
      var isWtf = _global['wtf'];
      if (isWtf) {
        apis = WTF_ISSUE_555.split(',').map(function(v) {
          return 'HTML' + v + 'Element';
        }).concat(NO_EVENT_TARGET);
      } else if (_global[EVENT_TARGET]) {
        apis.push(EVENT_TARGET);
      } else {
        apis = NO_EVENT_TARGET;
      }
      for (var i = 0; i < apis.length; i++) {
        var type = _global[apis[i]];
        patchEventTargetMethods(type && type.prototype);
      }
    }
    function apply(_global) {
      var WS = _global.WebSocket;
      if (!_global.EventTarget) {
        patchEventTargetMethods(WS.prototype);
      }
      _global.WebSocket = function(a, b) {
        var socket = arguments.length > 1 ? new WS(a, b) : new WS(a);
        var proxySocket;
        var onmessageDesc = Object.getOwnPropertyDescriptor(socket, 'onmessage');
        if (onmessageDesc && onmessageDesc.configurable === false) {
          proxySocket = Object.create(socket);
          ['addEventListener', 'removeEventListener', 'send', 'close'].forEach(function(propName) {
            proxySocket[propName] = function() {
              return socket[propName].apply(socket, arguments);
            };
          });
        } else {
          proxySocket = socket;
        }
        patchOnProperties(proxySocket, ['close', 'error', 'message', 'open']);
        return proxySocket;
      };
      for (var prop in WS) {
        _global.WebSocket[prop] = WS[prop];
      }
    }
    var eventNames = 'copy cut paste abort blur focus canplay canplaythrough change click contextmenu dblclick drag dragend dragenter dragleave dragover dragstart drop durationchange emptied ended input invalid keydown keypress keyup load loadeddata loadedmetadata loadstart message mousedown mouseenter mouseleave mousemove mouseout mouseover mouseup pause play playing progress ratechange reset scroll seeked seeking select show stalled submit suspend timeupdate volumechange waiting mozfullscreenchange mozfullscreenerror mozpointerlockchange mozpointerlockerror error webglcontextrestored webglcontextlost webglcontextcreationerror'.split(' ');
    function propertyDescriptorPatch(_global) {
      if (isNode) {
        return;
      }
      var supportsWebSocket = typeof WebSocket !== 'undefined';
      if (canPatchViaPropertyDescriptor()) {
        if (isBrowser) {
          patchOnProperties(HTMLElement.prototype, eventNames);
        }
        patchOnProperties(XMLHttpRequest.prototype, null);
        if (typeof IDBIndex !== 'undefined') {
          patchOnProperties(IDBIndex.prototype, null);
          patchOnProperties(IDBRequest.prototype, null);
          patchOnProperties(IDBOpenDBRequest.prototype, null);
          patchOnProperties(IDBDatabase.prototype, null);
          patchOnProperties(IDBTransaction.prototype, null);
          patchOnProperties(IDBCursor.prototype, null);
        }
        if (supportsWebSocket) {
          patchOnProperties(WebSocket.prototype, null);
        }
      } else {
        patchViaCapturingAllTheEvents();
        patchClass('XMLHttpRequest');
        if (supportsWebSocket) {
          apply(_global);
        }
      }
    }
    function canPatchViaPropertyDescriptor() {
      if (isBrowser && !Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'onclick') && typeof Element !== 'undefined') {
        var desc = Object.getOwnPropertyDescriptor(Element.prototype, 'onclick');
        if (desc && !desc.configurable)
          return false;
      }
      var xhrDesc = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'onreadystatechange');
      Object.defineProperty(XMLHttpRequest.prototype, 'onreadystatechange', {
        enumerable: true,
        configurable: true,
        get: function() {
          return true;
        }
      });
      var req = new XMLHttpRequest();
      var result = !!req.onreadystatechange;
      Object.defineProperty(XMLHttpRequest.prototype, 'onreadystatechange', xhrDesc || {});
      return result;
    }
    var unboundKey = zoneSymbol('unbound');
    function patchViaCapturingAllTheEvents() {
      var _loop_1 = function(i) {
        var property = eventNames[i];
        var onproperty = 'on' + property;
        self.addEventListener(property, function(event) {
          var elt = event.target,
              bound,
              source;
          if (elt) {
            source = elt.constructor['name'] + '.' + onproperty;
          } else {
            source = 'unknown.' + onproperty;
          }
          while (elt) {
            if (elt[onproperty] && !elt[onproperty][unboundKey]) {
              bound = Zone.current.wrap(elt[onproperty], source);
              bound[unboundKey] = elt[onproperty];
              elt[onproperty] = bound;
            }
            elt = elt.parentElement;
          }
        }, true);
      };
      for (var i = 0; i < eventNames.length; i++) {
        _loop_1(i);
      }
    }
    function registerElementPatch(_global) {
      if (!isBrowser || !('registerElement' in _global.document)) {
        return;
      }
      var _registerElement = document.registerElement;
      var callbacks = ['createdCallback', 'attachedCallback', 'detachedCallback', 'attributeChangedCallback'];
      document.registerElement = function(name, opts) {
        if (opts && opts.prototype) {
          callbacks.forEach(function(callback) {
            var source = 'Document.registerElement::' + callback;
            if (opts.prototype.hasOwnProperty(callback)) {
              var descriptor = Object.getOwnPropertyDescriptor(opts.prototype, callback);
              if (descriptor && descriptor.value) {
                descriptor.value = Zone.current.wrap(descriptor.value, source);
                _redefineProperty(opts.prototype, callback, descriptor);
              } else {
                opts.prototype[callback] = Zone.current.wrap(opts.prototype[callback], source);
              }
            } else if (opts.prototype[callback]) {
              opts.prototype[callback] = Zone.current.wrap(opts.prototype[callback], source);
            }
          });
        }
        return _registerElement.apply(document, [name, opts]);
      };
    }
    var set = 'set';
    var clear = 'clear';
    var blockingMethods = ['alert', 'prompt', 'confirm'];
    var _global = typeof window === 'object' && window || typeof self === 'object' && self || global;
    patchTimer(_global, set, clear, 'Timeout');
    patchTimer(_global, set, clear, 'Interval');
    patchTimer(_global, set, clear, 'Immediate');
    patchTimer(_global, 'request', 'cancel', 'AnimationFrame');
    patchTimer(_global, 'mozRequest', 'mozCancel', 'AnimationFrame');
    patchTimer(_global, 'webkitRequest', 'webkitCancel', 'AnimationFrame');
    for (var i = 0; i < blockingMethods.length; i++) {
      var name_1 = blockingMethods[i];
      patchMethod(_global, name_1, function(delegate, symbol, name) {
        return function(s, args) {
          return Zone.current.run(delegate, _global, args, name);
        };
      });
    }
    eventTargetPatch(_global);
    propertyDescriptorPatch(_global);
    patchClass('MutationObserver');
    patchClass('WebKitMutationObserver');
    patchClass('FileReader');
    propertyPatch();
    registerElementPatch(_global);
    patchXHR(_global);
    var XHR_TASK = zoneSymbol('xhrTask');
    var XHR_SYNC = zoneSymbol('xhrSync');
    var XHR_LISTENER = zoneSymbol('xhrListener');
    var XHR_SCHEDULED = zoneSymbol('xhrScheduled');
    function patchXHR(window) {
      function findPendingTask(target) {
        var pendingTask = target[XHR_TASK];
        return pendingTask;
      }
      function scheduleTask(task) {
        self[XHR_SCHEDULED] = false;
        var data = task.data;
        var listener = data.target[XHR_LISTENER];
        if (listener) {
          data.target.removeEventListener('readystatechange', listener);
        }
        var newListener = data.target[XHR_LISTENER] = function() {
          if (data.target.readyState === data.target.DONE) {
            if (!data.aborted && self[XHR_SCHEDULED]) {
              task.invoke();
            }
          }
        };
        data.target.addEventListener('readystatechange', newListener);
        var storedTask = data.target[XHR_TASK];
        if (!storedTask) {
          data.target[XHR_TASK] = task;
        }
        sendNative.apply(data.target, data.args);
        self[XHR_SCHEDULED] = true;
        return task;
      }
      function placeholderCallback() {}
      function clearTask(task) {
        var data = task.data;
        data.aborted = true;
        return abortNative.apply(data.target, data.args);
      }
      var openNative = patchMethod(window.XMLHttpRequest.prototype, 'open', function() {
        return function(self, args) {
          self[XHR_SYNC] = args[2] == false;
          return openNative.apply(self, args);
        };
      });
      var sendNative = patchMethod(window.XMLHttpRequest.prototype, 'send', function() {
        return function(self, args) {
          var zone = Zone.current;
          if (self[XHR_SYNC]) {
            return sendNative.apply(self, args);
          } else {
            var options = {
              target: self,
              isPeriodic: false,
              delay: null,
              args: args,
              aborted: false
            };
            return zone.scheduleMacroTask('XMLHttpRequest.send', placeholderCallback, options, scheduleTask, clearTask);
          }
        };
      });
      var abortNative = patchMethod(window.XMLHttpRequest.prototype, 'abort', function(delegate) {
        return function(self, args) {
          var task = findPendingTask(self);
          if (task && typeof task.type == 'string') {
            if (task.cancelFn == null || (task.data && task.data.aborted)) {
              return;
            }
            task.zone.cancelTask(task);
          }
        };
      });
    }
    if (_global['navigator'] && _global['navigator'].geolocation) {
      patchPrototype(_global['navigator'].geolocation, ['getCurrentPosition', 'watchPosition']);
    }
  })));
})(require('process'));
