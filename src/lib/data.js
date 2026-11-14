import {supabase,configured} from './supabase';
const sample=[
{id:1,sensor:'VIIRS',satellite:'NOAA-21',latitude:13.62,longitude:123.19,acq_date:'2026-11-08',frp:16.2,confidence:'h',daynight:'D'},
{id:2,sensor:'MODIS',satellite:'Aqua',latitude:10.32,longitude:123.89,acq_date:'2026-11-07',frp:12.1,confidence:'75',daynight:'D'},
{id:3,sensor:'VIIRS',satellite:'Suomi NPP',latitude:7.19,longitude:125.45,acq_date:'2026-11-06',frp:24,confidence:'n',daynight:'N'},
{id:4,sensor:'MODIS',satellite:'Terra',latitude:16.40,longitude:120.60,acq_date:'2026-11-05',frp:9.4,confidence:'60',daynight:'D'},
{id:5,sensor:'VIIRS',satellite:'NOAA-20',latitude:11.24,longitude:125.00,acq_date:'2026-11-04',frp:8.7,confidence:'h',daynight:'N'}];
export async function loadSummary(start,end,sensor){
 if(!configured) return {records:sample.filter(r=>(!start||r.acq_date>=start)&&(!end||r.acq_date<=end)&&(!sensor||r.sensor===sensor)),count:sample.length,demo:true};
 let q=supabase.from('fire_observations').select('id,sensor,satellite,latitude,longitude,acq_date,acq_time,frp,confidence,daynight,source_file',{count:'exact'}).order('acq_date',{ascending:false}).limit(1500);
 if(start)q=q.gte('acq_date',start);if(end)q=q.lte('acq_date',end);if(sensor)q=q.eq('sensor',sensor);
 const {data,error,count}=await q;if(error)throw error;return {records:data||[],count:count||0,demo:false};
}
export async function loadCalendar(start,end,sensor){
 if(!configured){const out={};sample.filter(r=>(!start||r.acq_date>=start)&&(!end||r.acq_date<=end)&&(!sensor||r.sensor===sensor)).forEach(r=>out[r.acq_date]=(out[r.acq_date]||0)+1);return out;}
 const {data,error}=await supabase.rpc('daily_fire_counts',{date_from:start,date_to:end,sensor_filter:sensor||null});if(error)throw error;
 return Object.fromEntries((data||[]).map(r=>[r.day,Number(r.observations)]));
}
