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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email to activate your ProPredict account</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>ProPredict</Heading>
        <Heading style={h1}>Welcome — confirm your email</Heading>
        <Text style={text}>
          Thanks for joining <Link href={siteUrl} style={link}><strong>ProPredict</strong></Link>.
          Confirm <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link> to unlock AI predictions, live scores and daily picks.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm my email
        </Button>
        <Text style={footer}>
          If you didn't sign up for ProPredict, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const brand = { fontSize: '18px', fontWeight: 'bold' as const, color: '#0F9B8E', letterSpacing: '0.5px', margin: '0 0 24px', textTransform: 'uppercase' as const }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0d1a15', margin: '0 0 16px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: '#0F9B8E', textDecoration: 'underline' }
const button = { backgroundColor: '#0F9B8E', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '32px 0 0', lineHeight: '1.5' }
