---
title: "Continuing the Search for My Second Project"
slug: "continuing-search-second-project"
date: 2026-07-31
description: "One week later, I narrowed my options to web security, developer communities, and small products built around proven demand."
primary_category: "random thoughts"
categories: ["random-thoughts"]
tags: ["Random Thoughts", "Indie Hacking", "Market Validation", "Cybersecurity"]
draft: false
translationKey: "continuing-search-second-project"
---

In my [previous post](/blogs/second-project-options/), I compared several possible directions for my second project.

The original goal was to practise market validation before building. I wanted to learn more about SEO, keyword research, Semrush, eRank (a tool for analysing keywords and competitors on Etsy), competitor analysis, and other ways to estimate demand before investing heavily in implementation.

One week later, the focus has shifted. I have moved away from some of the original options and spent more time on cybersecurity, developer communities, and existing software markets.

This may look like a return to my technical comfort zone. For now, I am comfortable with that. Platforms can provide a clearer starting point, existing users, and faster feedback than building an independent product from zero.

## What changed with the earlier options

I bought one month of eRank and examined demand and competition across several Etsy categories. The main observation was that visible demand often came with enormous supply. Some trending keywords had poor supply-demand ratios, with many established listings and sellers competing for the same searches. Generic AI-generated digital materials also appeared difficult to differentiate.

Operating an Etsy store reliably from my current location introduced another layer of platform risk. Even if the setup were technically possible, inconsistent geography, VPN usage, and the possibility of account suspension made the opportunity less attractive. Etsy remains a valid market, but I have paused this direction.

My friend regained some interest in building an independent website for his toy business, although progress has been slow. I now see it mainly as a combination of outsourced work and a chance to observe the full cross-border sales chain:

- Product selection and pricing
- Traffic acquisition
- Payment and delivery
- Customer service
- Repeat purchases

That could provide useful business experience beyond software implementation. However, my role would be closer to supporting an existing business than building an asset of my own, so its priority remains relatively low.

## A one-month Hacker101 experiment

The main new direction is web security.

I started working through Hacker101 CTF challenges (legal, intentionally vulnerable environments designed for security practice). I am reviewing HTTP, cookies, browser security, XSS (cross-site scripting, where untrusted content is executed in a webpage), CSRF (cross-site request forgery, where a site tricks a browser into sending an unwanted request), the same-origin policy (a browser rule that restricts how different websites interact), content types, character encoding, and Burp Suite (a tool for inspecting and testing web traffic).

I am documenting the work in my [Hacker101 CTF notes](https://github.com/yitaohe98/hacker101-ctf-notes). The repository is limited to authorized CTF environments and records the approach, relevant requests, lessons, and follow-up questions for each challenge.

This direction builds on my existing experience without being identical to my previous work. My background is mainly in backend systems, networking, infrastructure, and reliability. Most of that work focused on making systems behave correctly.

Security applies a different perspective to many of the same components:

> How can an assumption fail, and how might the system be used in an unintended way?

The technologies are familiar enough that my previous experience remains useful, while the adversarial way of thinking still requires deliberate practice.

It also offers a relatively fast feedback loop. A CTF provides a concrete target and a clear result. The initial cost is low, and progress can be recorded publicly instead of remaining an abstract learning plan.

I plan to spend one month on this experiment and then evaluate whether it should continue. During that month, I want to:

1. Complete more Hacker101 challenges.
2. Document each result systematically.
3. Become more comfortable with Burp Suite and web traffic analysis.
4. Read real vulnerability reports.
5. See whether I can solve problems with less dependence on existing write-ups.

At the end of the month, I will review whether my interest remains consistent and whether the understanding is becoming transferable rather than limited to individual challenges.

The immediate goal is learning, not income, but the path could later expand into authorized public bug-bounty programs, application security, security research, security automation and developer tools, AI-assisted vulnerability analysis, or simply stronger security practices when I build my own products.

Even if this does not become a separate career direction, the knowledge should remain useful for product development and technical risk assessment.

## Observing small software markets

I have also been spending more time on Product Hunt, Reddit, and posts from independent developers.

This has exposed me to more examples of small products generating tens or hundreds of dollars in MRR (monthly recurring revenue). These are not necessarily large businesses, but they demonstrate a complete loop:

> Identify a problem → build → reach users → collect payment → improve

The other observation is the value of community. Developers publicly share launches, failures, customer feedback, revenue, acquisition channels, and technical decisions. Regular participation can lead to early users, collaborators, referrals, and better access to practical information.

Community connection is therefore not only social activity. It can also become part of distribution and opportunity discovery.

One method I want to examine further is searching one-star reviews for apps, tools, and Chrome extensions. Existing products already demonstrate some level of demand. Their negative reviews can reveal recurring complaints:

- Missing features
- Poor reliability
- Abandoned maintenance
- Difficult workflows
- Pricing problems
- Privacy concerns

A possible experiment would be to identify one narrow complaint, build a smaller alternative quickly, publish it through an existing platform, and measure the response.

This approach can move from research into a product test with limited preparation. App stores and extension marketplaces also provide an existing discovery mechanism, reducing some of the initial marketing burden. Platform risk remains, but a platform can offer an easier start and faster feedback than a standalone website with no audience.

## Doing subtraction

At this point, I do not want to add more ideas to the list. The current scope is already enough:

1. Search existing apps and reviews, with the option to build and test a narrow product quickly.
2. Establish more connections with independent developers and relevant communities.
3. Continue learning web security and gradually move toward authorized bug finding.

These three areas are enough to keep me occupied until one loses momentum or I deliberately remove it.

The focus now is subtraction rather than collecting more possibilities. I would rather develop evidence in a few directions than maintain a growing list of ideas that receive little attention.

A few observations from this week stood out:

- OpenAI is particularly cautious when assisting with cybersecurity practice, even in authorized CTF environments.
- Burp Suite Professional costs about $499 per year, while gray markets advertise cracked access for around $1.
- Some trending eRank keywords have very poor supply-demand ratios; Pokémon-related searches were one obvious example.
- Products earning only tens of dollars in MRR can still provide useful evidence of real demand.
- One-star reviews may be more useful than generic startup-idea lists.

The original plan was to move further away from implementation and focus on validation. The current direction has moved somewhat back toward technical work, but the underlying principle remains similar: rely on existing platforms, shorten the feedback loop, and avoid building large products before there is evidence to continue.
