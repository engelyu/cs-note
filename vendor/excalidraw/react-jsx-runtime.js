var d=Object.create;var E=Object.defineProperty;var p=Object.getOwnPropertyDescriptor;var k=Object.getOwnPropertyNames;var T=Object.getPrototypeOf,_=Object.prototype.hasOwnProperty;var i=(t,r)=>()=>{try{return r||t((r={exports:{}}).exports,r),r.exports}catch(e){throw r=0,e}};var a=(t,r,e,o)=>{if(r&&typeof r=="object"||typeof r=="function")for(let s of k(r))!_.call(t,s)&&s!==e&&E(t,s,{get:()=>r[s],enumerable:!(o=p(r,s))||o.enumerable});return t};var f=(t,r,e)=>(e=t!=null?d(T(t)):{},a(r||!t||!t.__esModule?E(e,"default",{value:t,enumerable:!0}):e,t));var x=i(l=>{"use strict";var m=Symbol.for("react.transitional.element"),A=Symbol.for("react.fragment");function n(t,r,e){var o=null;if(e!==void 0&&(o=""+e),r.key!==void 0&&(o=""+r.key),"key"in r){e={};for(var s in r)s!=="key"&&(e[s]=r[s])}else e=r;return r=e.ref,{$$typeof:m,type:t,key:o,ref:r!==void 0?r:null,props:e}}l.Fragment=A;l.jsx=n;l.jsxs=n});var v=i((R,j)=>{"use strict";j.exports=x()});var u=f(v(),1);var export_Fragment=u.Fragment;var export_jsx=u.jsx;var export_jsxs=u.jsxs;export{export_Fragment as Fragment,export_jsx as jsx,export_jsxs as jsxs};
/*! Bundled license information:

react/cjs/react-jsx-runtime.production.js:
  (**
   * @license React
   * react-jsx-runtime.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
