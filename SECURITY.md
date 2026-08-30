# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in QuickGO, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

1. **Email**: Send details to the repository maintainer via the contact information in the repository profile.
2. **GitHub Private Vulnerability Reporting**: Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability) feature on this repository.

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (if available)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Resolution Target**: Based on severity
  - Critical: 24-48 hours
  - High: 7 days
  - Medium: 30 days
  - Low: Next release cycle

### Scope

This policy covers:
- QuickGO Backend API (NestJS)
- QuickGO Customer App (Flutter)
- QuickGO Partner App (Flutter)
- QuickGO Admin Panel (Next.js)
- Infrastructure configuration (Docker, deployment)

### Out of Scope

- Third-party services (Firebase, Razorpay, Cloudinary)
- Attacks requiring physical device access
- Social engineering attacks
- Denial of service attacks
