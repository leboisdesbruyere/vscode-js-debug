// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as test from '../test';

async function listScopes(p: test.Params) {
  await test.launchAndLoad(p, 'data:text/html,blank');
  p.cdp.Runtime.evaluate({expression: `
    function paused() {
      let y = 'paused';
      debugger;
    }
    function chain(n) {
      if (!n)
        return paused;
      return function chained() {
        let x = 'x' + n;
        chain(n - 1)();
      };
    }
    chain(3)();
  `});
  const paused = p.log(await p.dap.once('stopped'), 'stopped: ');
  const stack = p.log(await p.dap.stackTrace({threadId: paused.threadId}), 'stackTrace: ');
  for (let i = 0; i < stack.stackFrames.length; i++) {
    const scopes = p.log(await p.dap.scopes({frameId: stack.stackFrames[i].id}), `frame #${i}: `);
    for (let j = 0; j < scopes.scopes.length; j++) {
      if (!scopes.scopes[j].expensive)
        p.log(await p.dap.variables({variablesReference: scopes.scopes[j].variablesReference}), `scope #${i}.${j}: `);
    }
  }
}

async function setScopeVariable(p: test.Params) {
  await test.launchAndLoad(p, 'data:text/html,blank');
  p.cdp.Runtime.evaluate({expression: `
    (function paused() {
      let y = 'paused';
      debugger;
    })()
  `});
  const paused = p.log(await p.dap.once('stopped'), 'stopped: ');
  const stack = p.log(await p.dap.stackTrace({threadId: paused.threadId}), 'stackTrace: ');
  const scopes = p.log(await p.dap.scopes({frameId: stack.stackFrames[0].id}), `scopes: `);
  const scopeVar = scopes.scopes[0];
  p.log(await p.dap.variables({variablesReference: scopeVar.variablesReference}), `scope before: `);
  p.log(await p.dap.setVariable({variablesReference: scopeVar.variablesReference, name: 'y', value: `'foo'`}), 'setVariable: ');
  p.log(await p.dap.variables({variablesReference: scopeVar.variablesReference}), 'scope after: ');
}

export default async function runTests() {
  await test.runTest(listScopes);
  await test.runTest(setScopeVariable);
}
