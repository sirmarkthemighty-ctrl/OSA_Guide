# OSA Guide
### Obstructive sleep apnoea: checklist, screening scores, polysomnogram, treatment

A bedside tool by Warodom Phaenthong, M.D. One self-contained HTML page (`osa-guide.html`, opened by `index.html`) that runs in the browser, works offline and sends no data anywhere. English and Thai, light and dark.

## What it does

- **Checklist** of night-time and daytime symptoms, exam signs, risk factors and red flags, with a live count and a prompt on whether to test.
- **Screening:** STOP-Bang (0-8) and Epworth Sleepiness Scale (0-24).
- **Polysomnogram:** enter sleep time, event counts, SpO2 nadir, T90 and supine / non-supine AHI to get AHI, severity, central share, positional and hypoxaemia flags. Missing values show N/A.
- **Treatment:** general measures, CPAP / BPAP, oral appliance, surgery and nerve stimulation, medicines, peri-operative care, follow-up.

## Sources and what is not verified

Based on commonly cited criteria (AASM 2017 diagnostic testing, AASM scoring manual, AASM 2019 PAP and 2015 oral appliance guidelines, STOP-Bang, Epworth, FDA tirzepatide label). Not checked line by line against the originals, and no Thai OSA guideline is included. Check the current guideline and local availability before acting. A reference tool, not a substitute for clinical judgement.

## More in the app

- Results strip under the tabs with a **Summary** button: a chart note (checklist, STOP-Bang, Epworth, Berlin, sleep-test result, PAP follow-up) you can copy or print. No patient name or ID is included.
- **PAP follow-up check** in the Treatment tab (use, residual AHI, leak, sleepiness).
- Recommendations from the 2025 Thai adult guideline (marked TH) and the AASM guidelines (marked AASM, with their strength ratings).
- Heart button: donation pop-up with a PromptPay QR.
- Test: `node test.js` (no browser needed).
