# Minimum Viable SaaS

A feature-complete membership app in less than ~400 lines of code.

## Built with

- Next.js
- Firebase Auth
- Firebase Firestore
- Firebase Stripe Extension
- Stripe Customer Portal
- Tailwind

## Features

- Login/Logout
- 2 product tiers (Basic and Premium) with 2 price plans each (monthly and yearly)
- Subscription management, card management, and plan cancellation via Stripe Customer Portal
- Basic-only content
- Premium-only content

## Background

I saw a tweet about a new Firebase Firestore Extension for Stripe's new customer billing portal. This new portal lets end-users change plans and update their billing info via stripe.com instead of in your app--saving you thousands of lines of UI code and headaches.

Anyways, after seeing this, I had to see just how many lines it code it would take to build a minimally viable membership/saas site.

**Turns out it takes less than 300-400 lines of code.** It took me around 2 hours to figure this all out, but that's because I semi-forgot how Firebase worked (hint: subscriptions).

Most of the code comes straight from the `next-firebase-authentication` Next.js example. After that it's almost entirely ripped from the Stripe sample.

While I'm still not a fan of Firebase, I think this setup is by far the fewest possible lines of code required to get \$\$\$\$ selling some software as a service.
