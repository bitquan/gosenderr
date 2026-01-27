"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_router_dom_1 = require("react-router-dom");
var page_1 = require("@/pages/vendor/dashboard/page");
var page_2 = require("@/pages/vendor/apply/page");
var page_3 = require("@/pages/items/new/page");
function App() {
    return ((0, jsx_runtime_1.jsxs)(react_router_dom_1.Routes, { children: [(0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/", element: (0, jsx_runtime_1.jsx)(react_router_dom_1.Navigate, { to: "/vendor/dashboard" }) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/vendor/dashboard", element: (0, jsx_runtime_1.jsx)(page_1.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/vendor/apply", element: (0, jsx_runtime_1.jsx)(page_2.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/vendor/items/new", element: (0, jsx_runtime_1.jsx)(page_3.default, {}) })] }));
}
