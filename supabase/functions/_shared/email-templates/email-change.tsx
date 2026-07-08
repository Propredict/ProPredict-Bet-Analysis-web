/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>ProPredict</Heading>
        <Heading style={h1}>Confirm your email change</Heading>
        <Text style={text}>
          You requested to change the email on your ProPredict account from{' '}
          <Link href={`mailto:${oldEmail}`} style={link}>
            {oldEmail}
          </Link>{' '}
          to{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>Confirm the change below:</Text>
        <Button style={button} href={confirmationUrl}>
          Confirm email change
        </Button>
        <Text style={footer}>
          If you didn't request this, please secure your account immediately.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const brand = { fontSize: '18px', fontWeight: 'bold' as const, color: '#0F9B8E', letterSpacing: '0.5px', margin: '0 0 24px', textTransform: 'uppercase' as const }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0d1a15', margin: '0 0 16px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: '#0F9B8E', textDecoration: 'underline' }
const button = { backgroundColor: '#0F9B8E', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '32px 0 0', lineHeight: '1.5' }
