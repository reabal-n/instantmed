do $test$
declare initial jsonb; browser jsonb; changed jsonb; cache jsonb;
begin
 if not has_function_privilege('service_role','public.append_monitor_state(text,bigint,jsonb)','EXECUTE')
 or has_function_privilege('anon','public.append_monitor_state(text,bigint,jsonb)','EXECUTE')
 or has_function_privilege('authenticated','public.append_monitor_state(text,bigint,jsonb)','EXECUTE')
 or has_table_privilege('service_role','public.operational_metrics','UPDATE') then raise exception 'monitor ACL drift'; end if;
 if (select count(*) from public.operational_metrics where metric_name in ('browser_observer_state','business_incident_state')) <> 2 then raise exception 'seed not idempotent'; end if;
 select dimensions into initial from public.operational_metrics where metric_name='business_incident_state';
 begin
 perform public.append_monitor_state('other',1,initial || '{"checkedAt":1}');
 raise exception 'bad key accepted'; exception when others then if sqlerrm='bad key accepted' then raise; end if; end;
 begin
 perform public.append_monitor_state('business_incident_state',1,initial || '{"checkedAt":1,"patient":"example"}');
 raise exception 'text accepted'; exception when others then if sqlerrm='text accepted' then raise; end if; end;
 begin
 perform public.append_monitor_state('business_incident_state',1,initial || '{"checkedAt":9007199254740991}');
 raise exception 'future observation accepted'; exception when others then if sqlerrm='future observation accepted' then raise; end if; end;
 begin
 perform public.append_monitor_state('business_incident_state',1,initial || '{"checkedAt":1,"enabledAt":1}');
 raise exception 'grace reset accepted'; exception when others then if sqlerrm='grace reset accepted' then raise; end if; end;
 select dimensions into browser from public.operational_metrics where metric_name='browser_observer_state';
 browser := browser || '{"checkedAt":100,"latest":{"id":2,"number":2,"attempt":1,"created":10,"started":20,"completed":30,"outcome":2,"status":2},"cache":[{"id":2,"number":2,"attempt":1,"created":10,"started":20,"completed":30,"outcome":2,"status":2}]}'::jsonb;
 if not public.append_monitor_state('browser_observer_state',1,browser) then raise exception 'browser seed claim failed'; end if;
 changed := jsonb_set(browser || '{"checkedAt":101}', '{latest,number}', '1');
 begin perform public.append_monitor_state('browser_observer_state',2,changed);
 raise exception 'source regression accepted'; exception when others then if sqlerrm='source regression accepted' then raise; end if; end;
 changed := jsonb_set(browser || '{"checkedAt":101}', '{cache,0,outcome}', '1');
 begin perform public.append_monitor_state('browser_observer_state',2,changed);
 raise exception 'immutable cache change accepted'; exception when others then if sqlerrm='immutable cache change accepted' then raise; end if; end;
 -- Full-cache partial polling must trim before persistence, even when a later
 -- provider read fails. SQL must reject the old overflow, then retain the
 -- completed read and bounded backoff together in a valid append.
 select jsonb_agg(jsonb_build_object('event',0,'id',n,'number',n,'attempt',1,
   'created',10,'started',20,'completed',30,'outcome',1,'status',2) order by n desc)
 into cache from generate_series(3,13) n;
 changed := browser || jsonb_build_object('checkedAt',101,'cache',cache,
   'latest',cache->0,'success',cache->0,'completedAt',30,
   'backoffUntil',floor(extract(epoch from clock_timestamp()) * 1000) + 1200000,
   'observerOk',false);
 begin perform public.append_monitor_state('browser_observer_state',2,changed);
 raise exception 'cache overflow accepted'; exception when others then if sqlerrm <> 'invalid browser snapshot' then raise; end if; end;
 changed := jsonb_set(changed,'{cache}',cache - 10);
 if not public.append_monitor_state('browser_observer_state',2,changed) then raise exception 'partial evidence/backoff claim failed'; end if;
 select dimensions into browser from public.operational_metrics where metric_name='browser_observer_state' order by metric_value desc limit 1;
 if jsonb_array_length(browser->'cache') <> 10 or browser->'latest'->>'number' <> '13'
   or (browser->>'backoffUntil')::numeric <= floor(extract(epoch from clock_timestamp()) * 1000)
   or browser->>'observerOk' <> 'false' then raise exception 'partial evidence/backoff not durable'; end if;
end;
$test$;
