import React from 'react';
import { Box } from '@mui/material';

// Landing components and sections
import LandingNavbar from './components/LandingNavbar';
import Hero from './sections/Hero';
import Features from './sections/Features';
import About from './sections/About';
import Contact from './sections/Contact';
import CallToAction from './sections/CallToAction';

// ==============================|| LANDING PAGE ||============================== //

const LandingPage = () => {
  return (
    <Box sx={{ minHeight: '100vh' }}>
      <LandingNavbar />
      <Hero />
      <Features />
      <About />
      <Contact />
      <CallToAction />
    </Box>
  );
};

export default LandingPage;