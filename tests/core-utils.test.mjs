import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const sandbox={window:{},URL,Date,Math};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'core-utils.js'),'utf8'),sandbox,{filename:'core-utils.js'});
const core=sandbox.window.ASMRTubeCore;
assert.ok(core,'ASMRTubeCore must exist');
const id='abcdefghijk';
for(const url of [
  `https://www.youtube.com/watch?v=${id}`,
  `https://youtu.be/${id}`,
  `https://youtube.com/shorts/${id}`,
  `https://m.youtube.com/live/${id}`,
  `https://www.youtube-nocookie.com/embed/${id}`
])assert.equal(core.youtubeVideoId(url),id,url);
for(const url of [
  `https://youtube.com.evil.example/watch?v=${id}`,
  `https://notyoutube.com/watch?v=${id}`,
  'javascript:alert(1)',
  'https://youtube.com/watch?v=short'
])assert.equal(core.youtubeVideoId(url),null,url);

let seq=0;const makeId=()=>`safe-${++seq}`;
const malicious='x" onclick="alert(1)';
const prepared=core.prepareImportedData({
  library:[
    {id:malicious,url:`https://youtube.com/watch?v=${id}`,title:' Safe title ',creator:'Creator',evil:'<img onerror=alert(1)>',timestamps:[{time:12,label:'Ear',tags:['耳かき']}]},
    {id:'duplicate',videoId:id,title:'Duplicate'},
    {id:'bad',videoId:'bad',title:'Bad'}
  ],
  playlists:[{id:'p1',name:'P',items:[malicious]}],
  recent:[malicious]
},{makeId});
assert.equal(prepared.library.length,1);
assert.equal(prepared.invalid,1);
assert.equal(prepared.duplicates,1);
assert.equal(prepared.library[0].id,'safe-1');
assert.equal(prepared.library[0].url,`https://www.youtube.com/watch?v=${id}`);
assert.equal('evil' in prepared.library[0],false,'unknown imported fields must not survive');
assert.deepEqual([...prepared.playlists[0].items],['safe-1']);
assert.deepEqual([...prepared.recent],['safe-1']);
assert.equal(prepared.library[0].timestamps[0].time,12);
console.log('Core utility tests passed');
