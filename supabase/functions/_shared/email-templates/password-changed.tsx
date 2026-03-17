/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface PasswordChangedEmailProps {
  siteName: string
  email: string
}

export const PasswordChangedEmail = ({
  siteName,
  email,
}: PasswordChangedEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your password has been changed for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your password has been changed</Heading>
        <Text style={text}>
          This is a confirmation that the password for your {siteName} account{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          has just been changed.
        </Text>
        <Text style={text}>
          If you did not make this change, please contact support immediately.
        </Text>
        <Text style={footer}>
          This is an automated message from {siteName}. Please do not reply to this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default PasswordChangedEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0d1a15', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 25px' }
const link = { color: 'inherit', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
