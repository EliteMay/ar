import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const sandbox={window:{},URL,console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'timestamp-parser.js'),'utf8'),sandbox,{filename:'timestamp-parser.js'});
const parse=sandbox.window.ASMRTubeTimestampParser?.parse;
assert.equal(typeof parse,'function','canonical parser must expose ASMRTubeTimestampParser.parse');
const cases=JSON.parse(fs.readFileSync(path.join(here,'timestamp-cases.json'),'utf8'));
const partial=(actual,expected)=>Object.entries(expected).every(([key,value])=>actual?.[key]===value);
for(const test of cases){
  const actual=parse(test.input);
  assert.equal(actual.length,test.expected.length,`${test.name}: row count`);
  test.expected.forEach((expected,index)=>assert.ok(partial(actual[index],expected),`${test.name}: row ${index+1}\nactual=${JSON.stringify(actual[index])}\nexpected=${JSON.stringify(expected)}`));
}
console.log(`Timestamp parser tests passed: ${cases.length}/${cases.length}`);
