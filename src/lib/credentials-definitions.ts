import type { CredentialDefinition } from './credentials-types';

// Note: Next.js 13+ with Turbopack does not support webpack's require.context.
// Import credential definitions explicitly to ensure compatibility.

// General Auth
import airtable from '@/credentials/airtable.credential';
import apiKey from '@/credentials/apiKey.credential';
import bearerToken from '@/credentials/bearerToken.credential';
import discord from '@/credentials/discord.credential';
import github from '@/credentials/github.credential';
import googleApi from '@/credentials/googleApi.credential';
import httpAuth from '@/credentials/httpAuth.credential';
import notion from '@/credentials/notion.credential';
import oauth2 from '@/credentials/oauth2.credential';
import openAi from '@/credentials/openAi.credential';
import sendgrid from '@/credentials/sendgrid.credential';
import slack from '@/credentials/slack.credential';
import stripe from '@/credentials/stripe.credential';
import telegram from '@/credentials/telegram.credential';
import twilio from '@/credentials/twilio.credential';

// Social Media & Messaging
import whatsapp from '@/credentials/whatsapp.credential';
import instagram from '@/credentials/instagram.credential';
import facebook from '@/credentials/facebook.credential';
import twitter from '@/credentials/twitter.credential';
import linkedin from '@/credentials/linkedin.credential';
import youtube from '@/credentials/youtube.credential';

// Payment & E-commerce
import paypal from '@/credentials/paypal.credential';
import square from '@/credentials/square.credential';
import shopify from '@/credentials/shopify.credential';
import mercadopago from '@/credentials/mercadopago.credential';

// Productivity & Storage
import dropbox from '@/credentials/dropbox.credential';
import googleDrive from '@/credentials/googleDrive.credential';
import microsoftGraph from '@/credentials/microsoftGraph.credential';
import asana from '@/credentials/asana.credential';
import trello from '@/credentials/trello.credential';
import monday from '@/credentials/monday.credential';

// Communication
import mailchimp from '@/credentials/mailchimp.credential';
import postmark from '@/credentials/postmark.credential';
import awsSes from '@/credentials/awsSes.credential';
import vonage from '@/credentials/vonage.credential';

// Development & Analytics
import vercel from '@/credentials/vercel.credential';
import netlify from '@/credentials/netlify.credential';
import googleAnalytics from '@/credentials/googleAnalytics.credential';
import amplitude from '@/credentials/amplitude.credential';
import sentry from '@/credentials/sentry.credential';

// Databases & Cloud
import mongodb from '@/credentials/mongodb.credential';
import supabase from '@/credentials/supabase.credential';
import aws from '@/credentials/aws.credential';
import azure from '@/credentials/azure.credential';
import firebase from '@/credentials/firebase.credential';
import redis from '@/credentials/redis.credential';
import postgresql from '@/credentials/postgresql.credential';
import mysql from '@/credentials/mysql.credential';
import pinecone from '@/credentials/pinecone.credential';

// AI & Machine Learning
import anthropic from '@/credentials/anthropic.credential';
import gemini from '@/credentials/gemini.credential';
import huggingface from '@/credentials/huggingface.credential';
import replicate from '@/credentials/replicate.credential';
import elevenlabs from '@/credentials/elevenlabs.credential';

// Infrastructure & DevOps
import cloudflare from '@/credentials/cloudflare.credential';
import digitalocean from '@/credentials/digitalocean.credential';

// Project Management
import jira from '@/credentials/jira.credential';
import confluence from '@/credentials/confluence.credential';

// Automation Platforms
import zapier from '@/credentials/zapier.credential';
import make from '@/credentials/make.credential';

// Additional Communication
import resend from '@/credentials/resend.credential';

export const credentialDefinitions: CredentialDefinition[] = [
  // General Auth
  airtable,
  apiKey,
  bearerToken,
  discord,
  github,
  googleApi,
  httpAuth,
  notion,
  oauth2,
  openAi,
  sendgrid,
  slack,
  stripe,
  telegram,
  twilio,

  // Social Media & Messaging
  whatsapp,
  instagram,
  facebook,
  twitter,
  linkedin,
  youtube,

  // Payment & E-commerce
  paypal,
  square,
  shopify,
  mercadopago,

  // Productivity & Storage
  dropbox,
  googleDrive,
  microsoftGraph,
  asana,
  trello,
  monday,

  // Communication
  mailchimp,
  postmark,
  awsSes,
  vonage,

  // Development & Analytics
  vercel,
  netlify,
  googleAnalytics,
  amplitude,
  sentry,

  // Databases & Cloud
  mongodb,
  supabase,
  aws,
  azure,
  firebase,
  redis,
  postgresql,
  mysql,
  pinecone,

  // AI & Machine Learning
  anthropic,
  gemini,
  huggingface,
  replicate,
  elevenlabs,

  // Infrastructure & DevOps
  cloudflare,
  digitalocean,

  // Project Management
  jira,
  confluence,

  // Automation Platforms
  zapier,
  make,

  // Additional Communication
  resend,
];
