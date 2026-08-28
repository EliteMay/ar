// ASMRTube timestamp parser v1.3
// Keeps short section headings such as "耳ふー" when following timestamp rows are only "右 / 左".
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

    const plain=line.match(/(?:^|\s)(\d{1,2}:\d{2}(?::\d{2})?)(?:\s+|[-–—｜|:：]\s*)(.*)$/);
    if(plain)return {token:plain[1],label:(plain[2]||'').trim()};
    return null;
  }

  function shouldUseHeading(heading,label){
    if(!heading)return false;
    const h=heading.replace(/\s+/g,'').toLowerCase();
    const l=label.replace(/\s+/g,'').toLowerCase();
    if(l.includes(h))return false;
    if(!label||label==='タイムスタンプ')return true;
    if(/^(右|左|両耳|両方|左右|交互|右耳|左耳|r|l|right|left|開始|start|前半|後半)$/i.test(label))return true;
    return label.length<=10;
  }

  function timestampTags(label){
    const tags=[];
    const add=t=>{if(!tags.includes(t))tags.push(t)};
    const rules=[
      [/耳かき/,'耳かき'],[/梵天/,'梵天'],[/囁/,'囁き'],[/吐息/,'吐息'],[/耳ふ[ーぅう]|耳吹/,'耳ふー'],
      [/オノマトペ/,'オノマトペ'],[/タッピング/,'タッピング'],[/マッサージ/,'マッサージ'],[/添い寝/,'添い寝'],[/睡眠/,'睡眠'],
      [/(^|[\s　・／/])右(?:耳)?($|[\s　・／/])/,'右耳'],[/(^|[\s　・／/])左(?:耳)?($|[\s　・／/])/,'左耳'],[/両耳|両方/,'両耳'],[/交互/,'交互']
    ];
    rules.forEach(([re,tag])=>{if(re.test(label))add(tag)});
    return tags;
  }

  window.parseTimestampText=function(text){
    const out=[];
    let heading='';

    for(const raw of String(text||'').split(/\r?\n/)){
      const line=raw.trim();
      if(!line)continue;

      const parsed=parseTimestampLine(line);
      if(!parsed){
        const candidate=cleanHeading(line);
        if(candidate)heading=candidate;
        continue;
      }

      const time=window.parseTime?window.parseTime(parsed.token):null;
      if(time==null)continue;

      let label=parsed.label.replace(/^[-–—｜|:：]+\s*/,'').trim();
      if(shouldUseHeading(heading,label))label=`${heading}${label?` ${label}`:''}`.trim();
      if(!label)label=heading||'タイムスタンプ';

      out.push({time,label,tags:timestampTags(label)});
    }

    return out
      .filter((v,i,a)=>a.findIndex(z=>z.time===v.time&&z.label===v.label)===i)
      .sort((a,b)=>a.time-b.time);
  };

  // Keep manual edits in the preview consistent with the improved tag detection.
  window.guessTags=function(label){return timestampTags(String(label||''))};
})();
