// ASMRTube timestamp parser v1.4
// Preserves section headings as groups instead of flattening them into every label.
(function(){
  function cleanHeading(line){
    let s=String(line||'').trim();
    s=s.replace(/^[>・•●○■□★☆◆◇\-*#\s]+/,'').replace(/[：:]\s*$/,'').trim();
    if(!s||s.length>32)return '';
    if(/https?:\/\/|www\.|youtu(?:\.be|be\.com)|タイムスタンプ|timestamp|チャプター|chapter|コメント|comment/i.test(s))return '';
    if(/^[\d\s👍❤♥♡]+$/.test(s))return '';
    if(/[。！？!?]$/.test(s))return '';
    return s;
  }

  function parseTimestampLine(line){
    const markdown=line.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\([^)]+\)\s*(.*)$/);
    if(markdown)return {token:markdown[1],label:(markdown[2]||'').trim()};

    const plain=line.match(/(?:^|\s)(\d{1,2}:\d{2}(?::\d{2})?)(?:\s+|[-–—｜|:：]\s*)?(.*)$/);
    if(plain)return {token:plain[1],label:(plain[2]||'').trim()};
    return null;
  }

  function isChildLabel(label){
    const s=String(label||'').trim();
    if(!s)return false;
    if(s.length>14)return false;
    return /^(右|左|右耳|左耳|両耳|両方|左右|交互|R|L|right|left|開始|start|前半|後半|奥|手前|浅め|深め|高速|低速|強め|弱め|片耳|両側)$/i.test(s);
  }

  function timestampTags(label,group=''){
    const source=`${group} ${label}`.trim();
    const tags=[];
    const add=t=>{if(!tags.includes(t))tags.push(t)};
    const rules=[
      [/耳かき/,'耳かき'],[/梵天/,'梵天'],[/囁/,'囁き'],[/吐息/,'吐息'],[/耳ふ[ーぅう]|耳吹/,'耳ふー'],
      [/オノマトペ/,'オノマトペ'],[/タッピング/,'タッピング'],[/マッサージ/,'マッサージ'],[/添い寝/,'添い寝'],[/睡眠/,'睡眠'],
      [/(^|[\s　・／/])右(?:耳)?($|[\s　・／/])/,'右耳'],[/(^|[\s　・／/])左(?:耳)?($|[\s　・／/])/,'左耳'],[/両耳|両方|両側/,'両耳'],[/交互/,'交互']
    ];
    rules.forEach(([re,tag])=>{if(re.test(source))add(tag)});
    return tags;
  }

  window.parseTimestampText=function(text){
    const rawLines=String(text||'').split(/\r?\n/);
    const lines=rawLines.map(s=>s.trim());
    const out=[];
    let group='';

    for(let i=0;i<lines.length;i++){
      const line=lines[i];
      if(!line)continue;

      const parsed=parseTimestampLine(line);
      if(!parsed){
        const candidate=cleanHeading(line);
        if(!candidate)continue;

        // A short non-timestamp line immediately before a timestamp is treated as a section heading.
        let nextMeaningful='';
        for(let j=i+1;j<lines.length;j++){
          if(lines[j]){nextMeaningful=lines[j];break}
        }
        if(nextMeaningful&&parseTimestampLine(nextMeaningful))group=candidate;
        continue;
      }

      const time=window.parseTime?window.parseTime(parsed.token):null;
      if(time==null)continue;

      let label=parsed.label.replace(/^[-–—｜|:：]+\s*/,'').trim();

      // Some clipboard formats split "4:46 右" into two lines: "4:46" then "右".
      if(!label){
        let nextIndex=-1;
        for(let j=i+1;j<lines.length;j++){
          if(lines[j]){nextIndex=j;break}
        }
        if(nextIndex>=0&&!parseTimestampLine(lines[nextIndex])&&isChildLabel(lines[nextIndex])){
          label=lines[nextIndex];
          i=nextIndex;
        }
      }

      if(!label)label='タイムスタンプ';
      const rowGroup=group&&isChildLabel(label)?group:'';
      out.push({time,label,group:rowGroup,tags:timestampTags(label,rowGroup)});
    }

    return out
      .filter((v,i,a)=>a.findIndex(z=>z.time===v.time&&z.label===v.label&&z.group===v.group)===i)
      .sort((a,b)=>a.time-b.time);
  };

  window.guessTags=function(label,group=''){return timestampTags(String(label||''),String(group||''))};
})();
