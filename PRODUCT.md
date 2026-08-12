# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary audience is reviewers and developers evaluating a portfolio or learning project. They use SwiftChat to inspect and exercise a complete authenticated, real-time chat workflow across an Angular frontend and Spring Boot backend.

## Product Purpose

SwiftChat demonstrates how a modern web client, Java API, identity provider, relational database, local media storage, and WebSocket notifications work together in a functioning one-to-one messenger. Success means a reviewer can sign in, find another registered user, start a conversation, exchange messages and attachments, and observe presence and message state changes.

## Positioning

SwiftChat is a technical showcase built around an end-to-end, runnable messaging flow rather than a broad consumer messenger or a static interface demo. Its value is the integration of Angular, Spring Boot, Keycloak, PostgreSQL, and STOMP/WebSockets in one inspectable project.

## Operating Context

The product is currently run as a local browser application. The Angular client communicates with the Spring Boot REST and WebSocket services; Keycloak provides login and account management; PostgreSQL persists application data; uploaded media is stored on the backend filesystem.

The core user workflow is: authenticate, view or choose a contact, create or open a one-to-one chat, exchange text or media messages, and observe unread, seen, and online status updates.

## Capabilities and Constraints

- Authenticated one-to-one conversations between registered users are the confirmed product scope. Group conversations are not part of the product claim.
- Implemented capabilities include contact discovery, idempotent chat creation, text messaging, attachment upload, message history, unread counts, sent/seen state, presence, emoji entry, and real-time message notifications.
- Search, chat filters, favorites, voice recording, and complete audio/video handling are not confirmed capabilities even where the interface or domain model hints at them.
- The current environment is development-oriented: service URLs are local, Keycloak realm setup is manual, media uses local disk, collection endpoints are unpaginated, and database schema updates are managed by Hibernate.
- The interface and product copy are currently English. No durable localization commitment has been established.

## Brand Commitments

The confirmed product name is **SwiftChat**. Product language should be direct and technical enough for reviewers while keeping the messaging workflow immediately understandable. No tagline or binding visual identity has been established by this product record.

## Evidence on Hand

- The working Angular product surface is under `SwiftChat-UI/src/app/pages/`.
- The Spring Boot API and real-time implementation are under `SwiftChat/src/main/java/com/SwiftChat/SwiftChat/`.
- Existing product assets are in `SwiftChat-UI/public/` and `Media/`, including banners, icons, a favicon, a background, and a default user image.
- Local infrastructure is defined in `docker-compose.yml`; backend runtime settings are in `SwiftChat/src/main/resources/application.yaml`.
- No testimonials, customer claims, adoption metrics, pricing, production deployment proof, or third-party endorsements are available and future work must not fabricate them.

## Product Principles

1. Demonstrate complete workflows, not isolated technology samples.
2. Keep one-to-one messaging reliable and easy to evaluate.
3. Make integration boundaries and real-time behavior legible to technical reviewers.
4. Describe only behavior the project can actually demonstrate.
5. Prefer a runnable local setup over speculative production architecture.
