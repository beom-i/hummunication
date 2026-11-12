import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';

// This suite only targets the disposable local database, never the linked project.
const target = process.env.HUMMUNICATION_TEST_DATABASE_URL ?? 'postgresql://127.0.0.1:55439/hummunication_test';
const address = new URL(target);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname) && address.pathname === '/hummunication_test' && !address.password, 'Tests only support a disposable local database');
function sql(source, asUser = true) {
  const query = asUser ? `begin; set local role authenticated; set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001'; ${source}; commit;` : source;
  const out = spawnSync('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '--dbname', target], { input: query, encoding: 'utf8' });
  if (out.status !== 0) throw new Error(out.stderr.trim());
  return out.stdout.trim();
}
const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '첫 줄', marks: [{ type: 'bold' }, { type: 'textStyle', attrs: { color: '#15803D', fontSize: '20px' } }] }] }, { type: 'paragraph', content: [] }] };
const sermon = { date: '2035-01-07', speaker: '설교자 예시', title: '설교 제목 예시', bible: '사사기 7:1-8', content: doc };
const json = value => "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
sql('drop schema public cascade; drop schema if exists private cascade; create schema public; grant usage on schema public to authenticated, anon;', false);
const familyMigration = '20261112120000_weekly_content_families.sql';
const migrations = readdirSync('supabase/migrations').filter(f => f.includes('weekly_content') && f !== familyMigration).sort();
const latest = migrations.pop();
assert.equal(latest, '20261112110000_weekly_content_simplify.sql');
for (const file of migrations) sql(readFileSync('supabase/migrations/' + file, 'utf8'), false);
const people = [
  { name: '파송자 예시 A', generation: '007', group: '예시 A 순', date: '2035-02-04', prayer: '함께 기도합니다\n둘째 줄' },
  { name: '파송자 예시 B', generation: '12', group: '예시 B 순', date: '', prayer: '' },
];
// Seed through the previously deployed API to verify the data transition.
const legacyId = sql(`select public.save_weekly(null,null,'2035-04-01',array['senders'],null,null,${json({id:null,version:null,values:{people}})})`);
const legacy = JSON.parse(sql(`select public.get_weekly('2035-04-01')`));
const orphan = sql(`select public.save_sender(null,null,${json({people:[people[0]]})})`);
const orphanPerson = JSON.parse(sql(`select public.get_sender('${orphan}')`)).people[0].personId;
sql(readFileSync('supabase/migrations/' + latest, 'utf8'), false);
const migrated = JSON.parse(sql(`select public.get_weekly('2035-04-01')`));
assert.equal(migrated.id,legacyId);
assert.equal(migrated.senders[0].id,legacy.sender.people[0].personId);
assert.equal(migrated.senders[0].generation,'007');
assert.equal(migrated.senders[0].group,'예시 A 순');
assert.equal(migrated.senders[0].prayer,'함께 기도합니다\n둘째 줄');
assert.equal(JSON.parse(sql(`select public.get_sender('${orphanPerson}')`)).weeklyId,null);
assert.equal('version' in migrated,false);
console.log('PASS: migration retains existing people, IDs and standalone content');

const id = sql(`select public.save_sermon(null,${json(sermon)})`);
const saved = JSON.parse(sql(`select public.get_sermon('${id}')`));
assert.equal(saved.bible, '사사기 7:1-8');
assert.deepEqual(saved.content, doc);
assert.equal('version' in saved,false);
sql(`select public.save_sermon('${id}',${json({...sermon,title:'첫 저장'})})`);
sql(`select public.save_sermon('${id}',${json({...sermon,title:'마지막 저장'})})`);
assert.equal(JSON.parse(sql(`select public.get_sermon('${id}')`)).title,'마지막 저장');
sql(`select public.delete_sermon('${id}')`);
assert.throws(() => sql(`select public.get_sermon('${id}')`), /Not found/);
console.log('PASS: save/read preserves rich text; last save wins; deletion remains soft');

const family = { groups: [{ name: '예시 순', photoId: null, photoEdit: null, leader: { name: '순장 예시', answer: '함께 걷습니다' }, members: [{ name: '순원 예시', answer: '' }] }] };
const createWeekly = (date = '2035-01-07',senders=[]) => sql(`select public.save_weekly(null,'${date}',array['sermon','family','senders'],${json({id:null,values:sermon})},${json({id:null,values:family})},${json(senders)})`);
const weeklyId = createWeekly('2035-01-07',people);
const weekly = JSON.parse(sql(`select public.get_weekly('2035-01-07')`));
assert.equal(weekly.id,weeklyId);
assert.equal(weekly.sermon.bible,'사사기 7:1-8');
assert.equal(weekly.family.groups[0].leader.answer,'함께 걷습니다');
assert.equal(weekly.senders[0].date,'2035-02-04');
assert.equal(weekly.senders[1].date,null);
assert.throws(() => sql(`select public.delete_sermon('${weekly.sermon.id}')`), /Still referenced/);
const updateInput = {id:weekly.sermon.id,values:{...sermon,bible:'롤백되어야 하는 값'}};
assert.throws(() => sql(`select public.save_weekly('${weeklyId}','2035-01-07',array['sermon'],${json(updateInput)},${json({id:'00000000-0000-4000-8000-000000000999',values:family})},'[]')`), /Not found/);
assert.equal(JSON.parse(sql(`select public.get_sermon('${weekly.sermon.id}')`)).bible,'사사기 7:1-8');
console.log('PASS: weekly connects originals; a child save failure rolls back the whole transaction');

const originals = weekly.senders.map(p=>({...p,date:p.date??''}));
const savePeople = rows => sql(`select public.save_weekly('${weeklyId}','2035-01-07',array['senders'],${json({id:weekly.sermon.id,values:sermon})},${json({id:weekly.family.id,values:family})},${json(rows)})`);
savePeople([originals[1],originals[0]]);
assert.deepEqual(JSON.parse(sql(`select public.get_weekly('2035-01-07')`)).senders.map(p=>p.id),[originals[1].id,originals[0].id]);
savePeople([originals[0]]);
assert.throws(()=>sql(`select public.get_sender('${originals[1].id}')`), /Not found/);
assert.throws(()=>savePeople(originals), /Sender is unavailable/);
assert.equal(JSON.parse(sql(`select public.get_sender('${originals[0].id}')`)).weeklyId,weeklyId);
assert.throws(()=>createWeekly('2035-01-14',[originals[0]]), /Sender is unavailable/);
assert.throws(()=>savePeople([{...originals[0],generation:'abc'}]), /Invalid sender/);
assert.equal(JSON.parse(sql(`select public.get_weekly('2035-01-07')`)).senders.length,1);
const independentSender = sql(`select public.save_sender(null,${json(people[0])})`);
sql(`select public.save_sender('${independentSender}',${json({...people[0],prayer:'나중에 저장한 기도제목'})})`);
assert.equal(JSON.parse(sql(`select public.get_sender('${independentSender}')`)).prayer,'나중에 저장한 기도제목');
sql(`select public.delete_sender('${independentSender}')`);
assert.throws(()=>sql(`select public.get_sender('${independentSender}')`), /Not found/);
console.log('PASS: sender is one person; reordering retains IDs; removed/foreign people cannot be attached');

assert.throws(()=>sql(`select public.save_sermon(null,${json(sermon)})`,false), /Authentication required/);
assert.throws(()=>sql(`select public.get_sender('${originals[0].id}')`,false), /Authentication required/);
assert.throws(()=>sql(`insert into public.sender(name,position) values('예시',0)`), /permission denied/);
assert.throws(()=>sql(`select public.save_sermon(null,${json({...sermon,content:{type:'doc',content:[{type:'iframe'}]}})})`), /Invalid sermon/);
assert.throws(()=>sql(`select public.save_sender(null,${json({...people[0],prayer:'x'.repeat(3001)})})`), /Invalid sender/);
console.log('PASS: unauthenticated requests, direct DML and invalid rich/sender content are blocked');

const filePath = '00000000-0000-4000-8000-000000000001/thumbnail-example.png';
sql(`insert into storage.objects(bucket_id,name,metadata) values('uploads','${filePath}','{"size":128,"mimetype":"image/png"}') on conflict do nothing`,false);
const thumbnailId = sql(`select public.register_file('${filePath}')`);
const thumbnailSermon = sql(`select public.save_sermon(null,${json({...sermon,thumbnailId})})`);
assert.equal(JSON.parse(sql(`select public.get_sermon('${thumbnailSermon}')`)).thumbnail_id,thumbnailId);
assert.throws(()=>sql(`select public.delete_file('${thumbnailId}')`), /Still referenced/);
sql(`select public.delete_sermon('${thumbnailSermon}')`);
assert.throws(()=>sql(`select public.delete_file('${thumbnailId}')`), /Still referenced/);
sql(`select public.delete_weekly('${weeklyId}')`);
assert.throws(()=>sql(`select public.get_weekly('2035-01-07')`), /Not found/);
assert.equal(JSON.parse(sql(`select public.get_sender('${originals[0].id}')`)).name,'파송자 예시 A');
assert.throws(()=>sql(`select public.delete_sermon('${weekly.sermon.id}')`), /Still referenced/);
assert.notEqual(createWeekly(),weeklyId);
console.log('PASS: thumbnail references and originals survive soft deletion; deleted dates can be reused');

const crop = {rotation:0,sourceWidth:119,sourceHeight:71,crop:{x:0,y:0,width:1,height:1}};
const oldFamilies = {groups:[{...family.groups[0],photoId:thumbnailId,photoEdit:crop},{...family.groups[0],name:'두 번째 예시 순'}]};
sql(`select public.save_weekly(null,'2035-06-03',array['family'],null,${json({id:null,values:oldFamilies})},'[]')`);
const oldFamilyRoot = JSON.parse(sql(`select public.get_weekly('2035-06-03')`)).family.id;
const oldIndependent = sql(`select public.save_family(null,${json(family)})`);
const oldDeleted = sql(`select public.save_family(null,${json(family)})`);
sql(`select public.delete_family('${oldDeleted}')`);
if (readdirSync('supabase/migrations').includes(familyMigration)) sql(readFileSync('supabase/migrations/' + familyMigration,'utf8'),false);
const migratedFamilies = JSON.parse(sql(`select public.get_weekly('2035-06-03')`)).families;
assert.equal(migratedFamilies.length,2);
assert.equal(migratedFamilies[0].id,oldFamilyRoot);
assert.equal(migratedFamilies[0].photo_id,thumbnailId);
assert.deepEqual(migratedFamilies[0].photo_edit,crop);
assert.equal(migratedFamilies[1].name,'두 번째 예시 순');
assert.equal(JSON.parse(sql(`select public.get_family('${oldIndependent}')`)).weekly_id,null);
assert.throws(()=>sql(`select public.get_family('${oldDeleted}')`), /Not found/);
console.log('PASS: family migration preserves multiple groups, photo crop, standalone sources and deleted records');
const families = [{id:null,name:'새가족 예시 순',photo_id:null,photo_edit:null,leader_name:'순장 예시',leader_answer:'함께 걷습니다',members:[{name:'순원 예시',answer:'환영합니다'}]}];
const directSenders = people.map(({group,...p})=>({...p,group_name:group}));
const directWeekly = sql(`select public.save_weekly(p_date=>'2035-05-06',p_sections=>array['family','senders'],p_families=>${json(families)},p_senders=>${json(directSenders)})`);
const direct = JSON.parse(sql(`select public.get_weekly('2035-05-06')`));
assert.equal(direct.id,directWeekly);
assert.equal(direct.families[0].leader_answer,'함께 걷습니다');
assert.deepEqual(direct.families[0].members,[{name:'순원 예시',answer:'환영합니다'}]);
assert.equal(direct.senders[0].group_name,'예시 A 순');
console.log('PASS: weekly reads families and senders with the same flat fields used by the form');

const saveLists = (rows,senders=direct.senders) => sql(`select public.save_weekly(p_id=>'${directWeekly}',p_date=>'2035-05-06',p_sections=>array['family','senders'],p_families=>${json(rows)},p_senders=>${json(senders)})`);
saveLists([direct.families[0],{...families[0],id:null,name:'추가한 순'}]);
const added = JSON.parse(sql(`select public.get_weekly('2035-05-06')`)).families;
saveLists([added[1],added[0]]);
assert.deepEqual(JSON.parse(sql(`select public.get_weekly('2035-05-06')`)).families.map(f=>f.id),[added[1].id,added[0].id]);
assert.throws(()=>saveLists([{...added[0],name:'롤백할 이름'}],[{...direct.senders[0],generation:'bad'}]), /Invalid sender/);
assert.equal(JSON.parse(sql(`select public.get_family('${added[0].id}')`)).name,'새가족 예시 순');
assert.throws(()=>sql(`select public.save_weekly(p_date=>'2035-07-01',p_sections=>array['family'],p_families=>${json([added[0]])})`), /Family is unavailable/);
saveLists([added[0]]);
assert.throws(()=>sql(`select public.get_family('${added[1].id}')`), /Not found/);
assert.throws(()=>saveLists(added), /Family is unavailable/);
assert.throws(()=>sql(`select public.delete_file('${thumbnailId}')`), /Still referenced/);
sql(`select public.delete_weekly('${directWeekly}')`);
assert.equal(JSON.parse(sql(`select public.get_family('${added[0].id}')`)).leader_answer,'함께 걷습니다');
assert.throws(()=>sql(`select public.get_family('${added[0].id}')`,false), /Authentication required/);
assert.throws(()=>sql(`insert into public.family(name) values('예시')`), /permission denied/);
console.log('PASS: family IDs survive reordering; invalid sender rolls back family changes; removal is soft and permissions remain enforced');
