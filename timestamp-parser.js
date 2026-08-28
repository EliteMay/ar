// ASMRTube timestamp parser v1.5
// Parses YouTube comments even when line breaks collapse into one long line.
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
      if(!token)continue;
      tokens.push({token,start:m.index,end:re.lastIndex});
    }
    return tokens;
  }

  function splitSegment(segment){
    let s=String(segment||'')
      .replace(/\r/g,'')
      .replace(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g,'$1');

    const pieces=s
      .split(/\n+|[ \t\u3000]{2,}/)
      .map(cleanText)
      .filter(Boolean);
    return pieces;
  }

  function headingFromPrefix(prefix){
    const pieces=splitSegment(prefix);
    if(!pieces.length)return '';
    return cleanHeading(pieces[pieces.length-1]);
  }

  window.parseTimestampText=function(text){
    const source=String(text||'');
    const tokens=findTimestampTokens(source);
    if(!tokens.length)return [];

    const out=[];
    let group=headingFromPrefix(source.slice(0,tokens[0].start));

    for(let i=0;i<tokens.length;i++){
      const token=tokens[i];
      const next=tokens[i+1];
      const time=window.parseTime?window.parseTime(token.token):null;
      if(time==null)continue;

      const segment=source.slice(token.end,next?next.start:source.length);
      const pieces=splitSegment(segment);
      let label=pieces[0]||'タイムスタンプ';
      label=cleanText(label)||'タイムスタンプ';

      let nextGroup='';
      if(pieces.length>=2){
        const candidate=cleanHeading(pieces[pieces.length-1]);
        if(candidate&&!isChildLabel(candidate))nextGroup=candidate;
      }

      const rowGroup=group&&isChildLabel(label)?group:'';
      out.push({time,label,group:rowGroup,tags:timestampTags(label,rowGroup)});

      if(nextGroup){
        group=nextGroup;
      }else if(rowGroup){
        // Keep current group for the next short child label.
      }else{
        group='';
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
    ['timestamp-ui.js?v=1.5','asmrTimestampUi'],
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
