import assert from 'node:assert/strict';
import { sermonFormSchema } from '../src/features/sermon/schemas.ts';
const result = sermonFormSchema.safeParse({ date: '', speaker: '', title: '', bible: 'x'.repeat(201), content: { type: 'doc', content: [{ type: 'paragraph', content: [] }] } });
assert.equal(result.success, false);
assert.deepEqual(result.error.issues[0].path, ['bible']);
console.log('PASS: sermon input reports the bible field instead of accepting an oversized value');

const { loadSavedBulletins, savedBulletinsKey } = await import('../src/components/bulletins/local-store.ts');
const oldDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '이전 정리 내용' }] }] };
const oldRecord = { id: '2035-01-07', updatedAt: '2035-01-07T00:00:00.000Z', data: {
  date: '2035-01-07', sections: ['sermon'], sermon: { date: '2035-01-07', speaker: '', title: '', passage: '사사기 7:1-8', document: oldDocument },
  groups: [{ name: '', photo: '', leader: { name: '', answer: '' }, members: [] }],
  senders: [{personId:'00000000-0000-4000-8000-000000000015',name:'파송자 예시',generation:'007',group:'예시 순',date:'',prayer:''}],
}};
globalThis.localStorage = { getItem: key => key === savedBulletinsKey ? JSON.stringify([oldRecord]) : null };
const restored = loadSavedBulletins()[0];
assert.equal(restored.data.sermon.bible, '사사기 7:1-8');
assert.deepEqual(restored.data.sermon.content, oldDocument);
assert.equal(restored.data.families[0].photo_id, null);
assert.equal(restored.data.senders[0].id,'00000000-0000-4000-8000-000000000015');
console.log('PASS: old browser records keep their bible, rich content and photo data during migration');

const { saveSermon } = await import('../src/features/sermon/actions.ts');
const rejected = await saveSermon({ ref: null, values: { date: '', speaker: '', title: '', bible: 'x'.repeat(201), content: oldDocument } });
assert.equal(rejected.ok, false);
assert.equal(rejected.error.code, 'INVALID_INPUT');
assert.deepEqual(rejected.error.fields['values.bible'], ['200자 이내로 입력해 주세요']);
console.log('PASS: Server Action revalidates bible and returns the field error contract');
const { saveWeekly } = await import('../src/features/weekly/actions.ts');
const invalidSender = await saveWeekly({ ref: null, values: { ...restored.data, senders: [{ personId: null, name: '파송자 예시', generation: 'abc', group_name: '', date: '', prayer: '' }] } });
assert.equal(invalidSender.ok, false);
assert.equal(invalidSender.error.code, 'INVALID_INPUT');
assert.deepEqual(invalidSender.error.fields['values.senders.0.generation'], ['기수를 숫자로 입력해 주세요']);
console.log('PASS: sender validation returns the exact field path used by RHF');
const invalidFamily = await saveWeekly({ref:null,values:{...restored.data,families:[{...restored.data.families[0],leader_name:'x'.repeat(101)}]}});
assert.equal(invalidFamily.ok,false);
assert.equal(invalidFamily.error.code,'INVALID_INPUT');
assert.deepEqual(invalidFamily.error.fields['values.families.0.leader_name'],['100자 이내로 입력해 주세요']);
console.log('PASS: family server validation uses the same flat field path as the form');
const { uploadPhoto } = await import('../src/features/files/actions.ts');
const invalidPhoto = await uploadPhoto({});
assert.equal(invalidPhoto.ok, false);
assert.equal(invalidPhoto.error.code, 'INVALID_INPUT');
console.log('PASS: malformed upload requests return the common validation error');
const { savePendingWeekly, loadPendingWeekly } = await import('../src/components/bulletins/local-store.ts');
const recoveryStorage = new Map();
globalThis.localStorage = { getItem: key => recoveryStorage.get(key) ?? null, setItem: (key,value) => recoveryStorage.set(key,value) };
const oldRef = { id: '00000000-0000-4000-8000-000000000010', sermon: { id: '00000000-0000-4000-8000-000000000011' } };
savePendingWeekly(restored.data, oldRef);
assert.deepEqual(loadPendingWeekly('2035-01-07').ref, oldRef);
assert.equal(loadPendingWeekly('2035-01-14'), null);
console.log('PASS: browser recovery preserves the record identities without a revision counter');
