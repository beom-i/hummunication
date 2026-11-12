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
for (const file of readdirSync('supabase/migrations').filter(f => f.includes('weekly_content')).sort()) sql(readFileSync('supabase/migrations/' + file, 'utf8'), false);
const id = sql(`select public.save_sermon(null,null,${json(sermon)})`);
const saved = JSON.parse(sql(`select public.get_sermon('${id}')`));
assert.equal(saved.bible, '사사기 7:1-8');
assert.deepEqual(saved.content, doc);
console.log('PASS: save/get preserves bible, rich text and empty paragraphs');

sql(`select public.delete_sermon('${id}',1)`);
assert.throws(() => sql(`select public.get_sermon('${id}')`), /Not found/);
console.log('PASS: deleted sermon is unavailable through the public read interface');

const family = { groups: [{ name: '예시 순', photoId: null, photoEdit: null, leader: { name: '순장 예시', answer: '함께 걷습니다' }, members: [{ name: '순원 예시', answer: '' }] }] };
const createWeekly = (date = '2035-01-07') => sql(`select public.save_weekly(null,null,'${date}',array['sermon','family'],${json({id:null,version:null,values:sermon})},${json({id:null,version:null,values:family})})`);
const weeklyId = createWeekly();
const weekly = JSON.parse(sql(`select public.get_weekly('2035-01-07')`));
assert.equal(weekly.id, weeklyId);
assert.equal(weekly.sermon.bible, '사사기 7:1-8');
assert.equal(weekly.family.groups[0].leader.answer, '함께 걷습니다');
assert.throws(() => sql(`select public.delete_sermon('${weekly.sermon.id}',1)`), /Still referenced/);
console.log('PASS: weekly connects original content and protects referenced sermons');

const updateInput = { id: weekly.sermon.id, version: weekly.sermon.version, values: { ...sermon, bible: '수정되지 않아야 하는 구절' } };
assert.throws(() => sql(`select public.save_weekly('${weeklyId}',1,'2035-01-07',array['sermon','family'],${json(updateInput)},${json({ id: weekly.family.id, version: 999, values: family })})`), /Version conflict/);
assert.equal(JSON.parse(sql(`select public.get_sermon('${weekly.sermon.id}')`)).bible, '사사기 7:1-8');
console.log('PASS: a family version conflict rolls back the sermon update in the same weekly transaction');
sql(`select public.save_sermon('${weekly.sermon.id}',1,${json({ ...sermon, title: '변경된 제목' })})`);
assert.throws(() => sql(`select public.save_sermon('${weekly.sermon.id}',1,${json(sermon)})`), /Version conflict/);
assert.throws(() => sql(`select public.save_sermon(null,null,${json(sermon)})`, false), /Authentication required/);
assert.throws(() => sql(`insert into public.sermon(speaker) values ('허용되지 않은 직접 쓰기')`), /permission denied/);
assert.throws(() => sql(`select public.save_sermon(null,null,${json({ ...sermon, content: { type: 'doc', content: [{ type: 'iframe' }] } })})`), /Invalid sermon/);
sql(`select public.delete_weekly('${weeklyId}',1)`);
assert.throws(() => sql(`select public.get_weekly('2035-01-07')`), /Not found/);
assert.equal(JSON.parse(sql(`select public.get_sermon('${weekly.sermon.id}')`)).title, '변경된 제목');
assert.throws(() => sql(`select public.delete_sermon('${weekly.sermon.id}',2)`), /Still referenced/);
const replacement = createWeekly();
assert.notEqual(replacement, weeklyId);
console.log('PASS: stale saves, unauthenticated writes and direct DML are blocked; deleting a weekly preserves originals and frees its date');

assert.throws(() => sql(`select public.save_sermon(null,null,${json({ ...sermon, content: { content: doc.content } })})`), /Invalid sermon/);
console.log('PASS: direct RPC cannot bypass the document node whitelist');

const people = [
  { personId: null, name: '파송자 예시 A', generation: '007', group: '예시 A 순', date: '2035-02-04', prayer: '함께 기도합니다\n둘째 줄' },
  { personId: null, name: '파송자 예시 B', generation: '12', group: '예시 B 순', date: '', prayer: '' },
];
const senderWeeklyId = sql(`select public.save_weekly(null,null,'2035-02-04',array['senders'],null,null,${json({ id:null,version:null,values:{people} })})`);
const senderWeekly = JSON.parse(sql(`select public.get_weekly('2035-02-04')`));
assert.equal(senderWeekly.id, senderWeeklyId);
assert.equal(senderWeekly.sender.people[0].generation, '007');
assert.equal(senderWeekly.sender.people[0].group, '예시 A 순');
assert.equal(senderWeekly.sender.people[0].date, '2035-02-04');
assert.equal(senderWeekly.sender.people[0].prayer, '함께 기도합니다\n둘째 줄');
assert.equal(senderWeekly.sender.people[1].date, null);
assert.ok(senderWeekly.sender.people.every(person => person.personId));
console.log('PASS: weekly saves each sender with a stable identity and all five input fields');

const senderId = senderWeekly.sender.id;
const originalPeople = senderWeekly.sender.people.map(p => ({ ...p, date: p.date ?? '' }));
sql(`select public.save_sender('${senderId}',1,${json({people:[originalPeople[1],originalPeople[0]]})})`);
assert.deepEqual(JSON.parse(sql(`select public.get_sender('${senderId}')`)).people.map(p => p.personId), [originalPeople[1].personId,originalPeople[0].personId]);
sql(`select public.save_sender('${senderId}',2,${json({people:[originalPeople[0]]})})`);
assert.equal(JSON.parse(sql(`select public.get_sender('${senderId}')`)).people.length, 1);
assert.throws(() => sql(`select public.save_sender('${senderId}',3,${json({people:originalPeople})})`), /Sender person is unavailable/);
assert.throws(() => sql(`select public.save_sender('${senderId}',1,${json({people:[]})})`), /Version conflict/);
assert.throws(() => sql(`select public.delete_sender('${senderId}',3)`), /Still referenced/);
assert.throws(() => sql(`insert into public.sender_person(sender_id,position) values('${senderId}',1)`), /permission denied/);
const independentSender = sql(`select public.save_sender(null,null,${json({people})})`);
sql(`select public.delete_sender('${independentSender}',1)`);
assert.throws(() => sql(`select public.get_sender('${independentSender}')`), /Not found/);
console.log('PASS: reordering retains identities; removed people cannot be revived; soft delete and version checks protect senders');

const filePath = '00000000-0000-4000-8000-000000000001/thumbnail-example.png';
sql(`insert into storage.objects(bucket_id,name,metadata) values('uploads','${filePath}','{"size":128,"mimetype":"image/png"}')`,false);
const thumbnailId = sql(`select public.register_file('${filePath}')`);
const thumbnailSermonId = sql(`select public.save_sermon(null,null,${json({...sermon,thumbnailId})})`);
assert.equal(JSON.parse(sql(`select public.get_sermon('${thumbnailSermonId}')`)).thumbnail_id,thumbnailId);
assert.throws(() => sql(`select public.delete_file('${thumbnailId}')`), /Still referenced/);
sql(`select public.delete_sermon('${thumbnailSermonId}',1)`);
assert.throws(() => sql(`select public.delete_file('${thumbnailId}')`), /Still referenced/);
console.log('PASS: sermon thumbnails use registered files and remain protected after sermon soft deletion');

assert.throws(() => sql(`select public.save_weekly('${senderWeeklyId}',1,'2035-02-04',array['senders'],${json({id:null,version:null,values:sermon})},null,${json({id:senderId,version:1,values:{people:[originalPeople[0]]}})})`), /Version conflict/);
assert.equal(JSON.parse(sql(`select public.get_weekly('2035-02-04')`)).sermon,null);
sql(`select public.save_weekly('${senderWeeklyId}',1,'2035-02-04',array['sermon','senders'],${json({id:null,version:null,values:{...sermon,thumbnailId}})},null,${json({id:senderId,version:3,values:{people:[{...originalPeople[0],prayer:'변경된 기도제목'}]}})})`);
const updatedSenderWeekly = JSON.parse(sql(`select public.get_weekly('2035-02-04')`));
assert.equal(updatedSenderWeekly.version,2);
assert.equal(updatedSenderWeekly.sender.version,4);
assert.equal(updatedSenderWeekly.sender.people[0].personId,originalPeople[0].personId);
assert.equal(updatedSenderWeekly.sender.people[0].prayer,'변경된 기도제목');
assert.equal(updatedSenderWeekly.sermon.thumbnail_id,thumbnailId);
assert.throws(() => sql(`select public.get_sender('${senderId}')`,false), /Authentication required/);
assert.throws(() => sql(`select public.save_sender(null,null,${json({people:[{...people[0],generation:'abc'}]})})`), /Invalid sender person/);
assert.throws(() => sql(`select public.save_sender(null,null,${json({people:[{...people[0],prayer:'x'.repeat(3001)}]})})`), /Invalid sender person/);
sql(`select public.delete_weekly('${senderWeeklyId}',2)`);
assert.throws(() => sql(`select public.delete_sender('${senderId}',4)`), /Still referenced/);
assert.equal(JSON.parse(sql(`select public.get_sender('${senderId}')`)).people[0].prayer,'변경된 기도제목');
console.log('PASS: sender conflicts roll back the full weekly; successful saves retain IDs and thumbnails; deleted weekly keeps its originals');
