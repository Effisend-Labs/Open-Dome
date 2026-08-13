"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OpenDomeHostGate = OpenDomeHostGate;
exports.isOpenDomeHosted = isOpenDomeHosted;
var _react = _interopRequireWildcard(require("react"));
var _LockScreen = require("./LockScreen");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function isOpenDomeHosted() {
  if (typeof window === 'undefined') return false;
  try {
    return window.parent !== window;
  } catch {
    return false;
  }
}

/**
 * Blocks rendering unless the mini-app is embedded in the OpenDome host iframe.
 * Use in venue / non-SDK roots that do not call useOpenDome at the top level.
 */
function OpenDomeHostGate({
  children,
  title,
  message
}) {
  const [hosted, setHosted] = (0, _react.useState)(null);
  (0, _react.useEffect)(() => {
    setHosted(isOpenDomeHosted());
  }, []);
  if (hosted === null) return null;
  if (!hosted) {
    return /*#__PURE__*/_react.default.createElement(_LockScreen.OpenDomeLockScreen, {
      title: title,
      message: message
    });
  }
  return children;
}