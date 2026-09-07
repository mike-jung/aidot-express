# Licensing

**aidot-express is licensed under the Apache License 2.0.**
See [`LICENSE`](../LICENSE) for the full text and [`NOTICE`](../NOTICE) for the
copyright and trademark notice.

## Why Apache-2.0

Wide adoption was the requirement, so the license had to be one that companies accept
without a legal review. Apache-2.0 is that license.

| | |
|---|---|
| **Permissive** | Anyone may use, modify, embed and redistribute the code, including in closed commercial products. Nothing has to be published back. |
| **Explicit patent grant** | Contributors grant a patent licence for their contributions, and it is revoked from anyone who sues over patents. MIT is silent on patents; many enterprise legal teams prefer Apache for exactly this reason. |
| **Attribution, not obligation** | Users must keep the copyright notice and state significant changes. That is the whole burden. |

### What we considered and rejected

**AGPL-3.0** gives the copyright holder the most leverage — anyone running a modified
version as a network service must publish their changes, so a commercial licence becomes
something people buy to avoid that. But many organisations ban AGPL dependencies
outright, so a share of potential users would never even evaluate the framework.
When wide adoption is the goal, that cost is too high.

**MIT** is equally permissive and slightly simpler, but has no patent language.
Apache-2.0 costs nothing extra and closes that gap.

## Can we still sell it?

Yes — and this is worth stating precisely, because it is often confused.

**The licence does not decide this; copyright does.** Aidot Link Co., Ltd. owns the copyright in
this code. Publishing under Apache-2.0 grants everyone a licence; it does not transfer
ownership. We can therefore also license the same code commercially, keep proprietary
extensions closed, or build paid products on top.

What Apache-2.0 *does* change is the shape of what is sold. Under AGPL, customers pay
to escape the source-disclosure requirement. Under Apache-2.0 there is nothing to
escape, so the paid offering is value rather than permission:

- support contracts, SLAs and on-site deployment for hospital environments
- managed or hosted operation
- proprietary modules built on the open core (connectors, compliance packs)
- training and integration work

The trade-off is real and should be understood: **a competitor may also take this code,
extend it privately, and sell the result.** That is the price of the adoption we want.
Our defences are the trademark, the release cadence, and the domain knowledge behind it —
not the licence.

## Trademark

The Apache License covers the code, not the name. "aidot-express" and "Aidot Express"
remain trademarks of Aidot Link Co., Ltd.. A fork may be distributed and sold, but not under our
name in a way that implies it is the official release. This is the usual open-core
arrangement and is why the trademark notice lives in `NOTICE`.

## Contributions

Apache-2.0 section 5 states that contributions are submitted under the same licence
unless stated otherwise, and section 3 carries the contributor patent grant. For most
projects this is enough, and no separate CLA is required.

A CLA would only be needed if we later wanted to relicense the whole project or offer
contributed code under different terms. We are not planning that; if it changes, we
will ask before merging anything under new conditions.

## Third-party dependencies

Dependencies are MIT, Apache-2.0, ISC and BSD — all permissive and compatible.
Run `npm run license:report` to list the licences of the current dependency tree.
