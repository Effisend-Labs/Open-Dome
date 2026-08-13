"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OpenDomeLockScreen = OpenDomeLockScreen;
var _react = _interopRequireDefault(require("react"));
var _reactNative = require("react-native");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * Shown when a mini-app is opened outside the OpenDome host iframe.
 */
function OpenDomeLockScreen({
  title = 'OpenDome required',
  message = 'This mini-app only runs inside OpenDome or the Sandbox. Open it from the host app (app.opendome.xyz) or demo.opendome.xyz.'
}) {
  return /*#__PURE__*/_react.default.createElement(_reactNative.View, {
    style: styles.root,
    accessibilityRole: "alert"
  }, /*#__PURE__*/_react.default.createElement(_reactNative.Text, {
    style: styles.kicker
  }, "LOCKED"), /*#__PURE__*/_react.default.createElement(_reactNative.Text, {
    style: styles.title
  }, title), /*#__PURE__*/_react.default.createElement(_reactNative.Text, {
    style: styles.message
  }, message));
}
const styles = _reactNative.StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12
  },
  kicker: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: _reactNative.Platform.select({
      ios: 'System',
      web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      default: 'sans-serif'
    })
  },
  title: {
    color: '#fafafa',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center'
  },
  message: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20
  }
});