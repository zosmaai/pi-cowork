# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Zosma Cowork, please report it responsibly.

**Please do NOT open a public GitHub issue for security bugs.**

Instead, email us at [security@zosma.ai](mailto:security@zosma.ai) with:

- A description of the vulnerability
- Steps to reproduce (if applicable)
- Potential impact
- Any suggested fixes (optional)

We will respond within 48 hours and work with you to coordinate a fix and disclosure timeline.

## Security Scanning

Our CI runs automated security scans on every push:

- **npm audit** — checks Node dependencies for known vulnerabilities
- **cargo audit** — checks Rust dependencies for known vulnerabilities
- **CodeQL** — static analysis for TypeScript and Rust

You can view the latest scan results in the [Security tab](https://github.com/zosmaai/zosma-cowork/security).
