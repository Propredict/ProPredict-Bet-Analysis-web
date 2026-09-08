import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
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
const SITE_URL = 'https://propredict.me'

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => {
  const greeting = name ? `Hi ${name},` : 'Hi,'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Welcome to {SITE_NAME} ⚽</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={brand}>{SITE_NAME}</Heading>
          </Section>

          <Section style={content}>
            <Heading style={h1}>Welcome to {SITE_NAME} ⚽</Heading>

            <Text style={text}>{greeting}</Text>

            <Text style={text}>
              Your account is ready. You now have access to daily AI football
              analysis, live scores, league statistics and free daily picks.
            </Text>

            <Text style={textBold}>
              Dobrodošli! Vaš nalog je aktivan — svakog dana vas čekaju nove AI
              analize i besplatni tipovi.
            </Text>

            <Section style={buttonContainer}>
              <Button href={SITE_URL} style={button}>
                Open {SITE_NAME}
              </Button>
            </Section>

            <Text style={text}>
              Good luck and enjoy the analysis. For entertainment purposes only
              (18+).
            </Text>

            <Text style={signature}>— The {SITE_NAME} Team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WelcomeEmail,
  subject: 'Welcome to ProPredict ⚽',
  displayName: 'Welcome email',
  previewData: { name: 'Marko' },
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
  fontSize: '24px',
  fontWeight: '700',
  color: '#0f172a',
  margin: '0 0 24px',
  lineHeight: '1.3',
}

const text = {
  fontSize: '15px',
  color: '#475569',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const textBold = {
  fontSize: '15px',
  color: '#0f172a',
  fontWeight: '600',
  lineHeight: '1.6',
  margin: '20px 0',
}

const buttonContainer = { textAlign: 'center' as const, margin: '28px 0' }

const button = {
  backgroundColor: '#0f9b8e',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '700',
  textDecoration: 'none',
  padding: '14px 32px',
  borderRadius: '10px',
  display: 'inline-block',
}

const signature = {
  fontSize: '15px',
  color: '#0f172a',
  fontWeight: '600',
  margin: '24px 0 0',
}
