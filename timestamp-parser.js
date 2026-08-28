// ASMRTube timestamp parser v1.6
// Parses collapsed YouTube comments and only creates groups when the following timestamp is a child entry.
(function(){
  function cleanText(value){
    return String(value||'')
      .replace(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g,'$1')
      .replace(/https?:\/\/\S+/g,'')
      .replace(/^[>・•●○■□★☆◆◇\-*#｜|:：\s]+/,'')
      .replace(/[｜|\s]+$/,'')
      .replace(/[ \t\u3000]+/g,' ')
      .trim();
  }

  function cleanHeading(value){
    const s=cleanText(value).replace(/[：:]$/,'').trim();
    if(!s||s.length>32)return '';
    if(/タイムスタンプ|timestamp|チャプター|chapter|コメント|comment/i.test(s))return '';
    if(/^[\d\s👍❤♥♡]+$/.test(s))return '';
    if(/[。！？!?]$/.test(s))return '';
    return s;
  }

  function isChildLabel(label){
    const s=cleanText(label);
    if(!s||s.length>14)return false;
    return /^(右|左|右耳|左耳|両耳|両方|左右|交互|R|L|right|left|開始|start|前半|後半|奥|手前|浅め|深め|高速|低速|強め|弱め|片耳|両側|正面|真横)$/i.test(s);
  }

  function timestampTags(label,group=''){
    const source=`${group} ${label}`.trim();
    const tags=[];
    const add=t=>{if(!tags.includes(t))tags.push(t)};
    const rules=[
      [/耳かき|耳掻き/,'耳かき'],[/綿棒/,'綿棒'],[/指耳かき/,'指耳かき'],[/梵天/,'梵天'],[/囁|ささやき/,'囁き'],[/吐息/,'吐息'],[/耳ふ[ーぅう]|耳吹/,'耳ふー'],
      [/オノマトペ/,'オノマトペ'],[/タッピング/,'タッピング'],[/マッサージ/,'マッサージ'],[/添い寝/,'添い寝'],[/睡眠/,'睡眠'],
      [/(^|[\s　・／/])右(?:耳)?($|[\s　・／/])/,'右耳'],[/(^|[\s　・／/])左(?:耳)?($|[\s　・／/])/,'左耳'],[/両耳|両方|両側/,'両耳'],[/交互/,'交互']
    ];
    rules.forEach(([re,tag])=>{if(re.test(source))add(tag)});
    return tags;
  }

  function findTimestampTokens(text){
    const source=String(text||'');
    const re=/\[(\d{1,2}:\d{2}(?::\d{2})?)\]\([^)]+\)|(\d{1,2}:\d{2}(?::\d{2})?)/g;
    const tokens=[];
    let m;
    while((m=re.exec(source))){
      const token=m[1]||m[2];
      if(token)tokens.push({token,start:m.index,end:re.lastIndex});
    }
    return tokens;
  }

  function splitSegment(segment){
    return String(segment||'')
      .replace(/\r/g,'')
      .replace(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g,'$1')
      .split(/\n+|[ \t\u3000]{2,}/)
      .map(cleanText)
      .filter(Boolean);
  }

  function prefixHeading(prefix){
    const pieces=splitSegment(prefix);
    if(!pieces.length)return '';
    return cleanHeading(pieces[pieces.length-1]);
  }

  window.parseTimestampText=function(text){
    const source=String(text||'');
    const tokens=findTimestampTokens(source);
    if(!tokens.length)return [];

    // First pass: determine each timestamp's own label and the possible heading after it.
    const entries=tokens.map((token,i)=>{
      const next=tokens[i+1];
      const segment=source.slice(token.end,next?next.start:source.length);
      const pieces=splitSegment(segment);
      const label=cleanText(pieces[0]||'')||'タイムスタンプ';
      const candidate=pieces.length>=2?cleanHeading(pieces[pieces.length-1]):'';
      return {
        token:token.token,
        label,
        candidate: candidate&&!isChildLabel(candidate)?candidate:''
      };
    });

    const out=[];
    let activeGroup='';
    const firstPrefix=prefixHeading(source.slice(0,tokens[0].start));
    if(firstPrefix&&isChildLabel(entries[0]?.label))activeGroup=firstPrefix;

    for(let i=0;i<entries.length;i++){
      const entry=entries[i];
      const time=window.parseTime?window.parseTime(entry.token):null;
      if(time==null)continue;

      const child=isChildLabel(entry.label);
      const rowGroup=activeGroup&&child?activeGroup:'';
      out.push({time,label:entry.label,group:rowGroup,tags:timestampTags(entry.label,rowGroup)});

      const nextEntry=entries[i+1];
      const nextIsChild=!!nextEntry&&isChildLabel(nextEntry.label);

      // A trailing phrase becomes a heading only when the NEXT timestamp is a child row.
      // Example: "7:13 喋りながらの移動  綿棒 [10:48] 右" -> 綿棒 group.
      if(entry.candidate&&nextIsChild){
        activeGroup=entry.candidate;
      }else if(rowGroup&&nextIsChild){
        // Continue the same group only across consecutive child rows.
      }else{
        activeGroup='';
      }
    }

    return out
      .filter((v,i,a)=>a.findIndex(z=>z.time===v.time&&z.label===v.label&&z.group===v.group)===i)
      .sort((a,b)=>a.time-b.time);
  };

  window.guessTags=function(label,group=''){return timestampTags(String(label||''),String(group||''))};
})();

(function loadAsmrtubeEnhancements(){
  const scripts=[
    ['timestamp-ui.js?v=1.6','asmrTimestampUi'],
    ['ui-enhancements.js?v=1.5','asmrProductUi']
  ];
  for(const [src,key] of scripts){
    if(document.querySelector(`script[data-${key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}]`))continue;
    const script=document.createElement('script');
    script.src=src;
    script.dataset[key]='1';
    document.head.appendChild(script);
  }
})();
