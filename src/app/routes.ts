import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { HomePage } from "./components/HomePage";
import { PentestingPage } from "./components/PentestingPage";
import { VirusTotalPage } from "./components/VirusTotalPage";
import { SSLCheckerPage } from "./components/SSLCheckerPage";
import { BlogPage } from "./components/BlogPage";
import { AboutPage } from "./components/AboutPage";
import { ToolsPage } from "./components/ToolsPage";
import { PasswordGenerator } from "./components/PasswordGenerator";
import { FileAnalyzer } from "./components/FileAnalyzer";
import { EmailChecker } from "./components/EmailChecker";
import { DNSChecker } from "./components/DNSChecker";
import { StatusPage } from "./components/StatusPage";
import { ShannonPage } from "./components/ShannonPage";
import { HeadersCheckerPage } from "./components/hacking/HeadersCheckerPage";
import { JwtDecoderPage } from "./components/hacking/JwtDecoderPage";
import { EncoderDecoderPage } from "./components/hacking/EncoderDecoderPage";
import { HashGeneratorPage } from "./components/hacking/HashGeneratorPage";
import { RegexTesterPage } from "./components/hacking/RegexTesterPage";
import { CspEvaluatorPage } from "./components/hacking/CspEvaluatorPage";
import { SubdomainFinderPage } from "./components/hacking/SubdomainFinderPage";
import { ClickjackingTesterPage } from "./components/hacking/ClickjackingTesterPage";
import { RobotsAnalyzerPage } from "./components/hacking/RobotsAnalyzerPage";
import { WhoisLookupPage } from "./components/hacking/WhoisLookupPage";
import { TechDetectorPage } from "./components/hacking/TechDetectorPage";
import { PortScannerPage } from "./components/hacking/PortScannerPage";
import { RedirectCheckerPage } from "./components/hacking/RedirectCheckerPage";
import { BruteForcePage } from "./components/hacking/BruteForcePage";
import { DeductOScopePage } from "./components/hacking/DeductOScopePage";
import { FailleFinderPage } from "./components/hacking/FailleFinderPage";
import { WifiBruteForcePage } from "./components/hacking/WifiBruteForcePage";
import { ToolCreatorPage } from "./components/hacking/ToolCreatorPage";
import { DynamicToolPage } from "./components/hacking/DynamicToolPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "hacking-ethique", Component: PentestingPage },
      { path: "virustotal", Component: VirusTotalPage },
      { path: "ssl-checker", Component: SSLCheckerPage },
      { path: "blog", Component: BlogPage },
      { path: "about", Component: AboutPage },
      { path: "tools", Component: ToolsPage },
      { path: "tools/password", Component: PasswordGenerator },
      { path: "tools/file-analyzer", Component: FileAnalyzer },
      { path: "tools/email-checker", Component: EmailChecker },
      { path: "tools/dns-checker", Component: DNSChecker },
      { path: "status", Component: StatusPage },
      { path: "shannon", Component: ShannonPage },
      // Hacking ethique tools
      { path: "hacking-ethique/headers-checker", Component: HeadersCheckerPage },
      { path: "hacking-ethique/jwt-decoder", Component: JwtDecoderPage },
      { path: "hacking-ethique/encoder-decoder", Component: EncoderDecoderPage },
      { path: "hacking-ethique/hash-generator", Component: HashGeneratorPage },
      { path: "hacking-ethique/regex-tester", Component: RegexTesterPage },
      { path: "hacking-ethique/csp-evaluator", Component: CspEvaluatorPage },
      { path: "hacking-ethique/subdomain-finder", Component: SubdomainFinderPage },
      { path: "hacking-ethique/clickjacking-tester", Component: ClickjackingTesterPage },
      { path: "hacking-ethique/robots-analyzer", Component: RobotsAnalyzerPage },
      { path: "hacking-ethique/whois-lookup", Component: WhoisLookupPage },
      { path: "hacking-ethique/tech-detector", Component: TechDetectorPage },
      { path: "hacking-ethique/port-scanner", Component: PortScannerPage },
      { path: "hacking-ethique/redirect-checker", Component: RedirectCheckerPage },
      { path: "hacking-ethique/brute-force", Component: BruteForcePage },
      { path: "hacking-ethique/deductoscope", Component: DeductOScopePage },
      { path: "hacking-ethique/faille-finder", Component: FailleFinderPage },
      { path: "hacking-ethique/wifi-bruteforce", Component: WifiBruteForcePage },
      { path: "hacking-ethique/add-tool", Component: ToolCreatorPage },
      { path: "hacking-ethique/custom/:slug", Component: DynamicToolPage },
      { path: "*", Component: HomePage },
    ],
  },
]);