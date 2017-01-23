/* */ 
"format cjs";
(function(process) {
  !function(e, n) {
    "object" == typeof exports && "undefined" != typeof module ? n() : "function" == typeof define && define.amd ? define(n) : n();
  }(this, function() {
    "use strict";
    function e(e, n, t, r, i) {
      var u = e[c];
      if (u)
        for (var o = 0; o < u.length; o++) {
          var a = u[o],
              v = a.data,
              s = v.handler;
          if ((v.handler === n || s.listener === n) && v.useCapturing === r && v.eventName === t)
            return i && u.splice(o, 1), a;
        }
      return null;
    }
    function n(e, n, t) {
      var r = e[c];
      r || (r = e[c] = []), t ? r.unshift(n) : r.push(n);
    }
    function t(t, r, i, u, o, v) {
      function c(e) {
        var t = e.data;
        return n(t.target, e, o), t.invokeAddFunc(d, e);
      }
      function s(n) {
        var t = n.data;
        return e(t.target, n.invoke, t.eventName, t.useCapturing, !0), t.invokeRemoveFunc(h, n);
      }
      void 0 === i && (i = !0), void 0 === u && (u = !1), void 0 === o && (o = !1), void 0 === v && (v = f);
      var d = a(t),
          h = a(r),
          l = !i && void 0;
      return function(n, r) {
        var i = v(n, r);
        i.useCapturing = i.useCapturing || l;
        var o = null;
        "function" == typeof i.handler ? o = i.handler : i.handler && i.handler.handleEvent && (o = function(e) {
          return i.handler.handleEvent(e);
        });
        var a = !1;
        try {
          a = i.handler && "[object FunctionWrapper]" === i.handler.toString();
        } catch (f) {
          return;
        }
        if (!o || a)
          return i.invokeAddFunc(d, i.handler);
        if (!u) {
          var h = e(i.target, i.handler, i.eventName, i.useCapturing, !1);
          if (h)
            return i.invokeAddFunc(d, h);
        }
        var g = Zone.current,
            p = i.target.constructor.name + "." + t + ":" + i.eventName;
        g.scheduleEventTask(p, o, i, c, s);
      };
    }
    function r(n, t, r) {
      void 0 === t && (t = !0), void 0 === r && (r = f);
      var i = a(n),
          u = !t && void 0;
      return function(n, t) {
        var o = r(n, t);
        o.useCapturing = o.useCapturing || u;
        var a = e(o.target, o.handler, o.eventName, o.useCapturing, !0);
        a ? a.zone.cancelTask(a) : o.invokeRemoveFunc(i, o.handler);
      };
    }
    function i(e, n, i, u) {
      return void 0 === n && (n = s), void 0 === i && (i = d), void 0 === u && (u = f), !(!e || !e[n]) && (o(e, n, function() {
        return t(n, i, !0, !1, !1, u);
      }), o(e, i, function() {
        return r(i, !0, u);
      }), !0);
    }
    function u(e, n) {
      try {
        return Function("f", "return function " + e + "(){return f(this, arguments)}")(n);
      } catch (t) {
        return function() {
          return n(this, arguments);
        };
      }
    }
    function o(e, n, t) {
      for (var r = e; r && Object.getOwnPropertyNames(r).indexOf(n) === -1; )
        r = Object.getPrototypeOf(r);
      !r && e[n] && (r = e);
      var i,
          o = a(n);
      return r && !(i = r[o]) && (i = r[o] = r[n], r[n] = u(n, t(i, o, n))), i;
    }
    var a = function(e) {
      return "__zone_symbol__" + e;
    },
        v = "object" == typeof window && window || "object" == typeof self && self || global,
        c = (!("nw" in v) && "undefined" != typeof process && "[object process]" === {}.toString.call(process), a("eventTasks")),
        s = "addEventListener",
        d = "removeEventListener",
        f = function(e, n) {
          return {
            useCapturing: n[2],
            eventName: n[0],
            handler: n[1],
            target: e || v,
            name: n[0],
            invokeAddFunc: function(e, n) {
              return n && n.invoke ? this.target[e](this.eventName, n.invoke, this.useCapturing) : this.target[e](this.eventName, n, this.useCapturing);
            },
            invokeRemoveFunc: function(e, n) {
              return n && n.invoke ? this.target[e](this.eventName, n.invoke, this.useCapturing) : this.target[e](this.eventName, n, this.useCapturing);
            }
          };
        };
    t(s, d), r(d), a("originalInstance");
    !function(e) {
      function n(e) {
        e.MediaQueryList && i(e.MediaQueryList.prototype, "addListener", "removeListener", function(n, t) {
          return {
            useCapturing: !1,
            eventName: "mediaQuery",
            handler: t[0],
            target: n || e,
            name: "mediaQuery",
            invokeAddFunc: function(e, n) {
              return n && n.invoke ? this.target[e](n.invoke) : this.target[e](n);
            },
            invokeRemoveFunc: function(e, n) {
              return n && n.invoke ? this.target[e](n.invoke) : this.target[e](n);
            }
          };
        });
      }
      n(e);
    }("object" == typeof window && window || "object" == typeof self && self || global);
  });
})(require('process'));
