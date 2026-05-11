# Kyvern demo video script (three minutes)

Read top to bottom while you record. ACTION lines tell you what to do.
SAY lines are what you read aloud. Pauses are marked. Numbers refresh
from /api/atlas/status before take one.

DAYS    = 20
PAID    = 1,591
BLOCKED = 3,819

Total: 3:00. Keep going if a small thing wobbles. Editor splices.


===============================================================
STEP 1 — Hook
===============================================================

ACTION: Open kyvernlabs.com in a clean Chrome tab. Hero is visible.
The live trust bar is ticking on the right.

SAY:
AI agents shouldn't hold private keys. They should have budgets.

On Solana, we built that.

WAIT three seconds. Trust bar keeps ticking.


===============================================================
STEP 2 — Atlas, the live proof
===============================================================

ACTION: Click Watch Atlas in the top nav. The atlas page loads.
Four hero stats show at the top: alive, merchants paid, attacks
blocked, funds lost.

SAY:
This is Atlas. Our reference agent. It's been running on Solana
devnet for twenty days, fully autonomous.

One thousand five hundred ninety one real on-chain payments. Three
thousand eight hundred attack attempts refused by the policy
engine. Zero dollars lost.

ACTION: Scroll down past the Atlas earned card to the recent
settled payments list. Each row has a short signature like 3kR8
dot dot dot mN4v and an arrow icon. Click any of those rows.

ACTION: Solana Explorer opens with a real on-chain transaction.

WAIT two seconds.

SAY:
Every settled payment is a real Solana transaction. Anyone can
click and verify.


===============================================================
STEP 3 — Try without signing in
===============================================================

ACTION: Close the Explorer tab. Go back to kyvernlabs.com. Scroll
to the hero buttons.

SAY:
Now you can try Kyvern yourself, no signup needed. Click here.

ACTION: Click the Try a Kyvern no login button. The provisioning
page loads and four stages run in sequence on screen.

SAY over the loader:
Real Squads multisig. Real policy program. About six seconds
later, you are inside your own dashboard with your own on-chain
vault.

ACTION: The app page loads automatically. Sandbox vault is active.


===============================================================
STEP 4 — Inside your dashboard
===============================================================

ACTION: The app canvas is visible. The top row shows your worker
on the left and your vault balance on the right. Below that is a
three column layout.

SAY:
This is your dashboard. Your worker on the left. Your vault
balance up top. Live Atlas tape drifting at the bottom of the
worker card.

The chain decides every dollar that moves through this vault.


===============================================================
STEP 5 — Mint an agent key
===============================================================

ACTION: Scroll down to the SDK card in the center column. It has
a window header with traffic light dots and four tabs. Click the
dot env tab.

SAY:
First we need a Kyvern agent key.

ACTION: Click Generate new key. The new key appears in a yellow
panel below the snippet.

SAY:
That is our agent key. Shown once, copy it now, paste into our
env file in a minute.

ACTION: Click the Copy button next to the revealed key.


===============================================================
STEP 6 — Install the SDK
===============================================================

ACTION: Switch to VS Code. The integrated terminal is open at
the bottom. Type:

npm install at kyvernlabs slash sdk

Hit enter. The install completes in about two seconds because the
cache is warm.

SAY:
One install. That is the whole SDK.


===============================================================
STEP 7 — Wrap the agent
===============================================================

ACTION: Switch back to the browser, to the SDK card. Click the
vault dot ts tab.

SAY:
Here are the three things you add to any existing agent. Import
Kyvern at the top. Create the client once. And before every
external API call your agent makes, gate it through vault dot
pay.

ACTION: Click Copy code.

ACTION: Switch to VS Code, open agent dot ts. Paste the three
blocks into your agent file at the marked spots. The merchant
string is api dot commonstack dot ai because that is what the
agent calls.

ACTION: Save.


===============================================================
STEP 8 — Add the env vars
===============================================================

ACTION: Back to the browser, click the dot env tab.

ACTION: Click Copy code.

ACTION: Switch to VS Code, open dot env. Paste the three Kyvern
env vars alongside your existing Commonstack key. Save.

SAY:
The agent key is yours. The metering recipient is where the
on-chain payment record goes.


===============================================================
STEP 9 — Run the wrapped agent
===============================================================

ACTION: Back in the terminal, type:

npx tsx agent dot ts

Hit enter. The agent runs. For each prompt it prints two lines.
First: vault dot pay settled with a short signature. Then: the
LLM prediction with a duration.

WAIT for both to finish, about five seconds total.

SAY:
Two HTTP calls. Both gated by Kyvern on chain. Both settled as
real Solana transactions.


===============================================================
STEP 10 — See it land on the dashboard
===============================================================

ACTION: Switch to the browser, to the app dashboard. Scroll to
Recent SDK calls in the center column. The two fresh payments
from your agent are landing in the list.

WAIT three seconds while the rows settle.

SAY:
Same agent. Same calls. Now they are on-chain artifacts you can
audit.

ACTION: Click the green Allowed chip on the most recent row.
Solana Explorer opens with the real transaction. Your agent's
pubkey as signer. The vault as source.

WAIT two seconds.

SAY:
This agent was written without knowing Kyvern existed. Three
blocks of code, and every call it makes is now gated by
consensus.


===============================================================
STEP 11 — Close
===============================================================

ACTION: Switch back to kyvernlabs.com. The tagline at the bottom
is visible.

SAY:
AI agents are going to spend trillions of dollars on their own.

Kyvern is the authorization layer that makes that safe.

Today, Atlas runs on it. Today, the SDK ships.

We ship to mainnet next month.

FADE on the tagline at the bottom: Agents shouldn't have keys.
They should have budgets.

END.


===============================================================
How to read this script while recording
===============================================================

ACTION lines tell your hands what to do.

SAY lines are what your voice reads, full sentences. Pauses
marked WAIT, three seconds, two seconds, and so on.

Read SAY blocks the way you would actually talk to a friend who
asked you what Kyvern is. Not announcer voice.

Numbers in step 2: read each one slowly, two seconds per number.
Each one is a beat.

If a sentence stumbles: stop, breathe, restart from the top of
that SAY block. Editor splices.


===============================================================
If something breaks on camera
===============================================================

NPM INSTALL HANGS more than five seconds: your cache went cold.
Stop the take. In the terminal, type npm install at kyvernlabs
slash sdk once silently to warm it. Then restart from step 6.

AGENT THROWS UNAUTHORIZED: your agent key was rotated since you
last copied it. Stop, go to the SDK card env tab, click Generate
new key, paste the new one into env, restart from step 9.

AGENT REFUSED MERCHANT NOT ALLOWED: your vault does not have api
dot commonstack dot ai allowlisted. Go to the policy card on
slash app, add the merchant, retry.

PREDICTION TEXT IS EMPTY: Commonstack model fell back to v3.2 and
returned empty. The two settled payments still tell the story.
Skip the camera pan to the prediction text in that take.

EXPLORER LINK 404: the fee payer ran out of SOL. Stop, top up,
take two.


===============================================================
Take log
===============================================================

Take 1
Started at:
Notes:

Take 2
Started at:
Notes:

Take 3
Started at:
Notes:
