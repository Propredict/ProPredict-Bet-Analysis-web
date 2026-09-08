import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ProPredict'
const SUPPORT_INBOX = 'ilonacvitkopt@gmail.com'

interface ContactMessageProps {
  name?: string
  email?: string
  title?: string
  message?: string
}

const ContactMessageEmail = ({
  name,
  email,
  title,
  message,
}: ContactMessageProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New support message from {name || 'a user'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>{SITE_NAME}</Heading>
        </Section>

        <Section style={content}>
          <Heading style={h1}>New support message</Heading>

          <Text style={text}>
            <strong>Name:</strong> {name || '—'}
          </Text>
          <Text style={text}>
            <strong>Email:</strong> {email || '—'}
          </Text>
          <Text style={text}>
            <strong>Subject:</strong> {title || '—'}
          </Text>

          <Text style={textBold}>Message</Text>
          <Text style={quote}>{message || '—'}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactMessageEmail,
  subject: (data: Record<string, any>) =>
    `Support: ${(data?.title as string) || 'New message'}`,
  to: SUPPORT_INBOX,
  displayName: 'Contact form message',
  previewData: {
    name: 'Marko',
    email: 'marko@example.com',
    title: 'Subscription question',
    message: 'Hello, I have a question about Premium.',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: '0',
  padding: '0',
}

const container = { maxWidth: '560px', margin: '0 auto', padding: '0' }

const header = {
  padding: '24px 32px',
  borderBottom: '1px solid #e5e7eb',
  textAlign: 'center' as const,
}

const brand = {
  fontSize: '22px',
  fontWeight: '800',
  color: '#0f9b8e',
  margin: '0',
  letterSpacing: '-0.5px',
}

const content = { padding: '32px' }

const h1 = {
  fontSize: '22px',
  fontWeight: '700',
  color: '#0f172a',
  margin: '0 0 24px',
  lineHeight: '1.3',
}

const text = {
  fontSize: '15px',
  color: '#475569',
  lineHeight: '1.6',
  margin: '0 0 12px',
}

const textBold = {
  fontSize: '15px',
  color: '#0f172a',
  fontWeight: '600',
  margin: '20px 0 8px',
}

const quote = {
  fontSize: '15px',
  color: '#0f172a',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap' as const,
  backgroundColor: '#f8fafc',
  borderLeft: '3px solid #0f9b8e',
  padding: '12px 16px',
  margin: '0',
}
