import React from 'react';
import { StyleSheet, ScrollView, Platform } from 'react-native';
import Head from 'expo-router/head';

import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { ProblemSection } from '../components/ProblemSection';
import { ArchitectureSection } from '../components/ArchitectureSection';
import { FeaturesGrid } from '../components/FeaturesGrid';
import { EcosystemSection } from '../components/EcosystemSection';
import { CodeSection } from '../components/CodeSection';
import { MetricsBar } from '../components/MetricsBar';
import { CTASection } from '../components/CTASection';
import { Footer } from '../components/Footer';

export default function HomeScreen() {
  return (
    <>
      <Head>
        <title>Open-Dome — The Infrastructure Layer for the Agentic Era</title>
        <meta name="description" content="Open-Dome is the plug-and-play, enterprise-grade infrastructure suite for building secure Agent-to-App bridges. Zero-trust security, multi-chain Web3, real-time events, and location privacy — through a single SDK." />
        <meta name="keywords" content="Open-Dome, Agentic, AI Agents, Mini-App, SDK, Web3, MQTT, Zero-Trust, Blockchain, EVMs, Solana, Starknet, Infrastructure, Effisend" />
        <meta property="og:title" content="Open-Dome — The Infrastructure Layer for the Agentic Era" />
        <meta property="og:description" content="Build, test, and deploy secure modular apps for Agentic workflows. Zero-trust security, multi-chain Web3, real-time events — through a single SDK." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Open-Dome — Agentic Infrastructure" />
        <meta name="twitter:description" content="Enterprise-grade infrastructure suite for building secure Agent-to-App integrations." />
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Open-Dome",
              "applicationCategory": "DeveloperApplication",
              "description": "The plug-and-play infrastructure suite for building secure Agent-to-App integrations.",
              "operatingSystem": "Web, iOS, Android",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "creator": {
                "@type": "Organization",
                "name": "Effisend Labs"
              },
              "inLanguage": "en",
              "license": "https://opensource.org/licenses/MIT"
            }
          `}
        </script>
      </Head>

      <Navbar />

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
      >
        <main style={Platform.OS === 'web' ? { width: '100%', flex: 1, display: 'flex', flexDirection: 'column' } : undefined}>
          <Hero />
          <ProblemSection />
          <ArchitectureSection />
          <FeaturesGrid />
          <EcosystemSection />
          <CodeSection />
          <MetricsBar />
          <CTASection />
        </main>
        <Footer />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F8',
  },
  contentContainer: {
    flexGrow: 1,
  },
});
