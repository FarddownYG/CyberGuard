# CyberGuard

A comprehensive web-based cybersecurity toolkit featuring ethical hacking tools, security analyzers, and penetration testing utilities. Built with modern web technologies for fast, responsive performance.

**Original Design:** [Figma Design](https://www.figma.com/design/2GpdBbRBphCv3bFCjNHnbV/CyberGuard)

## 🚀 Features

### Security Analysis Tools
- **VirusTotal Integration** - Scan files and URLs for malware detection
- **SSL Checker** - Verify SSL certificate validity and security details
- **DNS Checker** - Perform DNS lookups and zone transfer checks
- **Email Checker** - Validate email addresses and check breach databases
- **File Analyzer** - Analyze files for metadata and potential threats

### Ethical Hacking Tools
- **JWT Decoder** - Decode and analyze JSON Web Tokens
- **Encoder/Decoder** - Encode/decode various formats (Base64, URL, Hex, etc.)
- **Hash Generator** - Generate hashes using multiple algorithms
- **Regex Tester** - Test and validate regular expressions
- **Headers Checker** - Analyze HTTP security headers
- **CSP Evaluator** - Evaluate Content Security Policy compliance
- **Subdomain Finder** - Discover subdomains of target domains
- **Whois Lookup** - Query domain registration information
- **Tech Detector** - Identify technologies used on websites
- **Port Scanner** - Scan open ports on target systems
- **Redirect Checker** - Follow and analyze URL redirects
- **Robots.txt Analyzer** - Parse and analyze robots.txt files
- **Clickjacking Tester** - Test for clickjacking vulnerabilities
- **Brute Force Tester** - Password brute force simulation
- **WiFi Brute Force** - WiFi password cracking simulation

### Utility Tools
- **Password Generator** - Create strong, customizable passwords
- **Shannon Entropy Calculator** - Calculate password strength
- **Status Page** - System and service status monitoring
- **Custom Tool Creator** - Build and share custom security tools
- **Blog** - Security articles and tutorials

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **npm** (v8 or higher)

## 🔧 Installation

1. **Clone the repository**
```bash
git clone https://github.com/FarddownYG/CyberGuard.git
cd CyberGuard
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🏗️ Build for Production

```bash
npm run build
```

The production-ready build will be created in the `dist/` directory.

## 📁 Project Structure

```
CyberGuard/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── hacking/           # Ethical hacking tools
│   │   │   ├── figma/             # Figma integration components
│   │   │   ├── ui/                # Reusable UI components
│   │   │   ├── HomePage.tsx       # Landing page
│   │   │   ├── PentestingPage.tsx # Penetration testing hub
│   │   │   ├── ToolsPage.tsx      # Utility tools hub
│   │   │   ├── BlogPage.tsx       # Security blog
│   │   │   ├── AboutPage.tsx      # Project information
│   │   │   ├── Navbar.tsx         # Navigation component
│   │   │   ├── Layout.tsx         # App layout wrapper
│   │   │   ├── Footer.tsx         # Footer component
│   │   │   └── [Tool Components]  # Individual tool implementations
│   │   ├── routes.ts              # React Router configuration
│   │   └── App.tsx                # App entry component
│   ├── styles/
│   │   └── index.css              # Global styles
│   ├── imports/                   # Shared utilities and helpers
│   └── main.tsx                   # React DOM render entry
├── index.html                     # HTML template
├── package.json                   # Dependencies and scripts
├── vite.config.ts                 # Vite configuration
├── tailwind.config.js             # Tailwind CSS configuration
├── postcss.config.mjs             # PostCSS configuration
├── guidelines/
│   └── Guidelines.md              # AI guidelines for tool creation
└── README.md                      # This file

```

## 🛠️ Technology Stack

### Frontend
- **React** (18.3.1) - UI library
- **React Router** (7.13.0) - Client-side routing
- **TypeScript** - Type safety
- **Vite** (6.3.5) - Fast build tool and dev server

### UI & Styling
- **Tailwind CSS** (4.1.12) - Utility-first CSS framework
- **Material-UI** (7.3.5) - Component library
- **Radix UI** - Headless UI components
- **Lucide React** - Icon library
- **Emotion** - CSS-in-JS styling

### Utilities
- **React Hook Form** (7.55.0) - Form management
- **Recharts** (2.15.2) - Data visualization
- **React DnD** (16.0.1) - Drag-and-drop functionality
- **JSZip** (3.10.1) - ZIP file handling
- **zxcvbn** (4.4.2) - Password strength estimation
- **date-fns** (3.6.0) - Date manipulation
- **Sonner** (2.0.3) - Toast notifications

### Development
- **PostCSS** (4.1.12) - CSS processing
- **Tailwind CSS Vite Plugin** - Vite integration

## 🔌 API Integration

The application integrates with external services:
- **VirusTotal API** - Malware and URL scanning
- **Unsplash API** - Stock images for blog and content

## 📖 Available Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | HomePage | Landing page with featured tools |
| `/hacking-ethique` | PentestingPage | Ethical hacking tools hub |
| `/tools` | ToolsPage | Utility tools directory |
| `/tools/password` | PasswordGenerator | Generate secure passwords |
| `/tools/file-analyzer` | FileAnalyzer | Analyze file metadata |
| `/tools/email-checker` | EmailChecker | Validate emails |
| `/tools/dns-checker` | DNSChecker | DNS lookups |
| `/hacking-ethique/jwt-decoder` | JwtDecoderPage | JWT analysis |
| `/hacking-ethique/encoder-decoder` | EncoderDecoderPage | Encoding utilities |
| `/hacking-ethique/hash-generator` | HashGeneratorPage | Hash generation |
| `/hacking-ethique/regex-tester` | RegexTesterPage | Regex testing |
| `/hacking-ethique/headers-checker` | HeadersCheckerPage | HTTP header analysis |
| `/hacking-ethique/csp-evaluator` | CspEvaluatorPage | CSP validation |
| `/hacking-ethique/subdomain-finder` | SubdomainFinderPage | Subdomain discovery |
| `/hacking-ethique/whois-lookup` | WhoisLookupPage | Domain WHOIS info |
| `/hacking-ethique/tech-detector` | TechDetectorPage | Technology detection |
| `/hacking-ethique/port-scanner` | PortScannerPage | Port scanning |
| `/hacking-ethique/redirect-checker` | RedirectCheckerPage | URL redirect analysis |
| `/hacking-ethique/brute-force` | BruteForcePage | Brute force simulation |
| `/hacking-ethique/wifi-bruteforce` | WifiBruteForcePage | WiFi cracking simulator |
| `/hacking-ethique/add-tool` | ToolCreatorPage | Create custom tools |
| `/hacking-ethique/custom/:slug` | DynamicToolPage | View custom tools |
| `/blog` | BlogPage | Security articles |
| `/about` | AboutPage | About the project |

## 🎨 UI Components

The project includes reusable UI components in `src/app/components/ui/`:
- Buttons, inputs, and form elements
- Cards, modals, and dialogs
- Navigation and layout components
- shadcn/ui components (based on Radix UI)

## 📚 Custom Tools

Users can create and share custom security tools through the tool creator interface. Custom tools are stored and accessible via `/hacking-ethique/custom/:slug`.

## ⚙️ Development Guidelines

See `guidelines/Guidelines.md` for AI-assisted development guidelines on:
- Code structure and organization
- Design system usage
- Component best practices
- Performance optimization

## 🔐 Security Features

- Rate limiting on API calls
- VirusTotal API quota management
- Client-side processing where possible
- Secure API communication
- Input validation and sanitization

## 📦 Rate Limiting

The application implements rate limiting for external APIs:
- **vt-rate-limiter.ts** - VirusTotal API rate limiting
- **rate-limiter.ts** - Generic rate limiting utility

## 🤝 Contributing

Contributions are welcome! Please ensure:
1. Code follows the project structure
2. Components use TypeScript
3. Styling uses Tailwind CSS
4. Tests pass before submitting PRs

## 📄 Attributions

This project includes:
- Components from [shadcn/ui](https://ui.shadcn.com/) ([MIT License](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md))
- Images from [Unsplash](https://unsplash.com) ([Unsplash License](https://unsplash.com/license))

See `ATTRIBUTIONS.md` for complete attribution details.

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub or contact the project maintainer.

## 📝 License

This project is available under the MIT License. See LICENSE file for details.

---

**Happy Hacking! 🛡️**