/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your ProPredict login link</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⚡ Your Login Link</Heading>
        <Text style={text}>
          Click the button below to log in to ProPredict. This link will expire shortly.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Log In to ProPredict
        </Button>
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#0d1a15', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '480px', margin: '0 auto' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0fba81',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#7a9388',
  lineHeight: '1.6',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#0fba81',
  color: '#ffffff',
  fontSize: '15px',
  borderRadius: '10px',
  padding: '14px 24px',
  textDecoration: 'none',
  fontWeight: 'bold' as const,
}
const footer = { fontSize: '12px', color: '#4a6358', margin: '30px 0 0' }
