#!/usr/bin/env node
// Regression test for osa-guide.html. No browser needed: the page script runs against a tiny fake DOM,
// then the data, the scores, the PSG and PAP calculators, the checklist mapping and every tab are checked.
// usage: node .claude/test-osa.js [path-to-html]   (in the published repo: node test.js)
const fs = require('fs'), path = require('path'), vm = require('vm');
const FILE = process.argv[2] || [path.resolve(__dirname, '..', 'osa-guide.html'), path.resolve(__dirname, 'osa-guide.html')].find(f => fs.existsSync(f));
const html = fs.readFileSync(FILE, 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const code = scripts[scripts.length - 1];

const el = () => ({ innerHTML: '', style: {}, dataset: {}, value: '', classList: { add() {}, remove() {}, toggle() { return false; }, contains() { return false; } }, appendChild() {}, setAttribute() {}, addEventListener() {}, querySelector() { return null; } });
const els = {};
const document = { getElementById: id => els[id] || (els[id] = el()), createElement: () => el(), head: el(), documentElement: el(), addEventListener() {}, querySelector() { return null; } };
const ctx = vm.createContext({ document, window: { scrollTo() {}, scrollY: 0, print() {} }, navigator: { language: 'en' }, localStorage: { getItem() { return null; }, setItem() {} }, scrollTo() {}, addEventListener() {}, innerWidth: 1000, scrollY: 0, matchMedia: () => ({ matches: false }), getSelection: () => ({}), console });
vm.runInContext(code + `
;globalThis.__T={GROUPS,TX,SCR,PSGTEST,PSGDEF,COMPL,AASM_DX,AASM_PAP,AASM_OA,AASM_SURG,AASM_FU,THAIABOUT,STOPQ,ESSQ,ESSOPT,BERQ,PF,UI,CHANGELOG,DONATE,
 psgNums,psgOut,stopRisk,essRes,berRes,papOut,buildSummary,sendToScores,vCheck,vScore,vPsg,vTx,vSrc,strip,summaryModal,donateModal,
 set:(o)=>{if('psg'in o)psg=o.psg;if('stop'in o)stop=o.stop;if('sb'in o)sbMod=o.sb;if('ess'in o)ess=o.ess;if('ber'in o)ber=o.ber;if('pap'in o)pap=o.pap;if('checks'in o)checks=o.checks;if('lang'in o)lang=o.lang;if('tab'in o)tab=o.tab;},
 get:()=>({stop,ber,fromCheck}),render};`, ctx);
const T = ctx.__T;

let pass = 0; const fails = [];
const ok = (cond, msg) => { cond ? pass++ : fails.push(msg); };
const TH = /[฀-๿]/;
const bi = (x, where) => { ok(x && typeof x.en === 'string' && x.en.length > 0 && typeof x.th === 'string' && TH.test(x.th), 'missing English or Thai text: ' + where + ' / ' + (x && x.en)); };

// ---- bilingual data
T.GROUPS.forEach(([k, c, ti, items]) => { bi(ti, 'group ' + k); items.forEach(([l], i) => bi(l, k + i)); });
T.TX.forEach(([c, ti, items], i) => { bi(ti, 'TX title ' + i); items.forEach((x, j) => bi(x, 'TX ' + i + '.' + j)); });
[['SCR', T.SCR], ['PSGTEST', T.PSGTEST], ['PSGDEF', T.PSGDEF], ['COMPL', T.COMPL], ['AASM_DX', T.AASM_DX], ['AASM_PAP', T.AASM_PAP], ['AASM_OA', T.AASM_OA], ['AASM_SURG', T.AASM_SURG], ['AASM_FU', T.AASM_FU], ['THAIABOUT', T.THAIABOUT]].forEach(([n, arr]) => arr.forEach((x, i) => bi(x, n + i)));
T.STOPQ.forEach(([q], i) => bi(q, 'STOPQ' + i)); T.ESSQ.forEach((q, i) => bi(q, 'ESSQ' + i)); T.ESSOPT.forEach((q, i) => bi(q, 'ESSOPT' + i));
T.BERQ.forEach(([c, q, opts], i) => { bi(q, 'BERQ' + i); opts.forEach((o, j) => bi(o, 'BERQ' + i + '.' + j)); });
T.PF.forEach(([k, l]) => bi(l, 'PF ' + k));
T.CHANGELOG.forEach(([v, d, ls]) => ls.forEach((x, i) => bi(x, 'changelog ' + v + '.' + i)));
['en', 'th'].forEach(l => ['title', 'intro', 'scan', 'note', 'alt', 'close', 'btn'].forEach(k => ok(T.DONATE[l][k], 'donate ' + l + '.' + k)));
ok(T.DONATE.qr.startsWith('data:image/jpeg;base64,') && T.DONATE.qr.length > 50000, 'donate QR embedded');
// every AASM line carries its strength rating
T.AASM_DX.slice(1).concat(T.AASM_PAP.slice(1), T.AASM_OA, T.AASM_SURG).forEach((x, i) => ok(/\((Strong|Weak|Conditional|Standard|Guideline)\)/.test(x.en), 'AASM line without a strength: ' + x.en.slice(0, 40)));
// the colour rule and the checklist keys the "Use in scores" button depends on
const key = (g, i) => T.GROUPS.find(x => x[0] === g)[3][i][0].en;
ok(/snoring/i.test(key('sx', 0)) && /Witnessed/i.test(key('sx', 1)) && /sleepiness/i.test(key('dx', 0)) && /Hypertension/i.test(key('cm', 0)) && /Neck/i.test(key('sg', 1)) && /Drowsy driving/i.test(key('dx', 6)), 'checklist indexes used by Use in scores');

// ---- PSG
const psgIn = (o) => { T.set({ psg: o }); return T.psgNums(); };
let p = psgIn({ tst: 6, oa: 60, ca: 10, hy: 50 });
ok(Math.abs(p.ahi - 20) < 1e-9 && p.sev === 2, 'AHI 20 moderate');
[[4.9, 0], [5, 1], [14.9, 1], [15, 2], [29.9, 2], [30, 3]].forEach(([a, s]) => { p = psgIn({ tst: 10, oa: a * 10, ca: 0, hy: 0 }); ok(p.sev === s, 'severity at AHI ' + a + ' expected ' + s + ' got ' + p.sev); });
p = psgIn({ tst: 6 }); ok(p.ahi === null, 'AHI N/A without counts');
p = psgIn({ tst: 0, oa: 5, ca: 0, hy: 0 }); ok(p.ahi === null, 'AHI N/A with zero TST');
T.set({ psg: { tst: 6, oa: 20, ca: 40, hy: 10 } }); ok(/central/i.test(T.psgOut()), 'central pattern flagged');
T.set({ psg: { tst: 6, oa: 60, ca: 0, hy: 0, sup: 40, non: 4 } }); ok(/Positional OSA/.test(T.psgOut()), 'positional OSA');
T.set({ psg: { tst: 6, oa: 60, ca: 0, hy: 0, sup: 40, non: 8 } }); ok(/not enough|unlikely/.test(T.psgOut()), 'supine-predominant but non-supine >= 5');
T.set({ psg: { tst: 6, oa: 60, ca: 0, hy: 0, t90: 12 } }); ok(/T90 12/.test(T.psgOut()), 'T90 flag');
T.set({ psg: {} }); ok(/AHI N\/A/.test(T.psgOut()), 'N/A shown when nothing entered');

// ---- STOP-Bang
const stopN = (n, extra) => { const s = {}; for (let i = 0; i < n; i++) s[i] = true; Object.assign(s, extra || {}); T.set({ stop: s }); return T.stopRisk(); };
T.set({ sb: false });
ok(stopN(2).k === 'low', 'STOP-Bang 2 low'); ok(stopN(3, { 4: false }).k === 'int', 'STOP-Bang 3 (BMI/age/neck/male not ticked) intermediate');
ok(stopN(5).k === 'high', 'STOP-Bang 5 high');
ok(stopN(2, { 7: true }).k === 'high', 'STOP-Bang 3: two of S,T,O,P plus male -> high');
ok(stopN(1, { 4: true, 7: true }).k === 'int', 'STOP-Bang 3: only one of S,T,O,P -> intermediate');
T.set({ sb: true }); ok(stopN(2).k === 'low' && stopN(3).k === 'high', 'modified STOP-Bang: <3 low, >=3 high'); T.set({ sb: false });

// ---- Epworth
const essN = (n) => { const a = Array(8).fill(0); let r = n; for (let i = 0; i < 8 && r > 0; i++) { a[i] = Math.min(3, r); r -= a[i]; } T.set({ ess: a }); return T.essRes(); };
[[10, 0], [11, 1], [12, 1], [13, 2], [15, 2], [16, 3], [24, 3]].forEach(([n, k]) => ok(essN(n).k === k, 'ESS ' + n + ' band ' + k));
T.set({ ess: [1, 1, null, 1, 1, 1, 1, 1] }); ok(T.essRes() === null, 'ESS incomplete is null');

// ---- Berlin  (item order: 4 snoring, 3 tiredness, 2 hypertension/BMI)
const ber = (a) => { T.set({ ber: a }); return T.berRes(); };
let b = ber([1, 0, 0, 2, 0, 3, 1, 1, 1]); ok(b.done && b.cat[1] && b.cat[2] === false && b.cat[3] === false && b.n === 1, 'Berlin: only snoring category positive -> 1 category, low risk');
b = ber([1, 0, 0, 2, 0, 0, 1, 0, 1]); ok(b.n === 3 && b.cat[3], 'Berlin: three categories');
b = ber([0, 4, 1, 4, 4, 4, 1, 1, 1]); ok(b.n === 0, 'Berlin: none positive');
b = ber(Array(9).fill(null)); ok(!b.done, 'Berlin incomplete');

// ---- checklist -> scores
T.set({ checks: { sx0: 1, sx1: 1, dx0: 1, cm0: 1, sg1: 1, sg0: 1 }, stop: {}, ber: Array(9).fill(null) });
T.sendToScores(); let g = T.get();
ok(g.stop[0] && g.stop[1] && g.stop[2] && g.stop[3] && g.stop[6] && !g.stop[4] && !g.stop[5] && !g.stop[7], 'Use in scores: STOP-Bang items 0,1,2,3,6 only (BMI, age, sex are not copied)');
ok(g.ber[7] === 0 && g.ber[6] === null, 'Use in scores: Berlin hypertension yes, driving untouched');
T.set({ checks: { dx6: 1 }, stop: { 5: true }, ber: Array(9).fill(null) }); T.sendToScores(); g = T.get();
ok(g.ber[6] === 0 && g.stop[5] === true, 'Use in scores keeps existing answers and sets drowsy driving');

// ---- checklist prompt (colour classes only; no risk wording)
T.set({ lang: 'en', checks: { rf0: 1 } }); ok(/res orange/.test(T.vCheck()) && /sleep study soon/.test(T.vCheck()), 'red flag prompt is orange');
T.set({ checks: { sx0: 1, sx1: 1, dx0: 1 } }); ok(/res indigo/.test(T.vCheck()) && !/low suspicion|pre-test probability/.test(T.vCheck()), 'prompt wording, no risk level');
T.set({ checks: {} }); ok(/res slate/.test(T.vCheck()), 'empty checklist neutral');

// ---- PAP follow-up check
const pap = (o) => { T.set({ pap: o }); return T.papOut(); };
let o = pap({ use: 5, pct: 85, rah: 2, leak: 'ok', sl: 'none' }); ok((o.match(/res row emerald/g) || []).length === 4 && !/orange|amber/.test(o), 'PAP: everything at target -> all green');
o = pap({ use: 3, pct: 60, rah: 8, leak: 'high', sl: 'persists' }); ok(/res row orange/.test(o) && /correct the leak/.test(o), 'PAP: low use, high leak and AHI -> fix leak first');
o = pap({ use: 5, pct: 85, rah: 8, leak: 'ok', sl: '' }); ok(/review the pressure/.test(o) && /res row amber/.test(o), 'PAP: high AHI without leak -> pressure review');
o = pap({ use: 5, pct: 85, rah: 2, leak: 'ok', sl: 'persists' }); ok(/another cause/.test(o) && /res row violet/.test(o), 'PAP: sleepy despite good control -> other causes');
o = pap({ use: 4, pct: 70, rah: 2, leak: 'ok' }); ok(/orange/.test(o), 'PAP: pct must be > 70');
o = pap({}); ok(/N\/A/.test(o) && !/emerald/.test(o), 'PAP: blank is N/A, never green');

// ---- summary text
T.set({ lang: 'en', checks: { sx0: 1 }, stop: { 0: true, 1: true, 2: true }, ess: [2, 2, 2, 2, 2, 2, 0, 0], ber: Array(9).fill(null), psg: { tst: 6, oa: 60, ca: 10, hy: 50, nad: 82 }, pap: {} });
let s = T.buildSummary(); ok(/STOP-Bang: 3\/8/.test(s) && /Epworth: 12\/24/.test(s) && /Berlin: N\/A/.test(s) && /AHI 20\.0/.test(s) && /Checklist: 1\//.test(s), 'summary content'); ok(!/undefined|NaN/.test(s), 'summary has no undefined or NaN');
T.set({ lang: 'th' }); s = T.buildSummary(); ok(TH.test(s) && /STOP-Bang: 3\/8/.test(s), 'summary in Thai');

// ---- every tab renders in both languages without errors or stray tokens
for (const lg of ['en', 'th']) for (const tb of ['check', 'score', 'psg', 'tx', 'src']) {
  T.set({ lang: lg, tab: tb, checks: { sx0: 1 }, stop: { 0: true }, pap: { use: 3 } });
  let out = ''; try { out = { check: T.vCheck, score: T.vScore, psg: T.vPsg, tx: T.vTx, src: T.vSrc }[tb](); } catch (e) { fails.push('render ' + lg + '/' + tb + ': ' + e.message); continue; }
  ok(out.length > 500 && !/undefined|NaN|\[object/.test(out), 'render ' + lg + '/' + tb + ' has stray tokens or is empty');
}
ok(/data-act="summary"/.test(T.strip()), 'summary button present'); ok(/data-donate-qr/.test(T.donateModal()), 'donate pop-up shows the QR');
try { T.render(); } catch (e) { fails.push('render(): ' + e.message); }

console.log(pass + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.log(fails.map(f => ' - ' + f).join('\n')); process.exit(1); }
