# TrustPass Synthetic Demo Evidence

These files are synthetic and safe for hackathon demos. They are intentionally marked as demo evidence and do not represent real businesses, people, accounts, or contracts.

## Files and Expected Behavior

- `01-jay-fai-menu-expensive-no-name.png`: expensive menu without visible venue name. With GPS near Jay Fai, `/api/situation/analyze` should ask for clarification before scoring.
- `02-fake-tour-line-payment.png`: full payment to personal account, no license. Expected risk: `High`.
- `03-qr-payment-name-mismatch.png`: business/account name mismatch. Expected risk: `High`.
- `04-motorbike-rental-passport-contract.pdf`: original passport retention. Expected risk: `High`.
- `05-jetski-damage-cash-pressure.png`: cash pressure and no receipt. Expected risk: `High`.
- `06-fake-casting-mae-sot-lure.png`: pickup, secrecy, Mae Sot. Expected risk: `Emergency`.
- `07-tuktuk-temple-closed-gem-shop.png`: attraction closed plus gem-shop detour. Expected risk: `Caution`.

Use these files with `/api/evidence/extract` or the current `/check` upload flow.
