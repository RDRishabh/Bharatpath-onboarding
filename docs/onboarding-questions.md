# BharatPath Onboarding Questions

As of 2026-09-16. Mirrors the shared doc:
https://claude.ai/code/artifact/95d84217-5f85-4c26-bc2c-6a8dc0bf5073

Source of the employer and college fields: `backend/app/modules/kyb/forms.py`
and `backend/app/modules/college/forms.py` (both `FORM_VERSION`
placeholder-1-2026-09-11). Candidate sign-up follows `docs/screen-flows.md` §2.4.

## How we decide what is mandatory

A field is mandatory only if the platform cannot work without it, or if the people who receive candidate data (employers, colleges) could not be held accountable without it. Everything else is optional and can be filled in later from the profile.

- **Candidates** share data with employers, so we ask them for very little and ask it gradually. Sign-up is under a minute; the CV does most of the work.
- **Employers and colleges** receive candidate data, so we ask them for more: who they are legally, who is responsible, and a signed undertaking. That is what makes misuse a breach we can act on.
- **Documents** are asked only where a number on a form needs proof. Clear phone photos are accepted.
- **Mandatory** = cannot continue without it. **Optional** = skippable, with a nudge on the profile later.

## Students and candidates

A candidate needs five things to start: a verified phone or email, their name, a language, a CV, and their consent. Everything else is optional and asked later, on the profile, when it becomes useful.

### Mandatory at sign-up

| # | Question | Why we need it | Who sees it |
| --- | --- | --- | --- |
| 1 | Preferred language | Every later screen is shown in it | Nobody else |
| 2 | Mobile number (+91), verified by OTP. Email is the alternative | The account itself; job and application updates | Employers, only after they open the full profile |
| 3 | Your full name | Employers need a real name to contact the person. Never guessed from the CV | Employers, only after they open the full profile |
| 4 | Your CV: upload a file (PDF or DOCX), paste the text, or fill a short form | The score and the employer card are built from it | Employers see skills and experience; the name only on opening |
| 5 | Confirm what we read from the CV | Parsing is not always right; nothing is scored until the candidate confirms | Nobody else |
| 6 | Consent: terms, privacy notice, and permission to show the profile to verified employers | Required under the DPDP Act before we share any data | Stored as a record |

### Optional, asked on the profile later

| Question | When to ask it | Why it helps |
| --- | --- | --- |
| Current city and state | Before the first job search | Employers filter by location. City and state only, never a full address or PIN |
| Email address (if they signed up with phone) | Profile screen | A second way to recover the account |
| College referral code | Sign-up or any time later | Links the student to their college's placement roster |
| Jobs they are looking for (role, sector) | First visit to the job board | Better job matches |
| Cities they would work in, and willingness to relocate | First visit to the job board | Better job matches |
| Notice period or availability date | Before first application | Employers ask this in every first call |
| Highest qualification, course and year of passing | If not clear from the CV | Fills gaps the CV left |
| Languages they speak | Profile screen | Many field and customer-facing roles need a regional language |
| Notification permission | After sign-up | Application updates and "your score is ready" |

### Documents from candidates

- **Mandatory:** the CV only.
- **Optional:** nothing else at onboarding. Certificates, marksheets and ID proofs are the employer's job at offer stage, not ours. Collecting them adds friction and puts sensitive documents in our custody for no gain.

## Employers

Employers can open candidate contact details, so we need to know exactly who they are. We ask for only one identifier, the PAN, because every Indian employer has one. A CIN or GSTIN would shut out proprietors and small partnerships.

### Mandatory

| Section | Question | Why |
| --- | --- | --- |
| Organisation | Registered name (as on PAN or registration) | Legal identity |
| Organisation | Type of organisation (company, LLP, partnership, proprietor, etc.) | Tells us which documents apply |
| Organisation | Sector / industry | Shown to candidates; used in search |
| Registration | PAN | The one identifier every employer has |
| Address | Registered address, city, state, PIN code | Legal identity; city and state are shown to candidates |
| Contact | Name and designation of the authorised person | The person accountable for how candidate data is used |
| Contact | Work email, verified by link | Account and accountability. A free email is allowed, since most small employers use one |
| Contact | Contact number | Verification call if needed |
| Undertakings | We will use candidate details only for genuine jobs | Makes misuse a breach we can act on |
| Undertakings | We will not sell, share or publish candidate details | Same |
| Undertakings | I am authorised to accept these terms for this organisation | Binds the organisation, not only the person |

### Optional

| Question | Why it helps |
| --- | --- |
| Brand or trade name candidates would recognise | A jobseeker knows the brand above the door, not the legal name |
| Number of employees (band) | Candidates trust a sense of size |
| Website or social media page | Easy check that the business is real |
| What the organisation does (2 or 3 sentences) | Shown to candidates on job posts |
| GSTIN | Only if registered for GST; also needed for a GST invoice |
| CIN or LLPIN | Only companies and LLPs have one |
| TAN | Rarely needed; keep it optional |
| Address line 2 | Only if needed |

### Documents from employers

| Document | Status | When it applies |
| --- | --- | --- |
| PAN card of the organisation (or proprietor) | **Mandatory** | Always. Name and number must match the form |
| Certificate of incorporation or registration | Optional | Companies, LLPs, registered firms. Strongly asked for if they have one |
| GST registration certificate | Optional | Only if they entered a GSTIN |
| Authorisation letter on letterhead for the named person | Optional, recommended | When the person signing up is not the owner or a director |

Phone photos of documents are accepted if the text is readable.

## Colleges

Colleges are signed through a conversation and an agreement before they reach this form, so it is shorter than the employer form. A college sees only its own students, and only those who entered the college's referral code themselves.

### Mandatory

| Section | Question | Why |
| --- | --- | --- |
| Institution | Registered name of the institution | Legal identity; shown to students |
| Institution | Type (university, autonomous or affiliated college, engineering, management, polytechnic, ITI, training institute, other) | Tells us which identifiers apply. ITIs and polytechnics are included on purpose |
| Address | Campus address, city, state, PIN code | Legal identity; city and state are shown to students |
| Placement office | Name of the placement officer | The person accountable for student data |
| Placement office | Work email, verified by link | Account and accountability |
| Placement office | Contact number | Support and seat activation |
| Students | Roughly how many students finish each year | Sizing the seat count |
| Undertakings | Each student connects their own profile; we cannot do it for them | Student consent stays with the student |
| Undertakings | I am authorised to accept these terms for this institution | Binds the institution |

### Optional

| Question | Why it helps |
| --- | --- |
| AISHE code | Confirms the institution exists without any documents. Not every ITI or training institute has one |
| Affiliating university | Only for affiliated colleges |
| PAN of the institution or its trust | Needed for the invoice; can be collected at payment instead |
| GSTIN | Only if registered, for a GST invoice |
| Website | Easy check that the institution is real |
| Placement officer's designation | Useful, not essential |
| A second contact email | Placement officers change; stops the account being lost |
| Departments or streams that will use the platform | Planning seats and job matches |
| Month the placement season starts | So seats are active before it begins |

### Documents from colleges

| Document | Status | When it applies |
| --- | --- | --- |
| Signed agreement or purchase order with BharatPath | **Mandatory** | Always; it is the legal basis for the account |
| Authorisation letter on letterhead for the placement officer | Optional, recommended | When the officer is not the signatory of the agreement |
| Proof of recognition or affiliation (UGC, AICTE, NCVT or university letter) | Optional | Only if there is no AISHE code |
| PAN card of the institution or trust | Optional | Only if PAN is needed on the invoice |

## Document checklist at a glance

Three documents are mandatory across the whole platform: the candidate's CV, the employer's PAN card, and the college's signed agreement.

| Document | Students | Employers | Colleges |
| --- | --- | --- | --- |
| CV / resume | **Mandatory** | — | — |
| PAN card | — | **Mandatory** | Optional (for invoice) |
| Signed agreement / purchase order | — | — | **Mandatory** |
| Certificate of incorporation or registration | — | Optional | — |
| GST registration certificate | — | Optional (if GSTIN given) | — |
| Authorisation letter for the contact person | — | Optional, recommended | Optional, recommended |
| Proof of recognition or affiliation | — | — | Optional (if no AISHE code) |

All uploads: PDF, JPG or PNG; readable phone photos are fine.

## What we never ask

Some questions are left out on purpose, even as optional fields. They add legal risk or bias and do nothing for matching.

- **Date of birth or age.** The platform must not age-gate candidates, and a field that exists will get used to filter.
- **Aadhaar number or Aadhaar card**, from anyone. We are not permitted to collect it for this purpose, and PAN covers employer identity.
- **Candidate photo, gender, religion, caste, marital status.** These invite discrimination and are not needed to match a job.
- **Candidate full address or PIN code.** City and state are enough, and every employer can see them.
- **Salary slips, bank statements, income or any financial details** from candidates. BharatPath's score is not a financial score.
- **Marksheets, degree certificates or ID proofs from candidates.** Those are checked by the employer at offer stage.

## Open decisions

- [ ] **Employer approval.** Right now employers are approved automatically, so no one checks these answers before an employer can see contact details. Should a person review the PAN and the documents before an employer's first reveal?
- [ ] **Registration certificate.** Keep it optional for all employers, or make it mandatory for companies and LLPs only?
- [ ] **Authorisation letter.** Make it mandatory when the contact person is not an owner or director?
- [ ] **Expected salary from candidates.** Useful for matching, but it can anchor offers low. Ask it, or leave it out?
- [ ] **Stated notice period.** Keep it optional, or ask it before a candidate's first application?
- [ ] **College PAN.** Required up front, or collected only at invoicing (current draft)?
