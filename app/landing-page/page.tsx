"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import './styles.css';
import TiltButton from "../components/TiltButton";
import LogoTiltButton from "../components/LogoTiltButton";

export default function LandingPage() {
  useEffect(() => {
    // Add basic functionality to navigate between input fields for passcode
    const passcodeInputs = document.querySelectorAll('.passcode-input');

    passcodeInputs.forEach((input: any, index) => {
      input.addEventListener('keyup', (e: any) => {
        if (e.key >= '0' && e.key <= '9') {
          input.value = e.key;
          if (index < passcodeInputs.length - 1) {
            (passcodeInputs[index + 1] as HTMLElement).focus();
          }
        } else if (e.key === 'Backspace') {
          input.value = '';
          if (index > 0) {
            (passcodeInputs[index - 1] as HTMLElement).focus();
          }
        }
      });

      input.addEventListener('click', () => {
        input.select();
      });
    });

    // Animation effects
    document.addEventListener('mousemove', (e) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;

      // Subtle movement for the light effect
      const lightEffect = document.querySelector('.light-effect');
      if (lightEffect) {
        (lightEffect as HTMLElement).style.transform = `translate(calc(-50% + ${(x - 0.5) * 30}px), calc(-50% + ${(y - 0.5) * 30}px))`;
      }
    });
  }, []);

  return (
    <div className="landing-page-wrapper">
      <div className="grid-bg"></div>
      <div className="light-effect"></div>
      
      <header className="header">
        <div className="logo">Patecan Software</div>
        <button className="github-btn">Login</button>
      </header>
      
      <div className="container">

      <div className="intro">
        <span>INTRODUCING</span>
        <h1>GG Interview</h1>
        <p>The world&apos;s first AI reactive interviewer</p>
      </div>

        <LogoTiltButton/>
      </div>
      
      <Link href="/main" className="continue-btn app-link">
        Go to App
      </Link>
    </div>
  );
}
