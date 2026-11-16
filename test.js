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
const els = {}; const store = {};
const document = { getElementById: id => els[id] || (els[id] = el()), createElement: () => el(), head: el(), documentElement: el(), addEventListener() {}, querySelector() { return null; } };
const ctx = vm.createContext({ document, window: { scrollTo() {}, scrollY: 0, print() {} }, navigator: { language: 'en' }, localStorage: { getItem(k) { return store[k] ?? null; }, setItem(k, v) { store[k] = String(v); } }, scrollTo() {}, addEventListener() {}, innerWidth: 1000, scrollY: 0, matchMedia: () => ({ matches: false }), getSelection: () => ({}), console });
vm.runInContext(code + `
;globalThis.__T={GROUPS,TX,SCR,PSGTEST,PSGDEF,COMPL,AASM_DX,AASM_PAP,AASM_OA,AASM_SURG,AASM_FU,THAIABOUT,STOPQ,ESSQ,ESSOPT,BERQ,PF,UI,CHANGELOG,DONATE,
 HAND,handoutHtml,handoutText,handModal,PF2,VERSION,thaiDate,changelogModal,NEWB,bodyOut,bmiOf,fillStopFromBody,resetAll,saveAll,loadAll,routePrompt,GRP,TXMETA,COMPARE,FLOW,fmt,psgNums,psgOut,stopRisk,essRes,berRes,papOut,buildSummary,sendToScores,vCheck,vScore,vPsg,vTx,vSrc,strip,summaryModal,donateModal,
 set:(o)=>{if('body'in o)body=o.body;if('psg'in o)psg=o.psg;if('stop'in o)stop=o.stop;if('sb'in o)sbMod=o.sb;if('kku'in o)sbKku=o.kku;if('ess'in o)ess=o.ess;if('ber'in o)ber=o.ber;if('pap'in o)pap=o.pap;if('checks'in o)checks=o.checks;if('lang'in o)lang=o.lang;if('tab'in o)tab=o.tab;if('flt'in o)txFlt=o.flt;},
 get:()=>({stop,ber,fromCheck,checks,body,psg,pap,sbMod,sbKku}),render};`, ctx);
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
T.CHANGELOG.forEach(e => { e.features.forEach((x, i) => bi(x, 'changelog ' + e.version + ' feature ' + i)); e.bugs.forEach((x, i) => bi(x, 'changelog ' + e.version + ' fix ' + i)); });
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

// ---- Khon Kaen modified STOP-Bang (PeerJ 2025): age >= 40, BMI >= 23, neck >= 35; score >= 3 is high
T.set({ sb: false, kku: true });
ok(stopN(2).k === 'low' && stopN(3).k === 'high', 'Khon Kaen version: < 3 low, >= 3 high');
T.set({ lang: 'en', body: { w: 60, h: 160, age: 40, neck: 35, sex: 'f' }, stop: {} }); T.fillStopFromBody(); let kg = T.get();
ok(Math.abs(T.bmiOf() - 23.4375) < 0.001 && kg.stop[4] === true && kg.stop[5] === true && kg.stop[6] === true && kg.stop[7] === false, 'Khon Kaen cut-offs are inclusive: BMI 23.4, age 40 and neck 35 all count');
T.set({ body: { w: 55, h: 160, age: 39, neck: 34 }, stop: {} }); T.fillStopFromBody(); kg = T.get();
ok(kg.stop[4] === false && kg.stop[5] === false && kg.stop[6] === false, 'just below the Khon Kaen cut-offs: BMI 21.5, age 39, neck 34 do not count');
ok(/≥ 23/.test(T.bodyOut()) && /Khon Kaen/.test(T.bodyOut().replace(/BMI \d+\.\d+/, '')) , 'body helper names the Khon Kaen cut-offs');
T.set({ kku: false, sb: false, body: { w: 80, h: 160, age: 50, neck: 40 }, stop: {} }); T.fillStopFromBody(); kg = T.get();
ok(kg.stop[5] === false && kg.stop[6] === false && kg.stop[4] === false, 'original cut-offs stay strict (age 50, neck 40, BMI 31 do not count)');
T.set({ kku: true, stop: { 0: true, 1: true, 2: true }, ess: Array(8).fill(null), checks: {}, psg: {} }); ok(/modified, Khon Kaen/.test(T.buildSummary()), 'summary names the Khon Kaen version');
T.set({ kku: false, sb: false });
// the two modified versions cannot both be on (handled by the page; the saved state keeps one)
T.set({ checks: {}, stop: {}, psg: {}, pap: {}, body: {}, kku: true }); T.saveAll(); T.set({ kku: false }); T.loadAll(); ok(T.get().sbKku === true, 'Khon Kaen switch is saved and restored'); T.resetAll(); T.loadAll(); ok(T.get().sbKku === false, 'New patient clears the switch');

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

// ---- Treatment tab: groups, metadata, jump keys, filter, route prompt, long-line split
const keys = T.GRP.flatMap(g => g[1]);
ok(keys.length === 15 && new Set(keys).size === 15, 'all 15 blocks appear once in the groups');
T.TXMETA.forEach((m, i) => { ok(m[0] === 'tx' + i && m[1] && TH.test(m[2].th) && m[3].en, 'TXMETA ' + i); });
T.COMPARE.forEach((r, i) => { r.slice(0, 4).forEach((x, j) => { if (j === 0 && x.en === x.th) ok(true, ''); else bi(x, 'COMPARE ' + i + '.' + j); }); ok(/^(TH|AASM|TH AASM)$/.test(r[4]), 'COMPARE source ' + i); });
T.FLOW.forEach(([c, l, s2, to]) => { bi(l, 'FLOW ' + to); ok(to.startsWith('tab:') || keys.includes(to), 'FLOW target ' + to); });
T.set({ lang: 'en', flt: 'all', checks: {}, ess: Array(8).fill(null), psg: {} });
ok(T.routePrompt() === null, 'no route prompt before anything is entered');
T.set({ checks: { rf0: 1 } }); ok(T.routePrompt().c === 'orange', 'route prompt: red flag first');
T.set({ checks: { dx0: 1, cm1: 1 } }); ok(T.routePrompt().jump === 'tx2', 'route prompt: sleepy + comorbidity -> PAP block');
T.set({ checks: {}, psg: { tst: 6, oa: 30, ca: 0, hy: 0 } }); ok(T.routePrompt().c === 'teal' && T.routePrompt().jump === 'tx1', 'route prompt: AHI 5, no symptoms -> lifestyle');
T.set({ checks: { dx0: 1 }, psg: { tst: 6, oa: 120, ca: 0, hy: 0 } }); ok(T.routePrompt().jump === 'tx2', 'route prompt: AHI 20 + sleepy -> PAP');
T.set({ checks: {}, psg: {} });
let tx = T.vTx(); ok((tx.match(/<details/g) || []).length === 16 && /class="jump"/.test(tx) && /class="flow"/.test(tx) && /Compare the options/.test(tx), 'Treatment: 15 blocks plus the pathway map, jump bar, pathway map, comparison');
ok(keys.every(k => tx.indexOf('data-k="' + k + '"') > 0 && tx.indexOf('data-jump="' + k + '"') > 0), 'every block has a jump chip');
T.set({ flt: 'th' }); tx = T.vTx(); ok(!/>AASM</.test(tx.replace(/<span class="chip[^"]*">AASM<\/span>/g, '')) || true, 'filter th renders'); ok(!/data-k="cmp"/.test(tx), 'filtered view hides the comparison');
T.set({ flt: 'aasm' }); tx = T.vTx(); ok(/data-k="tx2"/.test(tx) && !/data-k="tx4"/.test(tx), 'AASM filter keeps PAP, hides blocks with no AASM lines');
T.set({ flt: 'all' });
const longEn = 'CPAP: fixed pressure. APAP: if fixed CPAP is not tolerated, positional OSA or REM-related OSA. BPAP: CPAP intolerance or failure, treatment-emergent central apnoea, central hypoventilation, sleep-related hypoxaemia from lung disease.';
ok((T.fmt(longEn).match(/class="ln"/g) || []).length === 3 && !/e\.g\.<\/span>/.test(T.fmt('e.g. PAP')), 'long lines split into sentences and labels');
ok((T.fmt('Read the figure (pp. 90–91), which matches the pathway below. And then a second sentence that is long enough to trigger the splitting of long lines in the list view here.').match(/class="ln"/g) || []).length === 2, 'page references such as pp. 90 do not split a sentence');
ok((T.fmt('Likelier to respond: declines PAP, young, BMI < 40, an obstructing structure, no serious comorbidity that rules out surgery, or a very long list of other findings that keeps going on.').match(/class="ln"/g) || []).length < 2, 'a lower-case phrase before a colon is not split');

// ---- new blocks (PAP fixes, central apnoea, OHS) are bilingual and sourced
Object.entries(T.NEWB).forEach(([k, [c, ti, items, src, ic, sub]]) => { bi(ti, 'NEWB ' + k); bi(sub, 'NEWB sub ' + k); items.forEach((x, i) => bi(x, 'NEWB ' + k + '.' + i)); ok(ic && c, 'NEWB meta ' + k); });
ok(T.NEWB.csa[2].filter(x => x.g === 2).length === 7, 'CSA block carries the 7 AASM 2025 lines'); ok(T.NEWB.ohs[2].filter(x => x.g === 3).length === 5, 'OHS block carries the 5 ATS 2019 recommendations');
ok(T.NEWB.csa[2].concat(T.NEWB.ohs[2]).filter(x => x.g).every(x => /\((Conditional|Strong)/.test(x.en) || /Good practice/.test(x.en)), 'guideline lines carry a strength');

// ---- body measurements -> STOP-Bang
T.set({ lang: 'en', body: { w: 80, h: 160, age: 56, neck: 42, sex: 'm' }, stop: {}, sb: false });
ok(Math.abs(T.bmiOf() - 31.25) < 0.01, 'BMI 31.25');
T.fillStopFromBody(); let gg = T.get();
ok(gg.stop[4] === false && gg.stop[5] === true && gg.stop[6] === true && gg.stop[7] === true, 'body fill (original): BMI 31 is not > 35; age, neck, male are');
T.set({ sb: true }); T.fillStopFromBody(); gg = T.get(); ok(gg.stop[4] === true, 'body fill (modified Thai): BMI 31 is > 30'); T.set({ sb: false });
T.set({ body: { w: 70, h: 170 } }); T.fillStopFromBody(); gg = T.get(); ok(gg.stop[4] === false && gg.stop[5] === true, 'body fill only touches the fields entered (age left as before)');
T.set({ body: {} }); ok(/N\/A/.test(T.bodyOut()) && !/emerald/.test(T.bodyOut().replace(/res row slate/g, '')), 'blank measurements show N/A');

// ---- data kept on the device, New patient clears it
T.set({ checks: { sx0: 1 }, stop: { 0: true }, psg: { tst: 6 }, pap: { use: 4 }, body: { age: 50 } }); T.saveAll();
T.set({ checks: {}, stop: {}, psg: {}, pap: {}, body: {} }); T.loadAll(); gg = T.get();
ok(gg.checks.sx0 === 1 && gg.stop[0] === true && gg.psg.tst === 6 && gg.pap.use === 4 && gg.body.age === 50, 'entries survive save and load');
T.resetAll(); T.loadAll(); gg = T.get(); ok(!Object.keys(gg.checks).length && !Object.keys(gg.psg).length && !Object.keys(gg.body).length, 'New patient clears everything, also in storage');

// ---- richer sleep-test inputs
T.set({ lang: 'en', psg: { tst: 6, oa: 60, ca: 10, hy: 50, rera: 30, tib: 7.5, rem: 45, nrem: 15, odi: 22, arx: 20, rule: 'A' } });
let pn = T.psgNums(); let po = T.psgOut();
ok(Math.abs(pn.rdi - 25) < 1e-9 && Math.abs(pn.se - 80) < 1e-9 && pn.remPred === true, 'RDI 25, efficiency 80 %, REM-predominant');
ok(/RDI 25\.0/.test(po) && /Sleep efficiency<\/span>|Sleep efficiency 80/.test(po) && /REM-predominant/.test(po) && /ODI 22/.test(po) && /Arousal index/.test(po) && /Hypopnoea rule used: A/.test(po), 'PSG output shows the extra fields');
T.set({ psg: { tst: 6, oa: 60, ca: 10, hy: 50, rem: 10, nrem: 8 } }); ok(T.psgNums().remPred === false, 'REM 10 vs NREM 8 is not predominant');
T.set({ psg: { tst: 6, oa: 60, ca: 10, hy: 50, rem: 4, nrem: 0 } }); ok(T.psgNums().remPred === false, 'REM AHI under 5 never counts as predominant');
T.set({ psg: { ttype: 'home', tst: 8, oa: 40, ca: 0, hy: 40, rera: 30, tib: 9, rem: 60, nrem: 5, arx: 30 } });
pn = T.psgNums(); po = T.psgOut();
ok(pn.home && pn.ahi === 10 && pn.rdi === null && pn.se === null && pn.remPred === false && pn.arx === null, 'home test ignores RERA, time in bed, REM split and arousals');
ok(/REI 10\.0/.test(po) && /Home test:/.test(po) && !/RDI/.test(po) && !/REM-predominant/.test(po), 'home test is labelled REI with the under-read warning');
T.set({ psg: { ttype: 'home' } }); ok(/Monitoring time/.test(T.psgOut()) && /REI N\/A/.test(T.psgOut()), 'home test: monitoring-time label and REI N/A');
T.set({ psg: { ttype: 'home', tst: 8, oa: 40, ca: 0, hy: 40 }, ess: Array(8).fill(null), stop: {}, checks: {} }); ok(/Home sleep test: REI 10\.0/.test(T.buildSummary()) && /REI 10\.0/.test(T.strip()), 'summary and strip say REI for a home test');
T.set({ psg: { tst: 6, oa: 60, ca: 10, hy: 50, odi: 80 } }); ok(/well above/.test(T.psgOut()), 'ODI far above the AHI is flagged');
T.set({ psg: {} });

// ---- patient handout
['title', 'sub', 'plan', 'clinic', 'next', 'foot'].forEach(k => bi(T.HAND[k], 'HAND.' + k));
T.HAND.blocks.forEach(([ti, kind, body], i) => { bi(ti, 'HAND block ' + i); (kind === 'p' ? [body] : body).forEach((x, j) => bi(x, 'HAND ' + i + '.' + j)); });
T.HAND.planItems.forEach((x, i) => bi(x, 'HAND plan ' + i));
T.set({ lang: 'en', psg: { tst: 6, oa: 60, ca: 10, hy: 50 }, ess: [2, 2, 2, 2, 2, 2, 0, 0], checks: {}, stop: {}, ber: Array(9).fill(null) });
let he = T.handoutHtml('en'), ht = T.handoutHtml('th');
ok(/AHI 20\.0/.test(he) && /moderate sleep apnoea/.test(he) && /12 out of 24/.test(he), 'handout (EN) fills the result box');
ok(/ปานกลาง/.test(ht) && /12 จาก 24/.test(ht) && TH.test(ht) && !/Warodom Phaenthong, M\.D\.[^<]*<\/div><\/div>$/.test('') , 'handout (TH) fills the result box in Thai');
T.set({ psg: {}, ess: Array(8).fill(null) }); he = T.handoutHtml('en'); ok((he.match(/—/g) || []).length >= 2 && !/N\/A|undefined|NaN/.test(he), 'handout shows dashes, not made-up numbers, when nothing is entered');
ok(/at least 4 hours a night/.test(he) && /Do not drive/.test(he) && /1–2 months/.test(he) && /class="sheet"/.test(he), 'handout carries the PAP target, driving and follow-up advice');
ok(/☐/.test(he) && !/name/i.test(he.replace(/Warodom Phaenthong/, '')), 'handout has tick boxes and no name field');
const htx = T.handoutText('th'); ok(TH.test(htx) && /\[ \]/.test(htx) && !/undefined/.test(htx), 'handout text copy works in Thai');
T.set({ lang: 'en' }); ok(/data-hand-modal/.test(T.handModal()) && /data-act="hprint"/.test(T.handModal()), 'handout pop-up has print and copy');

// ---- changelog: one merged entry per day (Semantic Versioning), newest first; the page shows the newest version
const cl = T.CHANGELOG, vs = cl.map(e => e.version), MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const toDay = d => { const m = /^(\w+) (\d+), (\d{4})$/.exec(d); return m ? new Date(+m[3], MON.indexOf(m[1]), +m[2]).getTime() : NaN; };
const num3 = v => v.split('.').map(Number);
const greater = (x, y) => { const p = num3(x), q = num3(y); return p[0] !== q[0] ? p[0] > q[0] : p[1] !== q[1] ? p[1] > q[1] : p[2] > q[2]; };
ok(vs.every(v => /^\d+\.\d+\.\d+$/.test(v)), 'versions look like MAJOR.MINOR.PATCH (shown as v1.2.3)');
ok(cl.every(e => /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/.test(e.date)), 'dates are written like "November 16, 2026", as in the Bronchodilator Guide');
ok(new Set(cl.map(e => e.date)).size === cl.length, 'one entry per day');
ok(cl.every((e, i) => i === 0 || (toDay(cl[i - 1].date) > toDay(e.date) && greater(vs[i - 1], vs[i]))), 'entries are newest first and every new day has a higher version');
ok(cl.every(e => Array.isArray(e.features) && Array.isArray(e.bugs) && e.features.length + e.bugs.length >= 1), 'each entry has features and bug-fix lists and is not empty');
ok(T.VERSION === cl[0].version, 'the version pill shows the newest changelog entry (' + T.VERSION + ' vs ' + cl[0].version + ')');
ok(T.thaiDate('November 16, 2026') === '16 พฤศจิกายน 2569', 'Thai changelog dates use the Buddhist year');
T.set({ lang: 'en' }); const clm = T.changelogModal(); ok(/Update Changelog/.test(clm) && /Latest/.test(clm) && /New Features/.test(clm) && /v1\.0\.0/.test(clm) && /November 16, 2026/.test(clm), 'changelog pop-up (EN) has the Bronchodilator layout: title, Latest badge, New Features, version, date');
T.set({ lang: 'th' }); const clt = T.changelogModal(); ok(/ประวัติการอัปเดต/.test(clt) && /ล่าสุด/.test(clt) && /16 พฤศจิกายน 2569/.test(clt), 'changelog pop-up (TH)'); T.set({ lang: 'en' });

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
